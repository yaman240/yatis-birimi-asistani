import test from "node:test";
import assert from "node:assert/strict";

import { CaseRepository } from "../guest-physician/case-repository.js";
import { TariffRepository } from "../guest-physician/tariff-repository.js";
import { createFakeFirestore } from "./helpers/fake-firestore.js";

const actorProvider = () => ({ uid: "admin-1", email: "yaman615@gmail.com" });

const caseInput = () => ({
  caseNumber: "MH-2026-000001",
  tariff: { tariffId: "2026-v1", tariffCode: "GUEST_PHYSICIAN_2026", version: 1 },
  category: "surgery",
  procedureCode: null,
  patient: { name: "Test Hasta", protocolNumber: "P-1" },
  physician: { name: "Test Hekim", identifier: "" },
  timing: { anesthesiaStart: "09:00", anesthesiaEnd: "10:00", durationMinutes: 60 },
  accommodation: { type: "none" },
  options: { outsideWorkingHours: false, sgk: false },
  lineItems: [{ type: "base_service", amountKurus: 3500000 }],
  totals: {
    mainServiceKurus: 3500000,
    accommodationKurus: 0,
    outsideWorkingHoursSurchargeKurus: 0,
    extraItemsTotalKurus: 0,
    hospitalTotalKurus: 3500000,
    patientCollectedKurus: 5000000,
    remainingKurus: 1500000,
    doctorCommissionKurus: 0,
    doctorNetPaymentKurus: 1500000
  },
  tariffSnapshot: { tariffId: "2026-v1", baseFeeKurus: 3500000 },
  calculation: { engineVersion: "1.0.0", roundingMode: "half_up_to_kurus" },
  calculationSnapshot: {
    tariff: { tariffId: "2026-v1", version: 1 },
    calculation: { amounts: { grossTotalKurus: 3500000 } },
    financialSummary: { amounts: { hospitalTotalKurus: 3500000 } }
  },
  notes: ""
});

const tariffInput = () => ({
  tariffCode: "GUEST_PHYSICIAN_2026",
  version: 1,
  effectiveFrom: "2026-01-01",
  effectiveUntil: null,
  categories: { surgery: {}, dentalEnt: {}, obstetrics: {} },
  surcharges: { outsideWorkingHours: { rateBasisPoints: 2000 } },
  restrictions: { privatePayOnly: true, sgkAllowed: false },
  exclusions: [],
  changeNote: "İlk tarife"
});

test("repository taslak vaka ile tam hesaplama snapshot'ını ve audit kaydını oluşturur", async () => {
  const fake = createFakeFirestore();
  const repository = new CaseRepository({ ...fake, actorProvider });
  const created = await repository.createDraft(caseInput());
  assert.equal(created.status, "draft");
  assert.equal(created.tariff.tariffId, "2026-v1");
  assert.equal(created.tariff.version, 1);
  assert.equal(created.calculationSnapshot.financialSummary.amounts.hospitalTotalKurus, 3500000);
  assert.equal([...fake.documents.keys()].filter(path => path.startsWith("guestPhysicianAuditLogs/")).length, 1);
});

test("repository taslak vakayı düzenler ve oluşturma denetim alanlarını korur", async () => {
  const fake = createFakeFirestore();
  const repository = new CaseRepository({ ...fake, actorProvider });
  const created = await repository.createDraft(caseInput());
  await repository.updateDraft(created.id, { notes: "Güncellendi" });
  const updated = await repository.getById(created.id);
  assert.equal(updated.notes, "Güncellendi");
  assert.deepEqual(updated.createdBy, created.createdBy);
});

test("repository kesinleşmiş vakayı düzenletmez ve snapshot'ı korur", async () => {
  const fake = createFakeFirestore();
  const repository = new CaseRepository({ ...fake, actorProvider });
  const created = await repository.createDraft(caseInput());
  await repository.finalize(created.id);
  const finalized = await repository.getById(created.id);
  await assert.rejects(
    repository.updateDraft(created.id, { totals: { ...finalized.totals, hospitalTotalKurus: 1 } }),
    /Yalnız taslak/
  );
  const unchanged = await repository.getById(created.id);
  assert.deepEqual(unchanged.calculationSnapshot, created.calculationSnapshot);
  assert.equal(unchanged.status, "finalized");
});

test("repository kesinleşmiş vakayı silmek yerine kritik alanları koruyarak iptal eder", async () => {
  const fake = createFakeFirestore();
  const repository = new CaseRepository({ ...fake, actorProvider });
  const created = await repository.createDraft(caseInput());
  await repository.finalize(created.id);
  await repository.cancel(created.id, "İptal edildi");
  const cancelled = await repository.getById(created.id);
  assert.equal(cancelled.status, "cancelled");
  assert.deepEqual(cancelled.totals, created.totals);
  assert.deepEqual(cancelled.calculationSnapshot, created.calculationSnapshot);
});

test("repository taslak tarife oluşturur ve audit olayı ekler", async () => {
  const fake = createFakeFirestore();
  const repository = new TariffRepository({ ...fake, actorProvider });
  const tariff = await repository.createDraft("2026-v1", tariffInput());
  assert.equal(tariff.status, "draft");
  assert.equal(tariff.version, 1);
  assert.equal([...fake.documents.keys()].filter(path => path.startsWith("guestPhysicianAuditLogs/")).length, 1);
});

test("tarife aktivasyonu aktif işaretçiyi günceller ve önceki tarifeyi emekliye ayırır", async () => {
  const fake = createFakeFirestore();
  const repository = new TariffRepository({ ...fake, actorProvider });
  await repository.createDraft("2026-v1", tariffInput());
  await repository.activate("2026-v1");
  await repository.createDraft("2026-v2", { ...tariffInput(), version: 2 });
  await repository.activate("2026-v2");
  assert.equal((await repository.getById("2026-v1")).status, "retired");
  assert.equal((await repository.getActive()).id, "2026-v2");
});

