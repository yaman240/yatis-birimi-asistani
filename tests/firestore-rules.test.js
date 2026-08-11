import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} from "@firebase/rules-unit-testing";
import {
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc
} from "firebase/firestore";

let environment;
const adminAuth = { uid: "admin-1", email: "yaman615@gmail.com" };
const unauthorizedAuth = { uid: "user-2", email: "yetkisiz@example.com" };

const actor = auth => ({ uid: auth.uid, email: auth.email });

const validCase = (auth = adminAuth) => ({
  schemaVersion: 1,
  caseNumber: "MH-2026-000001",
  status: "draft",
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
  notes: "",
  createdAt: serverTimestamp(),
  createdBy: actor(auth),
  updatedAt: serverTimestamp(),
  updatedBy: actor(auth),
  finalizedAt: null,
  finalizedBy: null,
  cancelledAt: null,
  cancelledBy: null
});

const validTariff = (auth = adminAuth) => ({
  schemaVersion: 1,
  tariffCode: "GUEST_PHYSICIAN_2026",
  version: 1,
  status: "draft",
  currency: "TRY",
  effectiveFrom: Timestamp.fromDate(new Date("2026-01-01T00:00:00Z")),
  effectiveUntil: null,
  categories: {
    surgery: {
      includedMinutes: 60,
      baseFeeKurus: 3500000,
      excessMinuteFeeKurus: 20000,
      roomFees: {
        private_room_one_day: 1000000,
        private_room_day_case: 500000,
        observation_day_case: 0
      }
    },
    dentalEnt: {
      includedMinutes: 60,
      baseFeeKurus: 2000000,
      excessRate: { numeratorKurus: 1000000, denominatorMinutes: 60 },
      roomFees: {
        private_room_one_day: 500000,
        private_room_day_case: 250000,
        observation_day_case: 0
      }
    },
    obstetrics: {
      procedures: {
        cesarean: { feeKurus: 3400000 },
        normalDelivery: { feeKurus: 2800000 },
        curettageOther: { feeKurus: 2400000 }
      }
    }
  },
  surcharges: { outsideWorkingHours: { rateBasisPoints: 2000 } },
  restrictions: { privatePayOnly: true, sgkAllowed: false },
  exclusions: [],
  createdAt: serverTimestamp(),
  createdBy: actor(auth),
  updatedAt: serverTimestamp(),
  updatedBy: actor(auth),
  activatedAt: null,
  activatedBy: null,
  changeNote: "İlk tarife"
});

before(async () => {
  environment = await initializeTestEnvironment({
    projectId: "demo-yatis-birimi-asistani",
    firestore: {
      rules: await readFile(new URL("../firestore.rules", import.meta.url), "utf8")
    }
  });
});

beforeEach(async () => environment.clearFirestore());
after(async () => environment?.cleanup());

test("yönetici geçerli taslak vaka oluşturabilir", async () => {
  const db = environment.authenticatedContext(adminAuth.uid, { email: adminAuth.email }).firestore();
  await assertSucceeds(setDoc(doc(db, "guestPhysicianCases", "case-valid"), validCase()));
});

test("yetkisiz kullanıcı Misafir Hekim vakası yazamaz", async () => {
  const db = environment.authenticatedContext(unauthorizedAuth.uid, { email: unauthorizedAuth.email }).firestore();
  await assertFails(setDoc(doc(db, "guestPhysicianCases", "case-denied"), validCase(unauthorizedAuth)));
});

test("negatif ana para alanı expression sınırına ulaşmadan reddedilir", async () => {
  const db = environment.authenticatedContext(adminAuth.uid, { email: adminAuth.email }).firestore();
  const negative = validCase();
  negative.totals.mainServiceKurus = -1;
  await assertFails(setDoc(doc(db, "guestPhysicianCases", "case-negative"), negative));
});

test("geçersiz vaka durumu expression sınırına ulaşmadan reddedilir", async () => {
  const db = environment.authenticatedContext(adminAuth.uid, { email: adminAuth.email }).firestore();
  const invalidStatus = validCase();
  invalidStatus.status = "approved";
  await assertFails(setDoc(doc(db, "guestPhysicianCases", "case-status"), invalidStatus));
});

test("SGK true olan vaka erken reddedilir", async () => {
  const db = environment.authenticatedContext(adminAuth.uid, { email: adminAuth.email }).firestore();
  const invalid = validCase();
  invalid.options.sgk = true;
  await assertFails(setDoc(doc(db, "guestPhysicianCases", "case-sgk"), invalid));
});

test("zorunlu totals alanı eksik vaka reddedilir", async () => {
  const db = environment.authenticatedContext(adminAuth.uid, { email: adminAuth.email }).firestore();
  const invalid = validCase();
  delete invalid.totals.extraItemsTotalKurus;
  await assertFails(setDoc(doc(db, "guestPhysicianCases", "case-missing-total"), invalid));
});

test("negatif oda bedeli reddedilir", async () => {
  const db = environment.authenticatedContext(adminAuth.uid, { email: adminAuth.email }).firestore();
  const invalid = validCase();
  invalid.totals.accommodationKurus = -1;
  await assertFails(setDoc(doc(db, "guestPhysicianCases", "case-negative-room"), invalid));
});

test("mali toplam formülü bozuk vaka reddedilir", async () => {
  const db = environment.authenticatedContext(adminAuth.uid, { email: adminAuth.email }).firestore();
  const invalid = validCase();
  invalid.totals.hospitalTotalKurus = 1;
  await assertFails(setDoc(doc(db, "guestPhysicianCases", "case-invalid-total"), invalid));
});

test("kesinleşmiş vakanın hesap alanları değiştirilemez ve doğrudan silinemez", async () => {
  const db = environment.authenticatedContext(adminAuth.uid, { email: adminAuth.email }).firestore();
  const reference = doc(db, "guestPhysicianCases", "case-finalized");
  await assertSucceeds(setDoc(reference, validCase()));
  await assertSucceeds(updateDoc(reference, {
    status: "finalized",
    updatedAt: serverTimestamp(),
    updatedBy: actor(adminAuth),
    finalizedAt: serverTimestamp(),
    finalizedBy: actor(adminAuth)
  }));
  await assertFails(updateDoc(reference, {
    "totals.hospitalTotalKurus": 1,
    updatedAt: serverTimestamp(),
    updatedBy: actor(adminAuth)
  }));
  await assertFails(deleteDoc(reference));
});

test("kesinleşmiş vaka kritik alanlar korunarak iptal edilebilir", async () => {
  const db = environment.authenticatedContext(adminAuth.uid, { email: adminAuth.email }).firestore();
  const reference = doc(db, "guestPhysicianCases", "case-cancelled");
  await assertSucceeds(setDoc(reference, validCase()));
  await assertSucceeds(updateDoc(reference, {
    status: "finalized",
    updatedAt: serverTimestamp(),
    updatedBy: actor(adminAuth),
    finalizedAt: serverTimestamp(),
    finalizedBy: actor(adminAuth)
  }));
  await assertSucceeds(updateDoc(reference, {
    status: "cancelled",
    updatedAt: serverTimestamp(),
    updatedBy: actor(adminAuth),
    cancelledAt: serverTimestamp(),
    cancelledBy: actor(adminAuth)
  }));
});

test("mevcut surgeryPrices yönetici yazma davranışı korunur", async () => {
  const adminDb = environment.authenticatedContext(adminAuth.uid, { email: adminAuth.email }).firestore();
  const userDb = environment.authenticatedContext(unauthorizedAuth.uid, { email: unauthorizedAuth.email }).firestore();
  await assertSucceeds(setDoc(doc(adminDb, "surgeryPrices", "test"), { id: 1 }));
  await assertFails(setDoc(doc(userDb, "surgeryPrices", "test-2"), { id: 2 }));
});

test("audit log güncellenemez veya silinemez", async () => {
  const db = environment.authenticatedContext(adminAuth.uid, { email: adminAuth.email }).firestore();
  const reference = doc(db, "guestPhysicianAuditLogs", "audit-1");
  await assertSucceeds(setDoc(reference, {
    schemaVersion: 1,
    eventType: "case_created",
    entityType: "case",
    entityId: "case-1",
    actor: actor(adminAuth),
    occurredAt: serverTimestamp(),
    details: {}
  }));
  await assertFails(updateDoc(reference, { details: { changed: true } }));
  await assertFails(deleteDoc(reference));
});

test("aktif tarife fiyatları yerinde değiştirilemez", async () => {
  const db = environment.authenticatedContext(adminAuth.uid, { email: adminAuth.email }).firestore();
  const reference = doc(db, "guestPhysicianTariffs", "2026-v1");
  await assertSucceeds(setDoc(reference, validTariff()));
  await assertSucceeds(updateDoc(reference, {
    status: "active",
    activatedAt: serverTimestamp(),
    activatedBy: actor(adminAuth),
    updatedAt: serverTimestamp(),
    updatedBy: actor(adminAuth)
  }));
  await assertFails(updateDoc(reference, {
    "categories.surgery.baseFeeKurus": 1,
    updatedAt: serverTimestamp(),
    updatedBy: actor(adminAuth)
  }));
});

test("emulator test ortamı gerçekten demo proje kullanır", () => {
  assert.match(environment.projectId, /^demo-/);
});
