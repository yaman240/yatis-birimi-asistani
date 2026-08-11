import test from "node:test";
import assert from "node:assert/strict";

import { CATEGORY, calculateGuestPhysician } from "../guest-physician/calculation-engine.js";
import {
  COMMISSION_METHOD,
  calculateExtraItem,
  calculateDoctorPayment,
  calculateFinancialSummary,
  parsePercentageToBasisPoints,
  parseTurkishMoneyToKurus
} from "../guest-physician/financial-summary.js";

const surgeryCalculation = () => calculateGuestPhysician({
  category: CATEGORY.SURGERY,
  anesthesiaStart: "09:00",
  anesthesiaEnd: "10:30",
  accommodation: "private_room_one_day",
  outsideWorkingHours: true
});

test("Türkçe para girişini kuruşa dönüştürür", () => {
  assert.equal(parseTurkishMoneyToKurus("1.234,56"), 123456);
  assert.equal(parseTurkishMoneyToKurus("2500,5 TL"), 250050);
  assert.equal(parseTurkishMoneyToKurus("0,01 ₺"), 1);
  assert.equal(parseTurkishMoneyToKurus(""), null);
});

test("geçersiz veya negatif para girişini reddeder", () => {
  assert.throws(() => parseTurkishMoneyToKurus("12.34"), TypeError);
  assert.throws(() => parseTurkishMoneyToKurus("-10,00"), TypeError);
  assert.throws(() => parseTurkishMoneyToKurus("1,234"), TypeError);
});

test("ek kalemde adet çarpı birim fiyatı hesaplar", () => {
  const item = calculateExtraItem({
    type: "erythrocyte",
    description: "2 ünite",
    quantity: 2,
    unitPriceKurus: 175050
  });
  assert.equal(item.totalKurus, 350100);
  assert.equal(item.surchargeEligible, false);
});

test("sıfır, kesirli adet ve bilinmeyen türü reddeder", () => {
  assert.throws(() => calculateExtraItem({ type: "ffp", quantity: 0, unitPriceKurus: 100 }), TypeError);
  assert.throws(() => calculateExtraItem({ type: "ffp", quantity: 1.5, unitPriceKurus: 100 }), TypeError);
  assert.throws(() => calculateExtraItem({ type: "unknown", quantity: 1, unitPriceKurus: 100 }), RangeError);
});

test("mali özet hastane toplamına ek kalemleri dahil eder", () => {
  const summary = calculateFinancialSummary({
    calculation: surgeryCalculation(),
    extraItems: [
      { type: "laboratory", quantity: 2, unitPriceKurus: 125000 },
      { type: "radiology", quantity: 1, unitPriceKurus: 300000 }
    ]
  });
  assert.equal(summary.amounts.mainServiceKurus, 4100000);
  assert.equal(summary.amounts.accommodationKurus, 1000000);
  assert.equal(summary.amounts.outsideWorkingHoursSurchargeKurus, 820000);
  assert.equal(summary.amounts.extraItemsTotalKurus, 550000);
  assert.equal(summary.amounts.hospitalTotalKurus, 6470000);
});

test("ek kalemler mesai dışı yüzde farkını değiştirmez", () => {
  const calculation = surgeryCalculation();
  const withoutExtras = calculateFinancialSummary({ calculation });
  const withExtras = calculateFinancialSummary({
    calculation,
    extraItems: [{ type: "special_material", quantity: 1, unitPriceKurus: 10000000 }]
  });
  assert.equal(
    withExtras.amounts.outsideWorkingHoursSurchargeKurus,
    withoutExtras.amounts.outsideWorkingHoursSurchargeKurus
  );
  assert.equal(withExtras.amounts.outsideWorkingHoursSurchargeKurus, 820000);
});

test("hastadan alınan tutardan hastane toplamını çıkarır", () => {
  const summary = calculateFinancialSummary({
    calculation: surgeryCalculation(),
    patientCollectedKurus: 7000000
  });
  assert.equal(summary.amounts.hospitalTotalKurus, 5920000);
  assert.equal(summary.amounts.remainingKurus, 1080000);
  assert.equal(summary.hasNegativeRemaining, false);
});

test("negatif kalan tutarı açık durum bilgisiyle döndürür", () => {
  const summary = calculateFinancialSummary({
    calculation: surgeryCalculation(),
    patientCollectedKurus: 5000000
  });
  assert.equal(summary.amounts.remainingKurus, -920000);
  assert.equal(summary.hasNegativeRemaining, true);
});

test("hastadan alınan tutar boşsa kalan tutarı hesaplamaz", () => {
  const summary = calculateFinancialSummary({ calculation: surgeryCalculation() });
  assert.equal(summary.amounts.patientCollectedKurus, null);
  assert.equal(summary.amounts.remainingKurus, null);
  assert.equal(summary.hasNegativeRemaining, false);
});

test("kalan tutarın %10 komisyonunu hesaplar", () => {
  const result = calculateDoctorPayment({
    method: COMMISSION_METHOD.REMAINING_PERCENTAGE,
    remainingKurus: 1000000,
    patientCollectedKurus: 7000000,
    percentageBasisPoints: 1000
  });
  assert.equal(result.commissionKurus, 100000);
  assert.equal(result.doctorNetPaymentKurus, 900000);
});

test("hastadan alınan toplam tutarın %10 komisyonunu hesaplar", () => {
  const result = calculateDoctorPayment({
    method: COMMISSION_METHOD.COLLECTED_PERCENTAGE,
    remainingKurus: 2000000,
    patientCollectedKurus: 10000000,
    percentageBasisPoints: 1000
  });
  assert.equal(result.commissionKurus, 1000000);
  assert.equal(result.doctorNetPaymentKurus, 1000000);
});

test("yüzde komisyonunu nihai kuruşa yarım-yukarı yuvarlar", () => {
  const result = calculateDoctorPayment({
    method: COMMISSION_METHOD.REMAINING_PERCENTAGE,
    remainingKurus: 10005,
    patientCollectedKurus: 100000,
    percentageBasisPoints: 1000
  });
  assert.equal(result.commissionKurus, 1001);
  assert.equal(result.doctorNetPaymentKurus, 9004);
});

test("manuel sabit komisyonu kalan tutardan düşer", () => {
  const result = calculateDoctorPayment({
    method: COMMISSION_METHOD.MANUAL_FIXED,
    remainingKurus: 1500000,
    patientCollectedKurus: 7000000,
    manualAmountKurus: 400000
  });
  assert.equal(result.commissionKurus, 400000);
  assert.equal(result.doctorNetPaymentKurus, 1100000);
});

test("komisyon yok yönteminde net ödeme kalan tutara eşittir", () => {
  const result = calculateDoctorPayment({
    method: COMMISSION_METHOD.NONE,
    remainingKurus: 750000,
    patientCollectedKurus: 6000000
  });
  assert.equal(result.commissionKurus, 0);
  assert.equal(result.doctorNetPaymentKurus, 750000);
});

test("tahsilat yokken komisyon ve net ödeme hesaplamaz", () => {
  const result = calculateDoctorPayment({
    method: COMMISSION_METHOD.REMAINING_PERCENTAGE,
    remainingKurus: null,
    patientCollectedKurus: null,
    percentageBasisPoints: 1000
  });
  assert.equal(result.status, "missing_collection");
  assert.equal(result.commissionKurus, null);
  assert.equal(result.doctorNetPaymentKurus, null);
});

test("negatif kalan tutarda komisyon ve net ödeme hesaplamaz", () => {
  const result = calculateDoctorPayment({
    method: COMMISSION_METHOD.COLLECTED_PERCENTAGE,
    remainingKurus: -100,
    patientCollectedKurus: 5000000,
    percentageBasisPoints: 1000
  });
  assert.equal(result.status, "negative_remaining");
  assert.equal(result.commissionKurus, null);
  assert.equal(result.doctorNetPaymentKurus, null);
});

test("%0 ve %100 sınırlarını kabul eder", () => {
  const zero = calculateDoctorPayment({
    method: COMMISSION_METHOD.REMAINING_PERCENTAGE,
    remainingKurus: 1000000,
    patientCollectedKurus: 5000000,
    percentageBasisPoints: parsePercentageToBasisPoints("0")
  });
  const hundred = calculateDoctorPayment({
    method: COMMISSION_METHOD.REMAINING_PERCENTAGE,
    remainingKurus: 1000000,
    patientCollectedKurus: 5000000,
    percentageBasisPoints: parsePercentageToBasisPoints("100")
  });
  assert.equal(zero.commissionKurus, 0);
  assert.equal(zero.doctorNetPaymentKurus, 1000000);
  assert.equal(hundred.commissionKurus, 1000000);
  assert.equal(hundred.doctorNetPaymentKurus, 0);
});

test("geçersiz yüzde değerlerini reddeder", () => {
  assert.throws(() => parsePercentageToBasisPoints("-1"), RangeError);
  assert.throws(() => parsePercentageToBasisPoints("100,01"), RangeError);
  assert.throws(() => parsePercentageToBasisPoints("10,123"), TypeError);
  assert.throws(() => calculateDoctorPayment({
    method: COMMISSION_METHOD.REMAINING_PERCENTAGE,
    remainingKurus: 1000000,
    patientCollectedKurus: 5000000,
    percentageBasisPoints: 10001
  }), RangeError);
});

test("manuel komisyon kalan tutardan büyükse reddeder", () => {
  assert.throws(() => calculateDoctorPayment({
    method: COMMISSION_METHOD.MANUAL_FIXED,
    remainingKurus: 100000,
    patientCollectedKurus: 5000000,
    manualAmountKurus: 100001
  }), RangeError);
});

test("Türkçe para formatındaki manuel tutarla mali özeti hesaplar", () => {
  const summary = calculateFinancialSummary({
    calculation: surgeryCalculation(),
    patientCollectedKurus: 7000000,
    commission: {
      method: COMMISSION_METHOD.MANUAL_FIXED,
      manualAmountKurus: parseTurkishMoneyToKurus("500,50")
    }
  });
  assert.equal(summary.amounts.remainingKurus, 1080000);
  assert.equal(summary.amounts.doctorCommissionKurus, 50050);
  assert.equal(summary.amounts.doctorNetPaymentKurus, 1029950);
});
