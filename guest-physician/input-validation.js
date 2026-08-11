import { calculateDurationMinutes } from "./calculation-engine.js";
import {
  COMMISSION_METHOD,
  parsePercentageToBasisPoints,
  parseTurkishMoneyToKurus
} from "./financial-summary.js";

export const LONG_OPERATION_MINUTES = 12 * 60;

export class UserInputError extends Error {
  constructor(message, fieldId = null) {
    super(message);
    this.name = "UserInputError";
    this.fieldId = fieldId;
  }
}

export const validateDurationValues = (start, end) => {
  if (!start) throw new UserInputError("Anestezi başlangıç saatini girin.", "anesthesiaStart");
  if (!end) throw new UserInputError("Anestezi bitiş saatini girin.", "anesthesiaEnd");
  let durationMinutes;
  try {
    durationMinutes = calculateDurationMinutes(start, end);
  } catch {
    throw new UserInputError(
      start === end
        ? "Başlangıç ve bitiş saati aynı olamaz. Saatleri kontrol edin."
        : "Anestezi saatlerini saat ve dakika biçiminde kontrol edin.",
      "anesthesiaEnd"
    );
  }
  return {
    durationMinutes,
    crossesMidnight: end < start,
    unusuallyLong: durationMinutes > LONG_OPERATION_MINUTES
  };
};

export const validateExtraItemDraft = (draft, index) => {
  const prefix = `${index + 1}. ek kalem`;
  const quantity = Number(draft.quantityText);
  if (!draft.quantityText || !Number.isSafeInteger(quantity) || quantity <= 0) {
    throw new UserInputError(`${prefix} için adet 1 veya daha büyük tam sayı olmalıdır.`, draft.quantityFieldId);
  }
  if (!String(draft.unitPriceText || "").trim()) {
    throw new UserInputError(`${prefix} için birim fiyat girin veya boş satırı silin.`, draft.unitPriceFieldId);
  }
  let unitPriceKurus;
  try {
    unitPriceKurus = parseTurkishMoneyToKurus(draft.unitPriceText);
  } catch {
    throw new UserInputError(
      `${prefix} birim fiyatını Türkçe para biçiminde girin; ör. 1.250,50.`,
      draft.unitPriceFieldId
    );
  }
  return { quantity, unitPriceKurus };
};

export const validatePatientCollected = text => {
  if (!String(text || "").trim()) return null;
  try {
    return parseTurkishMoneyToKurus(text);
  } catch {
    throw new UserInputError(
      "Hastadan alınan tutarı Türkçe para biçiminde girin; ör. 45.000,00.",
      "patientCollected"
    );
  }
};

export const validateCommissionDraft = ({ method, percentageText, manualText, hasCollection }) => {
  const result = { method };
  if (!hasCollection || method === COMMISSION_METHOD.NONE) return result;
  if (method === COMMISSION_METHOD.REMAINING_PERCENTAGE
      || method === COMMISSION_METHOD.COLLECTED_PERCENTAGE) {
    try {
      result.percentageBasisPoints = parsePercentageToBasisPoints(percentageText);
    } catch {
      throw new UserInputError(
        "Doktor payı yüzdesini 0 ile 100 arasında ve en fazla iki ondalık basamakla girin.",
        "commissionPercentage"
      );
    }
  } else if (method === COMMISSION_METHOD.MANUAL_FIXED) {
    if (!String(manualText || "").trim()) {
      throw new UserInputError("Manuel doktor payı tutarını girin.", "commissionManualAmount");
    }
    try {
      result.manualAmountKurus = parseTurkishMoneyToKurus(manualText);
    } catch {
      throw new UserInputError(
        "Manuel doktor payını Türkçe para biçiminde girin; ör. 2.500,00.",
        "commissionManualAmount"
      );
    }
  }
  return result;
};

export const userMessageForError = error => {
  if (error instanceof UserInputError) return error.message;
  if (error instanceof RangeError && /Manuel komisyon/.test(error.message)) {
    return "Manuel doktor payı kalan tutardan büyük olamaz.";
  }
  return "Hesaplama tamamlanamadı. Kırmızı işaretli alanları kontrol edip yeniden deneyin.";
};

