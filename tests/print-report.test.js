import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { calculateGuestPhysician } from "../guest-physician/calculation-engine.js";
import { calculateFinancialSummary, COMMISSION_METHOD } from "../guest-physician/financial-summary.js";
import {
  buildPrintFileName,
  buildPrintReportModel,
  renderPrintReportHtml,
  safeFilePart
} from "../guest-physician/print-report.js";

const read = relative => readFile(new URL(`../${relative}`, import.meta.url), "utf8");

const makeReport = ({ category = "surgery", procedureCode = null, collected = 7000000 } = {}) => {
  const calculation = calculateGuestPhysician(category === "obstetrics" ? {
    category, procedureCode: procedureCode || "cesarean", accommodation: "none",
    outsideWorkingHours: true, sgk: false
  } : {
    category, anesthesiaStart: "09:00", anesthesiaEnd: "10:35",
    accommodation: "private_room_one_day", outsideWorkingHours: true, sgk: false
  });
  const financialSummary = calculateFinancialSummary({
    calculation,
    extraItems: [{ type: "laboratory", description: "Kan paneli", quantity: 2, unitPriceKurus: 12500 }],
    patientCollectedKurus: collected,
    commission: { method: COMMISSION_METHOD.REMAINING_PERCENTAGE, percentageBasisPoints: 1000 }
  });
  return buildPrintReportModel({
    formData: {
      procedureDate: "2026-08-11", patientName: "Test Hasta", protocolNumber: "P/2026 42",
      physicianName: "Dr. Test", notes: "Kontrol notu"
    },
    calculation,
    financialSummary
  });
};

test("PDF dosya adı protokol ve tarih için güvenli biçimde oluşturulur", () => {
  assert.equal(safeFilePart("P/2026 42"), "P_2026_42");
  assert.equal(buildPrintFileName("P/2026 42", "2026-08-11"), "Misafir_Hekim_P_2026_42_2026-08-11.pdf");
  assert.equal(buildPrintFileName("", ""), "Misafir_Hekim_Protokolsuz_Tarihsiz.pdf");
});

test("süreli vaka raporu kullanıcı bilgileri ve hesap dökümünü taşır", () => {
  const report = makeReport();
  assert.ok(report.information.some(([label, value]) => label === "Toplam ameliyathane süresi" && value === "95 dakika"));
  assert.ok(report.information.some(([label, value]) => label === "Anestezi başlangıç / bitiş" && value === "09:00 / 10:35"));
  assert.ok(report.charges.some(([label]) => label === "Fazla süre bedeli"));
  assert.equal(report.extraItems[0].description, "Kan paneli");
  assert.equal(report.notes, "Kontrol notu");
});

test("Kadın Doğum raporunda işlem türü bulunur, saat ve oda bulunmaz", () => {
  const report = makeReport({ category: "obstetrics", procedureCode: "cesarean", collected: 5000000 });
  const labels = report.information.map(([label]) => label);
  assert.ok(labels.includes("İşlem türü"));
  assert.ok(!labels.includes("Anestezi başlangıç / bitiş"));
  assert.ok(!labels.includes("Toplam ameliyathane süresi"));
  assert.ok(!labels.includes("Oda seçimi"));
});

test("yazdırma HTML'i teknik ve geliştirici bilgilerini içermez", () => {
  const html = renderPrintReportHtml(makeReport());
  for (const forbidden of ["Local / Mock", "Firebase", "Emulator", "staging", "repository", "engineVersion", "tariffId"]) {
    assert.doesNotMatch(html, new RegExp(forbidden, "i"));
  }
  assert.match(html, /MİSAFİR HEKİM HESAP ÖZETİ/);
  assert.match(html, /Doktora Ödenecek Net Tutar/);
});

test("rapor kullanıcı metinlerini HTML enjeksiyonuna karşı kaçışlar", () => {
  const report = makeReport();
  report.notes = "<script>alert('x')</script>";
  const html = renderPrintReportHtml(report);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});

test("negatif mali durum raporda kritik sınıfla gösterilir", () => {
  const report = makeReport({ collected: 1 });
  assert.equal(report.negativeRemaining, true);
  assert.match(renderPrintReportHtml(report), /print-net-card critical/);
});

test("PDF butonu başlangıçta pasiftir ve A4 yazdırma görünümü bulunur", async () => {
  const [html, css] = await Promise.all([
    read("guest-physician/index.html"), read("guest-physician/guest-physician.css")
  ]);
  assert.match(html, /id="printReportButton"[\s\S]*disabled>PDF \/ Yazdır/);
  assert.match(html, /id="printReport" class="print-report"/);
  assert.match(css, /@page \{ size: A4; margin: 9mm; \}/);
  assert.match(css, /@media print[\s\S]*body > main \{ display:none !important; \}/);
});

test("form değişince PDF pasifleşir, yeni sonuçta yeniden etkinleşir", async () => {
  const source = await read("guest-physician/guest-physician-app.js");
  assert.match(source, /const hideResult = \(\) => \{[\s\S]*printReportButton\.disabled = true/);
  assert.match(source, /const renderResult = \(result, summary\) => \{[\s\S]*printReportButton\.disabled = false/);
  assert.match(source, /window\.print\(\)/);
});

test("örnek hastane toplamı ve doktor net tutarı yazdırma kartlarında açıkça yer alır", () => {
  const calculation = calculateGuestPhysician({
    category: "surgery", anesthesiaStart: "09:00", anesthesiaEnd: "10:35",
    accommodation: "none", outsideWorkingHours: false, sgk: false
  });
  const financialSummary = calculateFinancialSummary({
    calculation,
    patientCollectedKurus: 9420000,
    commission: { method: COMMISSION_METHOD.NONE }
  });
  const report = buildPrintReportModel({
    formData: { procedureDate: "2026-08-11", patientName: "", protocolNumber: "", physicianName: "", notes: "" },
    calculation,
    financialSummary
  });
  const html = renderPrintReportHtml(report);
  assert.match(html, /<div class="print-total-card">[\s\S]*Hastane Toplam Bedeli[\s\S]*<strong class="financial-card-amount">₺42\.000,00<\/strong>/);
  assert.match(html, /<div class="print-net-card">[\s\S]*Doktora Ödenecek Net Tutar[\s\S]*<strong class="financial-card-amount">₺52\.200,00<\/strong>/);
});
