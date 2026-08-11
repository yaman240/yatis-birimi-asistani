export const ENGINE_VERSION = "1.0.0";

export const CATEGORY = Object.freeze({
  SURGERY: "surgery",
  DENTAL_ENT: "dentalEnt",
  OBSTETRICS: "obstetrics"
});

export const ACCOMMODATION = Object.freeze({
  NONE: "none",
  PRIVATE_ROOM_ONE_DAY: "private_room_one_day",
  PRIVATE_ROOM_DAY_CASE: "private_room_day_case",
  OBSERVATION_DAY_CASE: "observation_day_case"
});

export const OBSTETRICS_PROCEDURE = Object.freeze({
  CESAREAN: "cesarean",
  NORMAL_DELIVERY: "normalDelivery",
  CURETTAGE_OTHER: "curettageOther"
});

const deepFreeze = value => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
};

export const TARIFF_2026_V1 = deepFreeze({
  schemaVersion: 1,
  tariffId: "2026-v1",
  tariffCode: "GUEST_PHYSICIAN_2026",
  version: 1,
  currency: "TRY",
  restrictions: {
    privatePayOnly: true,
    sgkAllowed: false
  },
  surcharges: {
    outsideWorkingHours: {
      rateBasisPoints: 2000,
      calculationBase: "main_service_only"
    }
  },
  categories: {
    surgery: {
      calculationType: "operating_room_duration",
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
      calculationType: "operating_room_duration",
      includedMinutes: 60,
      baseFeeKurus: 2000000,
      excessRate: {
        numeratorKurus: 1000000,
        denominatorMinutes: 60
      },
      roomFees: {
        private_room_one_day: 500000,
        private_room_day_case: 250000,
        observation_day_case: 0
      }
    },
    obstetrics: {
      calculationType: "fixed_procedure",
      procedures: {
        cesarean: { feeKurus: 3400000 },
        normalDelivery: { feeKurus: 2800000 },
        curettageOther: { feeKurus: 2400000 }
      },
      roomFees: null
    }
  }
});

const assertSafeNonNegativeInteger = (value, name) => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${name} negatif olmayan güvenli bir tam sayı olmalıdır.`);
  }
};

const roundHalfUpDivision = (numerator, denominator) => {
  assertSafeNonNegativeInteger(numerator, "Bölünen");
  if (!Number.isSafeInteger(denominator) || denominator <= 0) {
    throw new TypeError("Bölen pozitif güvenli bir tam sayı olmalıdır.");
  }
  const quotient = Math.floor(numerator / denominator);
  const remainder = numerator % denominator;
  return quotient + (remainder * 2 >= denominator ? 1 : 0);
};

const parseTime = value => {
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw new TypeError("Saat HH:mm biçiminde ve saat/dakika sınırları içinde olmalıdır.");
  }
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
};

export const calculateDurationMinutes = (start, end) => {
  const startMinutes = parseTime(start);
  const endMinutes = parseTime(end);
  if (startMinutes === endMinutes) {
    throw new RangeError("Anestezi başlangıç ve bitiş saati aynı olamaz.");
  }
  return endMinutes > startMinutes
    ? endMinutes - startMinutes
    : 24 * 60 - startMinutes + endMinutes;
};

const calculateAccommodation = (categoryTariff, accommodation) => {
  if (accommodation === ACCOMMODATION.NONE) return 0;
  if (!categoryTariff.roomFees) {
    throw new RangeError("Seçilen kategori için bu tarife sürümünde oda bedeli tanımlı değildir.");
  }
  if (!Object.hasOwn(categoryTariff.roomFees, accommodation)) {
    throw new RangeError("Geçersiz oda seçimi.");
  }
  const amount = categoryTariff.roomFees[accommodation];
  assertSafeNonNegativeInteger(amount, "Oda bedeli");
  return amount;
};

const calculateDurationService = (category, categoryTariff, start, end) => {
  const durationMinutes = calculateDurationMinutes(start, end);
  const { includedMinutes, baseFeeKurus } = categoryTariff;
  assertSafeNonNegativeInteger(includedMinutes, "Dahil süre");
  assertSafeNonNegativeInteger(baseFeeKurus, "Sabit bedel");
  if (includedMinutes === 0) throw new RangeError("Dahil süre sıfır olamaz.");

  const excessMinutes = Math.max(0, durationMinutes - includedMinutes);
  let excessAmountKurus = 0;

  if (category === CATEGORY.SURGERY) {
    assertSafeNonNegativeInteger(categoryTariff.excessMinuteFeeKurus, "Dakika bedeli");
    excessAmountKurus = excessMinutes * categoryTariff.excessMinuteFeeKurus;
    assertSafeNonNegativeInteger(excessAmountKurus, "Fazla süre bedeli");
  } else {
    const { numeratorKurus, denominatorMinutes } = categoryTariff.excessRate;
    assertSafeNonNegativeInteger(numeratorKurus, "Saatlik oran payı");
    assertSafeNonNegativeInteger(denominatorMinutes, "Saatlik oran paydası");
    excessAmountKurus = roundHalfUpDivision(
      excessMinutes * numeratorKurus,
      denominatorMinutes
    );
  }

  return {
    durationMinutes,
    excessMinutes,
    baseFeeKurus,
    excessAmountKurus,
    mainServiceKurus: baseFeeKurus + excessAmountKurus
  };
};

const calculateFixedService = (categoryTariff, procedureCode) => {
  const procedure = categoryTariff.procedures?.[procedureCode];
  if (!procedure) throw new RangeError("Geçersiz Kadın Doğum işlem kodu.");
  assertSafeNonNegativeInteger(procedure.feeKurus, "İşlem bedeli");
  return {
    durationMinutes: null,
    excessMinutes: 0,
    baseFeeKurus: procedure.feeKurus,
    excessAmountKurus: 0,
    mainServiceKurus: procedure.feeKurus
  };
};

export const calculateGuestPhysician = (input, tariff = TARIFF_2026_V1) => {
  if (!input || typeof input !== "object") throw new TypeError("Hesaplama girdisi gereklidir.");
  const categoryTariff = tariff.categories?.[input.category];
  if (!categoryTariff) throw new RangeError("Geçersiz misafir hekim kategorisi.");
  if (input.sgk === true || tariff.restrictions?.sgkAllowed !== false) {
    throw new RangeError("Misafir hekim işlemleri SGK kapsamında açılamaz.");
  }

  const accommodation = input.accommodation ?? ACCOMMODATION.NONE;
  const service = categoryTariff.calculationType === "operating_room_duration"
    ? calculateDurationService(
        input.category,
        categoryTariff,
        input.anesthesiaStart,
        input.anesthesiaEnd
      )
    : calculateFixedService(categoryTariff, input.procedureCode);

  const accommodationKurus = calculateAccommodation(categoryTariff, accommodation);
  const surchargeRate = input.outsideWorkingHours
    ? tariff.surcharges.outsideWorkingHours.rateBasisPoints
    : 0;
  assertSafeNonNegativeInteger(surchargeRate, "Mesai dışı ilave oranı");

  // İlave yalnızca ana işlem bedelinden hesaplanır; oda ve ek kalemler matraha girmez.
  const outsideWorkingHoursSurchargeKurus = roundHalfUpDivision(
    service.mainServiceKurus * surchargeRate,
    10000
  );
  const grossTotalKurus = service.mainServiceKurus
    + accommodationKurus
    + outsideWorkingHoursSurchargeKurus;

  return {
    engineVersion: ENGINE_VERSION,
    tariff: {
      tariffId: tariff.tariffId,
      tariffCode: tariff.tariffCode,
      version: tariff.version
    },
    category: input.category,
    procedureCode: input.procedureCode ?? null,
    timing: {
      anesthesiaStart: input.anesthesiaStart ?? null,
      anesthesiaEnd: input.anesthesiaEnd ?? null,
      durationMinutes: service.durationMinutes,
      excessMinutes: service.excessMinutes
    },
    accommodation,
    outsideWorkingHours: Boolean(input.outsideWorkingHours),
    amounts: {
      baseFeeKurus: service.baseFeeKurus,
      excessDurationKurus: service.excessAmountKurus,
      mainServiceKurus: service.mainServiceKurus,
      accommodationKurus,
      outsideWorkingHoursSurchargeKurus,
      grossTotalKurus
    },
    roundingMode: "half_up_to_kurus"
  };
};

