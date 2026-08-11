import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { calculateGuestPhysician } from "../guest-physician/calculation-engine.js";

const read = relative => readFile(new URL(`../${relative}`, import.meta.url), "utf8");

test("form içinde ikinci kategori seçimi bulunmaz", async () => {
  const html = await read("guest-physician/index.html");
  const form = html.match(/<form id="calculationForm"[\s\S]*?<\/form>/)?.[0] || "";
  assert.doesNotMatch(form, /<select id="category"/);
  assert.match(form, /<input id="category" name="category" type="hidden" value="surgery">/);
});

test("üst kategori kartları tek seçim kaynağı olarak form durumunu günceller", async () => {
  const [html, source] = await Promise.all([
    read("guest-physician/index.html"),
    read("guest-physician/guest-physician-app.js")
  ]);
  assert.equal((html.match(/data-category-choice=/g) || []).length, 3);
  assert.match(source, /categoryElement\.value = button\.dataset\.categoryChoice/);
  assert.match(source, /updateCategoryFields\(\)/);
  assert.match(source, /aria-pressed/);
});

test("embedded görünüm teknik ortam ve prototip metinlerini gizler", async () => {
  const [css, source] = await Promise.all([
    read("guest-physician/guest-physician.css"),
    read("guest-physician/guest-physician-app.js")
  ]);
  for (const selector of [".environment-panel", ".connection-badge", ".case-mode-label", ".local-mode-note", ".privacy-note"]) {
    assert.match(css, new RegExp(`body\\.embedded-mode[\\s\\S]{0,300}${selector.replace(".", "\\.")}`));
  }
  assert.match(source, /embeddedMode[\s\S]*environmentModeElement\.value = "local"/);
});

test("kritik kategori hesapları sadeleştirme sonrasında değişmez", () => {
  const surgery = calculateGuestPhysician({
    category: "surgery", anesthesiaStart: "09:00", anesthesiaEnd: "10:35",
    accommodation: "none", outsideWorkingHours: false, sgk: false
  });
  const dental = calculateGuestPhysician({
    category: "dentalEnt", anesthesiaStart: "09:00", anesthesiaEnd: "10:30",
    accommodation: "none", outsideWorkingHours: false, sgk: false
  });
  const obstetrics = calculateGuestPhysician({
    category: "obstetrics", procedureCode: "cesarean", accommodation: "none",
    outsideWorkingHours: false, sgk: false
  });
  assert.equal(surgery.amounts.grossTotalKurus, 4200000);
  assert.equal(dental.amounts.grossTotalKurus, 2500000);
  assert.equal(obstetrics.amounts.grossTotalKurus, 3400000);
});

test("sonuç ekranında Tarife toplamı tekrarı yoktur ve tek belirgin hastane sonucu vardır", async () => {
  const html = await read("guest-physician/index.html");
  assert.doesNotMatch(html, /<dt>Tarife toplamı<\/dt>/);
  assert.equal((html.match(/id="resultHospitalTotal"/g) || []).length, 1);
  assert.match(html, /<h3>Mali Dağılım<\/h3>/);
  assert.match(html, /id="summaryDoctorNet"/);
});

test("mobil kategori, form kontrolleri ve kompakt ek kalem düzeni korunur", async () => {
  const css = await read("guest-physician/guest-physician.css");
  assert.match(css, /@media \(max-width: 620px\)/);
  assert.match(css, /\.category-options \{ grid-template-columns: 1fr; \}/);
  assert.match(css, /\.case-actions > button \{ width: 100%; min-height: 48px; \}/);
  assert.match(css, /\.extra-item \{[\s\S]*grid-template-columns: 1fr 1fr;/);
  assert.match(css, /\.extra-items:empty[\s\S]*display: none/);
});

test("Diş sarf uyarısı yalnız Diş-KBB kategorisine bağlanmıştır", async () => {
  const [html, source] = await Promise.all([
    read("guest-physician/index.html"),
    read("guest-physician/guest-physician-app.js")
  ]);
  assert.match(html, /data-category-warning="dentalEnt" hidden>Diş operasyonlarında ekstra sarflar dahil değildir/);
  assert.match(source, /warning\.dataset\.categoryWarning !== categoryElement\.value/);
});

test("premium renk sistemi antrasit, mat altın, gümüş ve kırık beyaz değişkenlerini içerir", async () => {
  const css = await read("guest-physician/guest-physician.css");
  assert.match(css, /--navy: #242528/);
  assert.match(css, /--gold: #a78f67/);
  assert.match(css, /--silver: #c9c9c6/);
  assert.match(css, /--background: #f1f0ed/);
});

test("seçili kategori koyu yüzey ve mat altın vurgu kullanır", async () => {
  const css = await read("guest-physician/guest-physician.css");
  assert.match(css, /\.category-option\.active[\s\S]*background: #2a2b2e/);
  assert.match(css, /\.category-option\.active[\s\S]*inset 4px 0 0 var\(--gold\)/);
  assert.match(css, /\.category-option:hover,\.category-option:focus-visible[\s\S]*border-color: var\(--gold\)/);
});

test("hata, iptal ve negatif finans durumları kontrollü kırmızı sınıflara sahiptir", async () => {
  const css = await read("guest-physician/guest-physician.css");
  assert.match(css, /--danger: #a43a3a/);
  assert.match(css, /\.status-cancelled[\s\S]*#922f2f/);
  assert.match(css, /\.doctor-net-card\.negative[\s\S]*background: #722e2e/);
  assert.match(css, /\[aria-invalid="true"\][\s\S]*var\(--danger\)/);
});

test("hastane toplamı ve doktor net ödeme premium finans kartları DOM'da bulunur", async () => {
  const html = await read("guest-physician/index.html");
  assert.match(html, /finance-result-card hospital-total-card/);
  assert.match(html, /finance-result-card doctor-net-card/);
  assert.match(html, /id="resultHospitalTotal"/);
  assert.match(html, /id="summaryDoctorNet"/);
});

test("premium mobil görünüm tam genişlik finans kartları ve dokunma hedeflerini korur", async () => {
  const css = await read("guest-physician/guest-physician.css");
  assert.match(css, /@media \(max-width: 620px\)[\s\S]*\.hospital-total-card,\.doctor-net-card \{ width:100%/);
  assert.match(css, /@media \(max-width: 620px\)[\s\S]*\.remove-extra-button[\s\S]*min-height: 48px/);
  assert.match(css, /\.page-shell[\s\S]*width: min\(820px, calc\(100% - 32px\)\)/);
});

test("koyu finans kartlarında ekran ve PDF tutarları yüksek kontrastlıdır", async () => {
  const [html, css, printSource] = await Promise.all([
    read("guest-physician/index.html"),
    read("guest-physician/guest-physician.css"),
    read("guest-physician/print-report.js")
  ]);
  assert.match(css, /\.finance-result-card dt \{ color:#fff !important/);
  assert.match(html, /id="resultHospitalTotal" class="financial-card-amount"/);
  assert.match(html, /id="summaryDoctorNet" class="financial-card-amount"/);
  assert.match(printSource, /strong class="financial-card-amount"/);
  assert.match(css, /\.finance-result-card dd\.financial-card-amount[\s\S]*color: #e6d6b8 !important[\s\S]*opacity: 1 !important[\s\S]*visibility: visible !important[\s\S]*-webkit-text-fill-color: #e6d6b8 !important/);
  assert.match(css, /\.doctor-net-card\.negative dd\.financial-card-amount[\s\S]*-webkit-text-fill-color: #f3bcbc !important/);
  assert.match(css, /\.print-total-card strong\.financial-card-amount,[\s\S]*\.print-net-card strong\.financial-card-amount[\s\S]*color: #e6d6b8 !important[\s\S]*opacity: 1 !important[\s\S]*visibility: visible !important/);
  assert.match(css, /\.print-total-card,\.print-net-card[\s\S]*-webkit-print-color-adjust:exact; print-color-adjust:exact/);
  assert.match(css, /\.print-net-card strong\.financial-card-amount-critical[\s\S]*-webkit-text-fill-color: #f3bcbc !important/);
});
