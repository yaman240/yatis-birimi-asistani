import test from "node:test";
import assert from "node:assert/strict";

import {
  ACCOMMODATION,
  CATEGORY,
  OBSTETRICS_PROCEDURE,
  calculateDurationMinutes,
  calculateGuestPhysician
} from "../guest-physician/calculation-engine.js";

test("aynı gün anestezi süresini tam dakika hesaplar", () => {
  assert.equal(calculateDurationMinutes("09:15", "10:40"), 85);
});

test("gece yarısını geçen ameliyat süresini destekler", () => {
  assert.equal(calculateDurationMinutes("23:40", "00:20"), 40);
});

test("eşit başlangıç ve bitiş saatini reddeder", () => {
  assert.throws(() => calculateDurationMinutes("10:00", "10:00"), RangeError);
});

test("saniye veya geçersiz saat girişini reddeder", () => {
  assert.throws(() => calculateDurationMinutes("09:00:30", "10:00"), TypeError);
  assert.throws(() => calculateDurationMinutes("24:00", "01:00"), TypeError);
});

test("Cerrahi ilk 60 dakikada yalnızca sabit bedeli uygular", () => {
  const result = calculateGuestPhysician({
    category: CATEGORY.SURGERY,
    anesthesiaStart: "09:00",
    anesthesiaEnd: "10:00"
  });
  assert.equal(result.timing.durationMinutes, 60);
  assert.equal(result.amounts.mainServiceKurus, 3500000);
  assert.equal(result.amounts.grossTotalKurus, 3500000);
});

test("Cerrahi 60 dakika üzerini dakika başına 200 TL hesaplar", () => {
  const result = calculateGuestPhysician({
    category: CATEGORY.SURGERY,
    anesthesiaStart: "09:00",
    anesthesiaEnd: "10:35"
  });
  assert.equal(result.timing.excessMinutes, 35);
  assert.equal(result.amounts.excessDurationKurus, 700000);
  assert.equal(result.amounts.mainServiceKurus, 4200000);
});

test("Cerrahi oda türlerini tarifeye göre hesaplar", () => {
  const oneDay = calculateGuestPhysician({
    category: CATEGORY.SURGERY,
    anesthesiaStart: "09:00",
    anesthesiaEnd: "09:30",
    accommodation: ACCOMMODATION.PRIVATE_ROOM_ONE_DAY
  });
  const dayCase = calculateGuestPhysician({
    category: CATEGORY.SURGERY,
    anesthesiaStart: "09:00",
    anesthesiaEnd: "09:30",
    accommodation: ACCOMMODATION.PRIVATE_ROOM_DAY_CASE
  });
  const observation = calculateGuestPhysician({
    category: CATEGORY.SURGERY,
    anesthesiaStart: "09:00",
    anesthesiaEnd: "09:30",
    accommodation: ACCOMMODATION.OBSERVATION_DAY_CASE
  });
  assert.equal(oneDay.amounts.accommodationKurus, 1000000);
  assert.equal(dayCase.amounts.accommodationKurus, 500000);
  assert.equal(observation.amounts.accommodationKurus, 0);
});

test("mesai dışı %20 yalnızca Cerrahi ana bedeline uygulanır, oda matraha girmez", () => {
  const result = calculateGuestPhysician({
    category: CATEGORY.SURGERY,
    anesthesiaStart: "09:00",
    anesthesiaEnd: "10:35",
    accommodation: ACCOMMODATION.PRIVATE_ROOM_ONE_DAY,
    outsideWorkingHours: true
  });
  assert.equal(result.amounts.mainServiceKurus, 4200000);
  assert.equal(result.amounts.accommodationKurus, 1000000);
  assert.equal(result.amounts.outsideWorkingHoursSurchargeKurus, 840000);
  assert.equal(result.amounts.grossTotalKurus, 6040000);
});

test("Diş/KBB ilk 60 dakikada sabit bedeli uygular", () => {
  const result = calculateGuestPhysician({
    category: CATEGORY.DENTAL_ENT,
    anesthesiaStart: "11:00",
    anesthesiaEnd: "11:45"
  });
  assert.equal(result.amounts.mainServiceKurus, 2000000);
});

test("Diş/KBB 10.000/60 oranını erken yuvarlamadan hesaplar", () => {
  const result = calculateGuestPhysician({
    category: CATEGORY.DENTAL_ENT,
    anesthesiaStart: "09:00",
    anesthesiaEnd: "10:03"
  });
  assert.equal(result.timing.excessMinutes, 3);
  assert.equal(result.amounts.excessDurationKurus, 50000);
  assert.equal(result.amounts.mainServiceKurus, 2050000);
});

test("Diş/KBB nihai fazla süre satırını kuruşa yarım-yukarı yuvarlar", () => {
  const result = calculateGuestPhysician({
    category: CATEGORY.DENTAL_ENT,
    anesthesiaStart: "09:00",
    anesthesiaEnd: "10:01"
  });
  assert.equal(result.amounts.excessDurationKurus, 16667);
  assert.equal(result.amounts.mainServiceKurus, 2016667);
});

test("Diş/KBB oda bedellerini ve ücretsiz müşahedeyi hesaplar", () => {
  const oneDay = calculateGuestPhysician({
    category: CATEGORY.DENTAL_ENT,
    anesthesiaStart: "09:00",
    anesthesiaEnd: "09:30",
    accommodation: ACCOMMODATION.PRIVATE_ROOM_ONE_DAY
  });
  const dayCase = calculateGuestPhysician({
    category: CATEGORY.DENTAL_ENT,
    anesthesiaStart: "09:00",
    anesthesiaEnd: "09:30",
    accommodation: ACCOMMODATION.PRIVATE_ROOM_DAY_CASE
  });
  const observation = calculateGuestPhysician({
    category: CATEGORY.DENTAL_ENT,
    anesthesiaStart: "09:00",
    anesthesiaEnd: "09:30",
    accommodation: ACCOMMODATION.OBSERVATION_DAY_CASE
  });
  assert.equal(oneDay.amounts.accommodationKurus, 500000);
  assert.equal(dayCase.amounts.accommodationKurus, 250000);
  assert.equal(observation.amounts.accommodationKurus, 0);
});

test("Diş/KBB mesai dışı ilavesinde oda matraha girmez", () => {
  const result = calculateGuestPhysician({
    category: CATEGORY.DENTAL_ENT,
    anesthesiaStart: "09:00",
    anesthesiaEnd: "10:30",
    accommodation: ACCOMMODATION.PRIVATE_ROOM_ONE_DAY,
    outsideWorkingHours: true
  });
  assert.equal(result.amounts.mainServiceKurus, 2500000);
  assert.equal(result.amounts.outsideWorkingHoursSurchargeKurus, 500000);
  assert.equal(result.amounts.grossTotalKurus, 3500000);
});

test("Kadın Doğum sabit işlem fiyatlarını hesaplar", () => {
  const expected = new Map([
    [OBSTETRICS_PROCEDURE.CESAREAN, 3400000],
    [OBSTETRICS_PROCEDURE.NORMAL_DELIVERY, 2800000],
    [OBSTETRICS_PROCEDURE.CURETTAGE_OTHER, 2400000]
  ]);
  for (const [procedureCode, amount] of expected) {
    const result = calculateGuestPhysician({
      category: CATEGORY.OBSTETRICS,
      procedureCode
    });
    assert.equal(result.amounts.mainServiceKurus, amount);
    assert.equal(result.timing.durationMinutes, null);
  }
});

test("Kadın Doğum mesai dışı %20 ilavesini ana işlem bedeline uygular", () => {
  const result = calculateGuestPhysician({
    category: CATEGORY.OBSTETRICS,
    procedureCode: OBSTETRICS_PROCEDURE.CESAREAN,
    outsideWorkingHours: true
  });
  assert.equal(result.amounts.outsideWorkingHoursSurchargeKurus, 680000);
  assert.equal(result.amounts.grossTotalKurus, 4080000);
});

test("2026 Kadın Doğum tarifesinde oda seçimini reddeder", () => {
  assert.throws(() => calculateGuestPhysician({
    category: CATEGORY.OBSTETRICS,
    procedureCode: OBSTETRICS_PROCEDURE.CESAREAN,
    accommodation: ACCOMMODATION.PRIVATE_ROOM_ONE_DAY
  }), RangeError);
});

test("SGK seçeneğini ve bilinmeyen kategoriyi reddeder", () => {
  assert.throws(() => calculateGuestPhysician({
    category: CATEGORY.SURGERY,
    anesthesiaStart: "09:00",
    anesthesiaEnd: "10:00",
    sgk: true
  }), RangeError);
  assert.throws(() => calculateGuestPhysician({ category: "unknown" }), RangeError);
});

