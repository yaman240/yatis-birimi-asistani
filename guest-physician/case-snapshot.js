import { ENGINE_VERSION, TARIFF_2026_V1 } from "./calculation-engine.js";

const clone = value => structuredClone(value);

export const buildCaseSnapshot = ({
  caseNumber,
  formData,
  calculation,
  financialSummary,
  commissionInput,
  tariff = TARIFF_2026_V1
}) => {
  if (!calculation?.amounts || !financialSummary?.amounts) {
    throw new TypeError("Kaydetmek için geçerli hesaplama ve mali özet gereklidir.");
  }
  const tariffSnapshot = clone(tariff);
  const calculationSnapshot = clone({
    input: formData,
    tariff: tariffSnapshot,
    calculation,
    financialSummary,
    commissionInput
  });
  return {
    caseNumber,
    tariff: {
      tariffId: tariff.tariffId,
      tariffCode: tariff.tariffCode,
      version: tariff.version
    },
    category: calculation.category,
    procedureCode: calculation.procedureCode,
    patient: { name: formData.patientName, protocolNumber: formData.protocolNumber },
    physician: { name: formData.physicianName },
    timing: {
      procedureDate: formData.procedureDate,
      anesthesiaStart: calculation.timing.anesthesiaStart,
      anesthesiaEnd: calculation.timing.anesthesiaEnd,
      durationMinutes: calculation.timing.durationMinutes
    },
    accommodation: { type: calculation.accommodation },
    options: {
      outsideWorkingHours: calculation.outsideWorkingHours,
      sgk: false,
      commission: clone(commissionInput)
    },
    lineItems: financialSummary.extraItems.map((item, index) => ({
      id: `extra-${index + 1}`,
      type: item.type,
      code: "CUSTOM",
      label: item.description,
      quantity: item.quantity,
      unitAmountKurus: item.unitPriceKurus,
      amountKurus: item.totalKurus,
      surchargeEligible: false,
      note: ""
    })),
    totals: clone(financialSummary.amounts),
    tariffSnapshot,
    calculation: { engineVersion: calculation.engineVersion || ENGINE_VERSION, roundingMode: "half_up_to_kurus" },
    calculationSnapshot,
    notes: formData.notes || ""
  };
};
