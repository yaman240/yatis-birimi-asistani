import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { calculateGuestPhysician } from "../guest-physician/calculation-engine.js";
import { CaseWorkflow } from "../guest-physician/case-workflow.js";
import { createLocalRepositoryRuntime } from "../guest-physician/repository-runtime.js";
import { createWorkspaceNavigator, WORKSPACE_VIEW } from "../main-navigation.js";

const read = relative => readFile(new URL(`../${relative}`, import.meta.url), "utf8");
const sha256 = value => createHash("sha256").update(value, "utf8").digest("hex").toUpperCase();

const APPROVED_SOURCE_HASHES = Object.freeze({
  seedLine: "D40DCAD937DFEDEE3758FD8101A55CC324930DE459E577C8FA887BAEF66E1BC9",
  firebase: "1BD9D53945DD4210EA0154334B5FAAA10DF3ED94234951FE40325295A9452F70"
});

class FakeClassList {
  constructor(...names) { this.names = new Set(names); }
  toggle(name, force) { force ? this.names.add(name) : this.names.delete(name); }
  contains(name) { return this.names.has(name); }
}

const fakeButton = view => ({
  dataset: { workspaceView: view },
  classList: new FakeClassList(),
  attributes: new Map(),
  addEventListener(_name, listener) { this.click = listener; },
  setAttribute(name, value) { this.attributes.set(name, value); },
  removeAttribute(name) { this.attributes.delete(name); }
});

test("ana menü Misafir Hekim seçeneğini ve aynı sayfa modül alanını içerir", async () => {
  const html = await read("index.html");
  assert.match(html, /id="guestPhysicianMenuButton"/);
  assert.match(html, />Misafir Hekim</);
  assert.match(html, /id="guestPhysicianWorkspace"/);
  assert.match(html, /src="\.\/guest-physician\/index\.html\?embedded=1"/);
  assert.doesNotMatch(html, /target="_blank"/);
});

test("menü modülü açar ve fiyat listesine geri döner", () => {
  const pricesWorkspace = { classList: new FakeClassList() };
  const guestWorkspace = { classList: new FakeClassList("hidden") };
  const priceButton = fakeButton(WORKSPACE_VIEW.PRICES);
  const guestButton = fakeButton(WORKSPACE_VIEW.GUEST_PHYSICIAN);
  const navigator = createWorkspaceNavigator({
    pricesWorkspace,
    guestWorkspace,
    navigationButtons: [priceButton, guestButton]
  });
  guestButton.click();
  assert.equal(navigator.getCurrentView(), WORKSPACE_VIEW.GUEST_PHYSICIAN);
  assert.equal(pricesWorkspace.classList.contains("hidden"), true);
  assert.equal(guestWorkspace.classList.contains("hidden"), false);
  navigator.show(WORKSPACE_VIEW.PRICES);
  assert.equal(pricesWorkspace.classList.contains("hidden"), false);
  assert.equal(guestWorkspace.classList.contains("hidden"), true);
});

test("entegre ekrandaki üç kategori mevcut hesaplama motorunu kullanır", () => {
  assert.equal(calculateGuestPhysician({
    category: "surgery", anesthesiaStart: "09:00", anesthesiaEnd: "09:45",
    accommodation: "none", outsideWorkingHours: false, sgk: false
  }).amounts.grossTotalKurus, 3500000);
  assert.equal(calculateGuestPhysician({
    category: "dentalEnt", anesthesiaStart: "09:00", anesthesiaEnd: "10:30",
    accommodation: "none", outsideWorkingHours: false, sgk: false
  }).amounts.grossTotalKurus, 2500000);
  assert.equal(calculateGuestPhysician({
    category: "obstetrics", procedureCode: "cesarean", accommodation: "none",
    outsideWorkingHours: false, sgk: false
  }).amounts.grossTotalKurus, 3400000);
});

test("entegre modül Local/Mock üzerinde taslak, kesinleştirme ve iptal akışını korur", async () => {
  const runtime = await createLocalRepositoryRuntime();
  const workflow = new CaseWorkflow(runtime);
  const tariff = await workflow.initialize();
  const calculation = calculateGuestPhysician({
    category: "surgery", anesthesiaStart: "09:00", anesthesiaEnd: "10:00",
    accommodation: "none", outsideWorkingHours: false, sgk: false
  }, tariff);
  const input = {
    caseNumber: "TEST-INTEGRATION-1", tariff: calculation.tariff, category: "surgery",
    procedureCode: null, patient: { name: "TEST-Hasta", protocolNumber: "TEST-1" },
    physician: { name: "TEST-Hekim" }, timing: { ...calculation.timing, procedureDate: "2026-08-11" },
    accommodation: { type: "none" }, options: { outsideWorkingHours: false, sgk: false },
    lineItems: [], totals: {
      mainServiceKurus: 3500000, accommodationKurus: 0,
      outsideWorkingHoursSurchargeKurus: 0, extraItemsTotalKurus: 0,
      hospitalTotalKurus: 3500000, patientCollectedKurus: null, remainingKurus: null,
      doctorCommissionKurus: null, doctorNetPaymentKurus: null
    }, tariffSnapshot: tariff, calculation: { engineVersion: calculation.engineVersion, roundingMode: "half_up_to_kurus" },
    calculationSnapshot: { calculation }, notes: ""
  };
  assert.equal((await workflow.saveDraft(input)).status, "draft");
  assert.equal((await workflow.finalize()).status, "finalized");
  assert.equal((await workflow.cancel("TEST-iptal")).status, "cancelled");
});

test("ana surgeryPrices ve Firebase kaynakları onaylı SHA-256 değerlerini korur", async () => {
  const [app, firebase, html] = await Promise.all([read("app.js"), read("firebase.js"), read("index.html")]);
  const seedLine = app.split(/\r?\n/).find(line => line.startsWith("const SEED = "));
  assert.equal(sha256(seedLine), APPROVED_SOURCE_HASHES.seedLine);
  assert.equal(sha256(firebase), APPROVED_SOURCE_HASHES.firebase);
  assert.match(app, /const COLLECTION_NAME = "surgeryPrices"/);
  assert.match(app, /from "\.\/access-control\.js\?v=11"/);
  assert.match(app, /from "\.\/user-profile-repository\.js\?v=11"/);
  assert.doesNotMatch(app, /syncBranchSeed|async function migrate|getInitialData\(\)/);

  const authBlock = app.slice(app.indexOf("onAuthStateChanged("), app.indexOf("function normalise"));
  const snapshotBlock = app.slice(app.indexOf("onSnapshot("), app.indexOf("function openNewRecordPanel"));
  assert.doesNotMatch(authBlock, /setDoc\s*\(|writeBatch\s*\(|migrate\s*\(/);
  assert.doesNotMatch(snapshotBlock, /setDoc\s*\(|writeBatch\s*\(|batch\.set\s*\(|\.commit\s*\(/);

  assert.match(html, /id="guestPhysicianMenuButton"/);
  assert.match(html, /id="guestPhysicianWorkspace"/);
  assert.match(html, /src="\.\/main-navigation\.js\?v=11"/);
});

test("entegre Misafir Hekim UI production bağlantısını açmaz", async () => {
  const [mainHtml, guestApp, guestCss] = await Promise.all([
    read("index.html"), read("guest-physician/guest-physician-app.js"), read("guest-physician/guest-physician.css")
  ]);
  assert.match(mainHtml, /index\.html\?embedded=1/);
  assert.match(guestApp, /embeddedMode/);
  assert.match(guestApp, /yalnız Local \/ Mock ortamı kullanılabilir/);
  assert.match(guestCss, /body\.embedded-mode \.environment-panel/);
  assert.doesNotMatch(guestApp, /from\s+["']\.\/firebase\.js/);
});
