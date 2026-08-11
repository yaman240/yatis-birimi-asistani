export const EXTRA_ITEM_TYPES = Object.freeze([
  { code: "erythrocyte", label: "Eritrosit" },
  { code: "ffp", label: "TDP" },
  { code: "laboratory", label: "Laboratuvar" },
  { code: "radiology", label: "Radyoloji" },
  { code: "ambulance", label: "Ambulans" },
  { code: "consultation", label: "Konsültasyon" },
  { code: "pathology", label: "Patoloji" },
  { code: "special_material", label: "Özellikli malzeme" },
  { code: "dental_consumable", label: "Diş sarfı" },
  { code: "other", label: "Diğer" }
]);

export const COMMISSION_METHOD = Object.freeze({
  NONE: "none",
  REMAINING_PERCENTAGE: "remaining_percentage",
  COLLECTED_PERCENTAGE: "collected_percentage",
  MANUAL_FIXED: "manual_fixed"
});

const TYPE_CODES = new Set(EXTRA_ITEM_TYPES.map(item => item.code));

const assertKurus = (value, name) => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${name} negatif olmayan güvenli bir tam sayı olmalıdır.`);
  }
};

const roundHalfUpDivision = (numerator, denominator) => {
  assertKurus(numerator, "Bölünen");
  if (!Number.isSafeInteger(denominator) || denominator <= 0) {
    throw new TypeError("Bölen pozitif güvenli bir tam sayı olmalıdır.");
  }
  const quotient = Math.floor(numerator / denominator);
  const remainder = numerator % denominator;
  return quotient + (remainder * 2 >= denominator ? 1 : 0);
};

export const parseTurkishMoneyToKurus = value => {
  if (typeof value !== "string") throw new TypeError("Parasal değer metin olmalıdır.");
  const cleaned = value.trim().replace(/\s+/g, "").replace(/₺|TL/gi, "");
  if (!cleaned) return null;

  const validTurkishMoney = /^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/;
  if (!validTurkishMoney.test(cleaned)) {
    throw new TypeError("Tutarı 1.234,56 biçiminde girin.");
  }

  const [wholePart, fractionPart = ""] = cleaned.split(",");
  const wholeKurus = Number(wholePart.replaceAll(".", "")) * 100;
  const fractionKurus = Number(fractionPart.padEnd(2, "0") || "0");
  const result = wholeKurus + fractionKurus;
  assertKurus(result, "Tutar");
  return result;
};

export const parsePercentageToBasisPoints = value => {
  const normalized = typeof value === "string" ? value.trim().replace(",", ".") : value;
  if (normalized === "" || normalized === null || normalized === undefined) {
    throw new TypeError("Yüzde oranını girin.");
  }
  const percentage = Number(normalized);
  if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
    throw new RangeError("Yüzde oranı 0 ile 100 arasında olmalıdır.");
  }
  const basisPoints = Math.round(percentage * 100);
  if (Math.abs(basisPoints / 100 - percentage) > Number.EPSILON * 100) {
    throw new TypeError("Yüzde oranı en fazla iki ondalık basamak içerebilir.");
  }
  return basisPoints;
};

export const calculateExtraItem = item => {
  if (!item || typeof item !== "object") throw new TypeError("Ek kalem gereklidir.");
  if (!TYPE_CODES.has(item.type)) throw new RangeError("Geçersiz ek kalem türü.");
  if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) {
    throw new TypeError("Ek kalem adedi pozitif tam sayı olmalıdır.");
  }
  assertKurus(item.unitPriceKurus, "Birim fiyat");
  const totalKurus = item.quantity * item.unitPriceKurus;
  assertKurus(totalKurus, "Ek kalem toplamı");
  return {
    type: item.type,
    description: String(item.description || "").trim(),
    quantity: item.quantity,
    unitPriceKurus: item.unitPriceKurus,
    totalKurus,
    surchargeEligible: false
  };
};

export const calculateDoctorPayment = ({
  method = COMMISSION_METHOD.NONE,
  remainingKurus,
  patientCollectedKurus,
  percentageBasisPoints = null,
  manualAmountKurus = null
}) => {
  if (!Object.values(COMMISSION_METHOD).includes(method)) {
    throw new RangeError("Geçersiz doktor payı / komisyon yöntemi.");
  }
  if (patientCollectedKurus === null) {
    return {
      status: "missing_collection",
      commissionKurus: null,
      doctorNetPaymentKurus: null,
      hasNegativeDoctorNet: false
    };
  }
  assertKurus(patientCollectedKurus, "Hastadan alınan tutar");
  if (!Number.isSafeInteger(remainingKurus)) throw new TypeError("Kalan tutar güvenli bir tam sayı olmalıdır.");
  if (remainingKurus < 0) {
    return {
      status: "negative_remaining",
      commissionKurus: null,
      doctorNetPaymentKurus: null,
      hasNegativeDoctorNet: false
    };
  }

  let commissionKurus = 0;
  if (method === COMMISSION_METHOD.REMAINING_PERCENTAGE
      || method === COMMISSION_METHOD.COLLECTED_PERCENTAGE) {
    if (!Number.isSafeInteger(percentageBasisPoints)
        || percentageBasisPoints < 0
        || percentageBasisPoints > 10000) {
      throw new RangeError("Yüzde oranı 0 ile 100 arasında olmalıdır.");
    }
    const calculationBaseKurus = method === COMMISSION_METHOD.REMAINING_PERCENTAGE
      ? remainingKurus
      : patientCollectedKurus;
    commissionKurus = roundHalfUpDivision(calculationBaseKurus * percentageBasisPoints, 10000);
  } else if (method === COMMISSION_METHOD.MANUAL_FIXED) {
    assertKurus(manualAmountKurus, "Manuel komisyon tutarı");
    if (manualAmountKurus > remainingKurus) {
      throw new RangeError("Manuel komisyon tutarı kalan tutardan büyük olamaz.");
    }
    commissionKurus = manualAmountKurus;
  }

  const doctorNetPaymentKurus = remainingKurus - commissionKurus;
  return {
    status: "calculated",
    commissionKurus,
    doctorNetPaymentKurus,
    hasNegativeDoctorNet: doctorNetPaymentKurus < 0
  };
};

export const calculateFinancialSummary = ({
  calculation,
  extraItems = [],
  patientCollectedKurus = null,
  commission = { method: COMMISSION_METHOD.NONE }
}) => {
  if (!calculation?.amounts) throw new TypeError("Geçerli bir tarife hesaplaması gereklidir.");

  const mainServiceKurus = calculation.amounts.mainServiceKurus;
  const accommodationKurus = calculation.amounts.accommodationKurus;
  const outsideWorkingHoursSurchargeKurus = calculation.amounts.outsideWorkingHoursSurchargeKurus;
  const tariffGrossKurus = calculation.amounts.grossTotalKurus;
  [
    [mainServiceKurus, "Ana işlem bedeli"],
    [accommodationKurus, "Oda bedeli"],
    [outsideWorkingHoursSurchargeKurus, "Mesai dışı fark"],
    [tariffGrossKurus, "Tarife toplamı"]
  ].forEach(([value, name]) => assertKurus(value, name));

  const calculatedItems = extraItems.map(calculateExtraItem);
  const extraItemsTotalKurus = calculatedItems.reduce((sum, item) => sum + item.totalKurus, 0);
  assertKurus(extraItemsTotalKurus, "Ek kalemler toplamı");

  // Ek kalemler tarife motorunun ürettiği mesai dışı farkı değiştirmez.
  const hospitalTotalKurus = tariffGrossKurus + extraItemsTotalKurus;
  assertKurus(hospitalTotalKurus, "Hastane toplam bedeli");

  if (patientCollectedKurus !== null) assertKurus(patientCollectedKurus, "Hastadan alınan tutar");
  const remainingKurus = patientCollectedKurus === null
    ? null
    : patientCollectedKurus - hospitalTotalKurus;

  const doctorPayment = calculateDoctorPayment({
    method: commission.method,
    remainingKurus,
    patientCollectedKurus,
    percentageBasisPoints: commission.percentageBasisPoints ?? null,
    manualAmountKurus: commission.manualAmountKurus ?? null
  });

  return {
    extraItems: calculatedItems,
    amounts: {
      mainServiceKurus,
      accommodationKurus,
      outsideWorkingHoursSurchargeKurus,
      extraItemsTotalKurus,
      hospitalTotalKurus,
      patientCollectedKurus,
      remainingKurus,
      doctorCommissionKurus: doctorPayment.commissionKurus,
      doctorNetPaymentKurus: doctorPayment.doctorNetPaymentKurus
    },
    hasNegativeRemaining: remainingKurus !== null && remainingKurus < 0,
    commission: {
      method: commission.method,
      status: doctorPayment.status,
      hasNegativeDoctorNet: doctorPayment.hasNegativeDoctorNet
    }
  };
};
