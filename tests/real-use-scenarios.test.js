import test from "node:test";
import assert from "node:assert/strict";

import {
  ACCOMMODATION,
  CATEGORY,
  OBSTETRICS_PROCEDURE,
  calculateGuestPhysician
} from "../guest-physician/calculation-engine.js";
import {
  COMMISSION_METHOD,
  calculateFinancialSummary,
  parseTurkishMoneyToKurus
} from "../guest-physician/financial-summary.js";

const calculateCase = (input, financial = {}) => {
  const calculation = calculateGuestPhysician(input);
  return { calculation, summary: calculateFinancialSummary({ calculation, ...financial }) };
};

for (const [minutes, expectedKurus] of [[45, 3500000], [60, 3500000], [95, 4200000], [180, 5900000]]) {
  test(`Cerrahi ${minutes} dakika gerçek kullanım sonucu`, () => {
    const hours = String(Math.floor(minutes / 60) + 9).padStart(2, "0");
    const mins = String(minutes % 60).padStart(2, "0");
    const { calculation } = calculateCase({
      category: CATEGORY.SURGERY,
      anesthesiaStart: "09:00",
      anesthesiaEnd: `${hours}:${mins}`
    });
    assert.equal(calculation.timing.durationMinutes, minutes);
    assert.equal(calculation.amounts.mainServiceKurus, expectedKurus);
  });
}

test("Diş/KBB 90 dakika gerçek kullanım sonucu", () => {
  const { calculation } = calculateCase({
    category: CATEGORY.DENTAL_ENT,
    anesthesiaStart: "09:00",
    anesthesiaEnd: "10:30"
  });
  assert.equal(calculation.amounts.mainServiceKurus, 2500000);
});

test("Diş/KBB 95 dakika gerçek kullanım sonucu", () => {
  const { calculation } = calculateCase({
    category: CATEGORY.DENTAL_ENT,
    anesthesiaStart: "09:00",
    anesthesiaEnd: "10:35"
  });
  assert.equal(calculation.amounts.mainServiceKurus, 2583333);
});

test("23:30 başlayıp 01:00 biten işlem 90 dakikadır", () => {
  const { calculation } = calculateCase({
    category: CATEGORY.SURGERY,
    anesthesiaStart: "23:30",
    anesthesiaEnd: "01:00"
  });
  assert.equal(calculation.timing.durationMinutes, 90);
  assert.equal(calculation.amounts.mainServiceKurus, 4100000);
});

test("Cerrahi, özel oda ve mesai dışı birleşik sonucu", () => {
  const { summary } = calculateCase({
    category: CATEGORY.SURGERY,
    anesthesiaStart: "09:00",
    anesthesiaEnd: "10:35",
    accommodation: ACCOMMODATION.PRIVATE_ROOM_ONE_DAY,
    outsideWorkingHours: true
  });
  assert.equal(summary.amounts.hospitalTotalKurus, 6040000);
});

test("Diş/KBB ve günübirlik oda birleşik sonucu", () => {
  const { summary } = calculateCase({
    category: CATEGORY.DENTAL_ENT,
    anesthesiaStart: "09:00",
    anesthesiaEnd: "10:30",
    accommodation: ACCOMMODATION.PRIVATE_ROOM_DAY_CASE
  });
  assert.equal(summary.amounts.hospitalTotalKurus, 2750000);
});

test("Kadın Doğum Sezaryen ve mesai dışı birleşik sonucu", () => {
  const { summary } = calculateCase({
    category: CATEGORY.OBSTETRICS,
    procedureCode: OBSTETRICS_PROCEDURE.CESAREAN,
    outsideWorkingHours: true
  });
  assert.equal(summary.amounts.hospitalTotalKurus, 4080000);
});

test("ek kalemli vaka hastane toplamını artırır", () => {
  const { summary } = calculateCase({
    category: CATEGORY.SURGERY,
    anesthesiaStart: "09:00",
    anesthesiaEnd: "10:00"
  }, {
    extraItems: [
      { type: "laboratory", quantity: 1, unitPriceKurus: 150000 },
      { type: "radiology", quantity: 2, unitPriceKurus: 200000 }
    ]
  });
  assert.equal(summary.amounts.extraItemsTotalKurus, 550000);
  assert.equal(summary.amounts.hospitalTotalKurus, 4050000);
});

test("tahsilat hastane bedelinden düşükse negatif kalan üretir", () => {
  const { summary } = calculateCase({
    category: CATEGORY.SURGERY,
    anesthesiaStart: "09:00",
    anesthesiaEnd: "10:00"
  }, { patientCollectedKurus: 3000000 });
  assert.equal(summary.amounts.remainingKurus, -500000);
  assert.equal(summary.hasNegativeRemaining, true);
});

test("gerçek vakada kalan tutarın %10 doktor payı", () => {
  const { summary } = calculateCase({
    category: CATEGORY.SURGERY,
    anesthesiaStart: "09:00",
    anesthesiaEnd: "10:00"
  }, {
    patientCollectedKurus: 5000000,
    commission: { method: COMMISSION_METHOD.REMAINING_PERCENTAGE, percentageBasisPoints: 1000 }
  });
  assert.equal(summary.amounts.doctorCommissionKurus, 150000);
  assert.equal(summary.amounts.doctorNetPaymentKurus, 1350000);
});

test("gerçek vakada tahsilatın %10 doktor payı", () => {
  const { summary } = calculateCase({
    category: CATEGORY.SURGERY,
    anesthesiaStart: "09:00",
    anesthesiaEnd: "10:00"
  }, {
    patientCollectedKurus: 5000000,
    commission: { method: COMMISSION_METHOD.COLLECTED_PERCENTAGE, percentageBasisPoints: 1000 }
  });
  assert.equal(summary.amounts.doctorCommissionKurus, 500000);
  assert.equal(summary.amounts.doctorNetPaymentKurus, 1000000);
});

test("gerçek vakada Türkçe girişten manuel doktor payı", () => {
  const { summary } = calculateCase({
    category: CATEGORY.SURGERY,
    anesthesiaStart: "09:00",
    anesthesiaEnd: "10:00"
  }, {
    patientCollectedKurus: 5000000,
    commission: {
      method: COMMISSION_METHOD.MANUAL_FIXED,
      manualAmountKurus: parseTurkishMoneyToKurus("500,00")
    }
  });
  assert.equal(summary.amounts.doctorCommissionKurus, 50000);
  assert.equal(summary.amounts.doctorNetPaymentKurus, 1450000);
});

