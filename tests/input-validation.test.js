import test from "node:test";
import assert from "node:assert/strict";

import { COMMISSION_METHOD } from "../guest-physician/financial-summary.js";
import {
  UserInputError,
  validateCommissionDraft,
  validateDurationValues,
  validateExtraItemDraft,
  validatePatientCollected
} from "../guest-physician/input-validation.js";

test("gece yarısı geçişini ve toplam dakikayı kullanıcı doğrulamasında belirtir", () => {
  const result = validateDurationValues("23:30", "01:00");
  assert.equal(result.durationMinutes, 90);
  assert.equal(result.crossesMidnight, true);
});

test("12 saati aşan süreyi uzun işlem olarak işaretler", () => {
  assert.equal(validateDurationValues("08:00", "21:00").unusuallyLong, true);
});

test("eksik ve aynı saatlere alan bazlı Türkçe hata verir", () => {
  assert.throws(() => validateDurationValues("", "10:00"), UserInputError);
  assert.throws(() => validateDurationValues("10:00", "10:00"), /aynı olamaz/);
});

test("boş ek kalem ve hatalı Türkçe fiyatı açıkça reddeder", () => {
  assert.throws(() => validateExtraItemDraft({ quantityText: "1", unitPriceText: "" }, 0), /boş satırı silin/);
  assert.throws(() => validateExtraItemDraft({ quantityText: "1", unitPriceText: "12.50" }, 0), /Türkçe para/);
});

test("sıfır ve kesirli ek kalem adedini reddeder", () => {
  assert.throws(() => validateExtraItemDraft({ quantityText: "0", unitPriceText: "10,00" }, 0), /pozitif|1 veya/);
  assert.throws(() => validateExtraItemDraft({ quantityText: "1.5", unitPriceText: "10,00" }, 0), /tam sayı/);
});

test("hatalı tahsilat ve komisyon girişlerini kullanıcı mesajıyla reddeder", () => {
  assert.throws(() => validatePatientCollected("10.50"), /Türkçe para/);
  assert.throws(() => validateCommissionDraft({
    method: COMMISSION_METHOD.REMAINING_PERCENTAGE,
    percentageText: "101",
    hasCollection: true
  }), /0 ile 100/);
  assert.throws(() => validateCommissionDraft({
    method: COMMISSION_METHOD.MANUAL_FIXED,
    manualText: "",
    hasCollection: true
  }), /Manuel doktor payı/);
});

