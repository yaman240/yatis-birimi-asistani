import assert from "node:assert/strict";
import test from "node:test";
import { collection, getDocs } from "firebase/firestore";
import { calculateGuestPhysician, TARIFF_2026_V1 } from "../guest-physician/calculation-engine.js";
import { buildCaseSnapshot } from "../guest-physician/case-snapshot.js";
import { CaseWorkflow } from "../guest-physician/case-workflow.js";
import { createFirebaseEmulatorRuntime } from "../guest-physician/firebase-emulator-runtime.js";
import { calculateFinancialSummary, COMMISSION_METHOD } from "../guest-physician/financial-summary.js";

const PROJECT_ID = "demo-yatis-birimi-asistani";
const TEST_TARIFF_ID = "TEST-TARIFF-2026-v1";
const clearEmulator = async () => {
  const response = await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`, {
    method: "DELETE"
  });
  if (!response.ok) throw new Error(`Emulator temizliği başarısız: ${response.status}`);
};

const buildTestCase = (tariff, notes = "TEST-ilk-kayıt") => {
  const calculation = calculateGuestPhysician({
    category: "surgery",
    anesthesiaStart: "09:00",
    anesthesiaEnd: "10:35",
    accommodation: "private_room_one_day",
    outsideWorkingHours: true,
    sgk: false
  }, tariff);
  const financialSummary = calculateFinancialSummary({
    calculation,
    extraItems: [{ type: "laboratory", description: "TEST-Laboratuvar", quantity: 1, unitPriceKurus: 25000 }],
    patientCollectedKurus: 9000000,
    commission: { method: COMMISSION_METHOD.REMAINING_PERCENTAGE, percentageBasisPoints: 1000 }
  });
  return buildCaseSnapshot({
    caseNumber: "TEST-CASE-0001",
    formData: {
      patientName: "TEST-Hasta",
      protocolNumber: "TEST-PROTOKOL-1",
      physicianName: "TEST-Dr. Hekim",
      procedureDate: "2026-08-11",
      notes
    },
    calculation,
    financialSummary,
    commissionInput: { method: COMMISSION_METHOD.REMAINING_PERCENTAGE, percentageBasisPoints: 1000 },
    tariff
  });
};

test("gerçek Firebase SDK ile demo Emulator repository uçtan uca akışı", async t => {
  let runtime;
  await clearEmulator();
  try {
    runtime = await createFirebaseEmulatorRuntime({ projectId: PROJECT_ID });
    await runtime.tariffRepository.createDraft(TEST_TARIFF_ID, {
      ...structuredClone(TARIFF_2026_V1),
      tariffId: TEST_TARIFF_ID,
      tariffCode: "TEST_GUEST_PHYSICIAN_2026",
      effectiveFrom: new Date("2026-01-01T00:00:00Z"),
      effectiveUntil: null,
      exclusions: ["TEST-Tetkikler dahil değildir."],
      changeNote: "TEST-Gerçek SDK Emulator doğrulaması"
    });
    await runtime.tariffRepository.activate(TEST_TARIFF_ID);

    const workflow = new CaseWorkflow(runtime);
    const activeTariff = await workflow.initialize();
    assert.equal(activeTariff.id, TEST_TARIFF_ID);
    assert.equal(activeTariff.tariffCode, "TEST_GUEST_PHYSICIAN_2026");

    const draft = await workflow.saveDraft(buildTestCase(activeTariff));
    assert.equal(draft.status, "draft");
    assert.equal(draft.caseNumber, "TEST-CASE-0001");

    const updated = await workflow.saveDraft(buildTestCase(activeTariff, "TEST-güncellendi"));
    assert.equal(updated.id, draft.id);
    assert.equal(updated.notes, "TEST-güncellendi");

    const expectedSnapshot = structuredClone(updated.calculationSnapshot);
    const finalized = await workflow.finalize();
    assert.equal(finalized.status, "finalized");
    assert.deepEqual(finalized.calculationSnapshot, expectedSnapshot);
    assert.equal(finalized.tariff.tariffId, TEST_TARIFF_ID);
    await assert.rejects(() => workflow.saveDraft(buildTestCase(activeTariff, "TEST-yasak")), /Yalnız taslak/);

    const cancelled = await workflow.cancel("TEST-kontrollü-iptal");
    assert.equal(cancelled.status, "cancelled");

    const auditSnapshot = await getDocs(collection(runtime.caseRepository.db, "guestPhysicianAuditLogs"));
    const caseEvents = auditSnapshot.docs
      .map(document => document.data())
      .filter(event => event.entityId === draft.id)
      .map(event => event.eventType)
      .sort();
    assert.deepEqual(caseEvents, ["case_cancelled", "case_created", "case_finalized", "case_updated"]);

    for (const name of [
      "guestPhysicianTariffs",
      "guestPhysicianTariffSettings",
      "guestPhysicianCases",
      "guestPhysicianAuditLogs"
    ]) {
      const snapshot = await getDocs(collection(runtime.caseRepository.db, name));
      await t.test(`${name} gerçek SDK üzerinden erişilebilir`, () => assert.ok(snapshot.size > 0));
    }
  } finally {
    await runtime?.dispose();
    await clearEmulator();
  }

  const verificationRuntime = await createFirebaseEmulatorRuntime({ projectId: PROJECT_ID });
  try {
    for (const name of [
      "guestPhysicianTariffs",
      "guestPhysicianTariffSettings",
      "guestPhysicianCases",
      "guestPhysicianAuditLogs"
    ]) {
      const snapshot = await getDocs(collection(verificationRuntime.caseRepository.db, name));
      assert.equal(snapshot.size, 0, `${name} test sonunda boş olmalıdır.`);
    }
  } finally {
    await verificationRuntime.dispose();
  }
});

test("Firebase Emulator adaptörü uzak hostu ve production kimliğini reddeder", async () => {
  await assert.rejects(
    () => createFirebaseEmulatorRuntime({ projectId: PROJECT_ID, host: "firestore.googleapis.com" }),
    /yalnız yerel Emulator/
  );
  await assert.rejects(
    () => createFirebaseEmulatorRuntime({ projectId: "yatis-production" }),
    /demo- veya staging-/
  );
});
