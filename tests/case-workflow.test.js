import assert from "node:assert/strict";
import test from "node:test";
import { calculateGuestPhysician, TARIFF_2026_V1 } from "../guest-physician/calculation-engine.js";
import { buildCaseSnapshot } from "../guest-physician/case-snapshot.js";
import { CaseWorkflow } from "../guest-physician/case-workflow.js";
import { calculateFinancialSummary, COMMISSION_METHOD } from "../guest-physician/financial-summary.js";
import { createLocalRepositoryRuntime } from "../guest-physician/repository-runtime.js";

const makeSnapshot = (overrides = {}) => {
  const calculation = calculateGuestPhysician({
    category: "surgery",
    anesthesiaStart: "09:00",
    anesthesiaEnd: "10:35",
    accommodation: "private_room_one_day",
    outsideWorkingHours: true,
    sgk: false
  });
  const financialSummary = calculateFinancialSummary({
    calculation,
    extraItems: [{ type: "laboratory", description: "Panel", quantity: 2, unitPriceKurus: 12500 }],
    patientCollectedKurus: 8000000,
    commission: { method: COMMISSION_METHOD.REMAINING_PERCENTAGE, percentageBasisPoints: 1000 }
  });
  return buildCaseSnapshot({
    caseNumber: overrides.caseNumber || "MH-TEST-1",
    formData: {
      patientName: overrides.patientName || "Test Hasta",
      protocolNumber: "P-100",
      physicianName: "Dr. Test",
      procedureDate: "2026-08-11",
      notes: overrides.notes || "İlk kayıt"
    },
    calculation,
    financialSummary,
    commissionInput: { method: COMMISSION_METHOD.REMAINING_PERCENTAGE, percentageBasisPoints: 1000 },
    tariff: TARIFF_2026_V1
  });
};

const setup = async () => {
  const runtime = await createLocalRepositoryRuntime({ now: () => new Date("2026-08-11T09:00:00Z") });
  const workflow = new CaseWorkflow(runtime);
  await workflow.initialize();
  return { runtime, workflow };
};

test("taslak kaydeder", async () => {
  const { workflow } = await setup();
  const saved = await workflow.saveDraft(makeSnapshot());
  assert.equal(saved.status, "draft");
  assert.match(saved.id, /^local-/);
});

test("mevcut taslağı yeni vaka oluşturmadan günceller", async () => {
  const { workflow } = await setup();
  const original = await workflow.saveDraft(makeSnapshot());
  const updated = await workflow.saveDraft(makeSnapshot({ patientName: "Güncel Hasta", notes: "Güncellendi" }));
  assert.equal(updated.id, original.id);
  assert.equal(updated.patient.name, "Güncel Hasta");
  assert.equal(updated.notes, "Güncellendi");
});

test("taslağı kesinleştirir", async () => {
  const { workflow } = await setup();
  await workflow.saveDraft(makeSnapshot());
  const finalized = await workflow.finalize();
  assert.equal(finalized.status, "finalized");
  assert.ok(finalized.finalizedAt);
});

test("kesinleşmiş vaka düzenlenemez", async () => {
  const { workflow } = await setup();
  await workflow.saveDraft(makeSnapshot());
  await workflow.finalize();
  await assert.rejects(() => workflow.saveDraft(makeSnapshot({ notes: "Yasak" })), /Yalnız taslak/);
});

test("kesinleşmiş vaka kontrollü iptal edilebilir", async () => {
  const { workflow } = await setup();
  await workflow.saveDraft(makeSnapshot());
  await workflow.finalize();
  const cancelled = await workflow.cancel("Hasta vazgeçti");
  assert.equal(cancelled.status, "cancelled");
  assert.ok(cancelled.cancelledAt);
});

test("yeni vaka mevcut vaka bağlamını temizler", async () => {
  const { workflow } = await setup();
  await workflow.saveDraft(makeSnapshot());
  workflow.newCase();
  assert.equal(workflow.currentCase, null);
});

test("kesinleştirme hesap ve tarife snapshot bütünlüğünü korur", async () => {
  const { workflow } = await setup();
  const source = makeSnapshot();
  const expected = structuredClone(source.calculationSnapshot);
  await workflow.saveDraft(source);
  const finalized = await workflow.finalize();
  assert.deepEqual(finalized.calculationSnapshot, expected);
  assert.equal(finalized.tariff.tariffId, "2026-v1");
  assert.equal(finalized.tariff.version, 1);
  assert.equal(finalized.calculation.engineVersion, "1.0.0");
});

test("oluşturma, güncelleme, kesinleştirme ve iptal audit olayları üretir", async () => {
  const { runtime, workflow } = await setup();
  await workflow.saveDraft(makeSnapshot());
  await workflow.saveDraft(makeSnapshot({ notes: "Güncel" }));
  await workflow.finalize();
  await workflow.cancel("Kontrollü iptal");
  const events = runtime.localDebug.list("guestPhysicianAuditLogs")
    .filter(event => event.entityType === "case")
    .map(event => event.eventType);
  assert.deepEqual(events, ["case_created", "case_updated", "case_finalized", "case_cancelled"]);
});
