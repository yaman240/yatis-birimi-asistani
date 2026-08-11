import {
  ACCOMMODATION,
  CATEGORY,
  calculateGuestPhysician
} from "./calculation-engine.js";
import {
  COMMISSION_METHOD,
  EXTRA_ITEM_TYPES,
  calculateExtraItem,
  calculateFinancialSummary,
  parseTurkishMoneyToKurus
} from "./financial-summary.js";
import {
  UserInputError,
  userMessageForError,
  validateCommissionDraft,
  validateDurationValues,
  validateExtraItemDraft,
  validatePatientCollected
} from "./input-validation.js";
import { buildCaseSnapshot } from "./case-snapshot.js";
import { CaseWorkflow } from "./case-workflow.js";
import { createLocalRepositoryRuntime } from "./repository-runtime.js";
import { CASE_STATUS } from "./repository-utils.js";
import { buildPrintReportModel, renderPrintReportHtml } from "./print-report.js";

const form = document.getElementById("calculationForm");
const categoryElement = document.getElementById("category");
const durationFields = document.getElementById("durationFields");
const obstetricsFields = document.getElementById("obstetricsFields");
const startElement = document.getElementById("anesthesiaStart");
const endElement = document.getElementById("anesthesiaEnd");
const durationValue = document.getElementById("durationValue");
const formError = document.getElementById("formError");
const resultCard = document.getElementById("resultCard");
const extraItemsElement = document.getElementById("extraItems");
const patientCollectedElement = document.getElementById("patientCollected");
const commissionMethodElement = document.getElementById("commissionMethod");
const commissionPercentageElement = document.getElementById("commissionPercentage");
const commissionManualElement = document.getElementById("commissionManualAmount");
let extraItemSequence = 0;
let workflow;
let activeTariff;
let lastCalculation = null;
let lastFinancialSummary = null;
let lastCommissionInput = null;
let hasUnsavedChanges = true;
let currentRuntime;

const caseStatusBadge = document.getElementById("caseStatusBadge");
const caseActionMessage = document.getElementById("caseActionMessage");
const saveDraftButton = document.getElementById("saveDraftButton");
const finalizeCaseButton = document.getElementById("finalizeCaseButton");
const cancelCaseButton = document.getElementById("cancelCaseButton");
const environmentModeElement = document.getElementById("environmentMode");
const stagingProjectIdElement = document.getElementById("stagingProjectId");
const connectEnvironmentButton = document.getElementById("connectEnvironmentButton");
const connectionBadge = document.getElementById("connectionBadge");
const activeProjectLabel = document.getElementById("activeProjectLabel");
const printReportButton = document.getElementById("printReportButton");
const printReportElement = document.getElementById("printReport");
const embeddedMode = new URLSearchParams(window.location.search).get("embedded") === "1";
if (embeddedMode) {
  document.body.classList.add("embedded-mode");
  environmentModeElement.value = "local";
  environmentModeElement.disabled = true;
}

const moneyFormatter = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});
const inputMoneyFormatter = new Intl.NumberFormat("tr-TR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const formatKurus = value => moneyFormatter.format(value / 100);
const formatMoneyInput = value => inputMoneyFormatter.format(value / 100);

const clearInvalidFields = () => {
  form.querySelectorAll('[aria-invalid="true"]').forEach(element => element.removeAttribute("aria-invalid"));
};

const showError = (message, fieldId = null) => {
  formError.textContent = message;
  formError.hidden = false;
  if (fieldId) {
    const field = document.getElementById(fieldId);
    if (field) {
      field.setAttribute("aria-invalid", "true");
      field.focus();
    }
  }
};

const clearError = () => {
  formError.textContent = "";
  formError.hidden = true;
  clearInvalidFields();
};

const hideResult = () => {
  resultCard.hidden = true;
  printReportButton.disabled = true;
  lastCalculation = null;
  lastFinancialSummary = null;
  lastCommissionInput = null;
};

const showCaseMessage = (message, isError = false) => {
  caseActionMessage.textContent = message;
  caseActionMessage.hidden = false;
  caseActionMessage.style.color = isError ? "#a62f2f" : "";
  caseActionMessage.style.background = isError ? "#fff0f0" : "";
};

const updateCaseControls = () => {
  const status = workflow?.currentCase?.status || "new";
  const labels = { new: "Yeni", draft: "Taslak", finalized: "Kesinleşmiş", cancelled: "İptal" };
  caseStatusBadge.textContent = labels[status];
  caseStatusBadge.className = `case-status-badge status-${status}`;
  const locked = [CASE_STATUS.FINALIZED, CASE_STATUS.CANCELLED].includes(status);
  [...form.elements].forEach(element => { element.disabled = locked; });
  form.classList.toggle("case-locked", locked);
  saveDraftButton.disabled = locked || !workflow;
  finalizeCaseButton.disabled = status !== CASE_STATUS.DRAFT || hasUnsavedChanges;
  cancelCaseButton.disabled = ![CASE_STATUS.DRAFT, CASE_STATUS.FINALIZED].includes(status);
};

const markDirty = () => {
  hasUnsavedChanges = true;
  caseActionMessage.hidden = true;
  updateCaseControls();
};

const updateDurationPreview = () => {
  const durationInfo = document.getElementById("durationInfo");
  if (categoryElement.value === CATEGORY.OBSTETRICS || !startElement.value || !endElement.value) {
    durationValue.textContent = "—";
    durationInfo.hidden = true;
    return;
  }
  try {
    const status = validateDurationValues(startElement.value, endElement.value);
    durationValue.textContent = `${status.durationMinutes} dakika`;
    const messages = [];
    if (status.crossesMidnight) messages.push("İşlem ertesi güne geçti.");
    if (status.unusuallyLong) messages.push("Süre 12 saatten uzun; başlangıç ve bitiş saatlerini tekrar kontrol edin.");
    durationInfo.textContent = messages.join(" ");
    durationInfo.classList.toggle("long-warning", status.unusuallyLong);
    durationInfo.hidden = messages.length === 0;
    clearError();
  } catch {
    durationValue.textContent = "—";
    durationInfo.hidden = true;
  }
};

const updateCategoryFields = () => {
  const isObstetrics = categoryElement.value === CATEGORY.OBSTETRICS;
  durationFields.hidden = isObstetrics;
  obstetricsFields.hidden = !isObstetrics;
  startElement.required = !isObstetrics;
  endElement.required = !isObstetrics;
  if (isObstetrics) {
    startElement.value = "";
    endElement.value = "";
    document.getElementById("accommodation").value = ACCOMMODATION.NONE;
  } else {
    document.getElementById("procedureCode").value = "cesarean";
  }
  clearError();
  hideResult();
  updateDurationPreview();
  document.querySelectorAll("[data-category-choice]").forEach(button => {
    button.classList.toggle("active", button.dataset.categoryChoice === categoryElement.value);
    button.setAttribute("aria-pressed", String(button.dataset.categoryChoice === categoryElement.value));
  });
  document.querySelectorAll("[data-category-warning]").forEach(warning => {
    warning.hidden = warning.dataset.categoryWarning !== categoryElement.value;
  });
};

const accommodationText = result => {
  if (result.category === CATEGORY.OBSTETRICS) return "Uygulanmaz";
  return formatKurus(result.amounts.accommodationKurus);
};

const getExtraItemRows = () => [...extraItemsElement.querySelectorAll(".extra-item")];

const readExtraItem = (row, strict = true) => {
  const quantityElement = row.querySelector("[data-field='quantity']");
  const priceElement = row.querySelector("[data-field='unitPrice']");
  const quantity = Number(quantityElement.value);
  const priceText = priceElement.value;
  if (!strict && (!priceText.trim() || !Number.isSafeInteger(quantity) || quantity <= 0)) return null;
  const index = getExtraItemRows().indexOf(row);
  const validated = validateExtraItemDraft({
    quantityText: quantityElement.value,
    unitPriceText: priceText,
    quantityFieldId: quantityElement.id,
    unitPriceFieldId: priceElement.id
  }, index);
  return calculateExtraItem({
    type: row.querySelector("[data-field='type']").value,
    description: row.querySelector("[data-field='description']").value,
    quantity: validated.quantity,
    unitPriceKurus: validated.unitPriceKurus
  });
};

const updateExtrasPreview = () => {
  let total = 0;
  getExtraItemRows().forEach(row => {
    const totalElement = row.querySelector("[data-field='total']");
    try {
      const item = readExtraItem(row, false);
      totalElement.textContent = formatKurus(item?.totalKurus ?? 0);
      total += item?.totalKurus ?? 0;
    } catch {
      totalElement.textContent = "Kontrol edin";
    }
  });
  document.getElementById("extrasPreviewTotal").textContent = formatKurus(total);
};

const createExtraItemRow = () => {
  extraItemSequence += 1;
  const row = document.createElement("div");
  row.className = "extra-item";
  row.dataset.itemId = String(extraItemSequence);

  const typeOptions = EXTRA_ITEM_TYPES
    .map(item => `<option value="${item.code}">${item.label}</option>`)
    .join("");
  row.innerHTML = `
    <div class="extra-item-field type-field">
      <label for="extraType${extraItemSequence}">Tür <span class="required-mark" aria-label="zorunlu">*</span></label>
      <select id="extraType${extraItemSequence}" data-field="type">${typeOptions}</select>
    </div>
    <div class="extra-item-field description-field">
      <label for="extraDescription${extraItemSequence}">Açıklama</label>
      <input id="extraDescription${extraItemSequence}" data-field="description" type="text" autocomplete="off">
    </div>
    <div class="extra-item-field">
      <label for="extraQuantity${extraItemSequence}">Adet <span class="required-mark" aria-label="zorunlu">*</span></label>
      <input id="extraQuantity${extraItemSequence}" data-field="quantity" type="number" min="1" step="1" value="1" inputmode="numeric">
    </div>
    <div class="extra-item-field">
      <label for="extraUnitPrice${extraItemSequence}">Birim fiyat <span class="required-mark" aria-label="zorunlu">*</span></label>
      <input id="extraUnitPrice${extraItemSequence}" data-field="unitPrice" type="text" inputmode="decimal" placeholder="0,00" autocomplete="off">
    </div>
    <div class="extra-item-field">
      <label>Toplam</label>
      <output class="extra-item-total" data-field="total">${formatKurus(0)}</output>
    </div>
    <button class="remove-extra-button" type="button" aria-label="Ek kalemi sil" title="Kalemi sil">×</button>
  `;
  extraItemsElement.appendChild(row);
  row.querySelector("[data-field='type']").focus();
  updateExtrasPreview();
};

const readExtraItems = () => getExtraItemRows().map(row => readExtraItem(row));

const normalizeMoneyField = element => {
  if (!element.value.trim()) return;
  try {
    const value = parseTurkishMoneyToKurus(element.value);
    element.value = formatMoneyInput(value);
  } catch {
    // Hata, Hesapla sırasında kullanıcıya tek bir yerde gösterilir.
  }
};

const updateCommissionFields = () => {
  const method = commissionMethodElement.value;
  document.getElementById("commissionPercentageField").hidden = ![
    COMMISSION_METHOD.REMAINING_PERCENTAGE,
    COMMISSION_METHOD.COLLECTED_PERCENTAGE
  ].includes(method);
  document.getElementById("commissionManualField").hidden = method !== COMMISSION_METHOD.MANUAL_FIXED;
  hideResult();
};

const buildCommissionInput = patientCollectedKurus => {
  return validateCommissionDraft({
    method: commissionMethodElement.value,
    percentageText: commissionPercentageElement.value,
    manualText: commissionManualElement.value,
    hasCollection: patientCollectedKurus !== null
  });
};

const renderResult = (result, summary) => {
  document.getElementById("mainServiceAmount").textContent = formatKurus(result.amounts.baseFeeKurus);

  const excessRow = document.getElementById("excessDurationRow");
  if (result.timing.excessMinutes > 0) {
    document.getElementById("excessDurationLabel").textContent =
      `Fazla süre (${result.timing.excessMinutes} dakika)`;
    document.getElementById("excessDurationAmount").textContent =
      formatKurus(result.amounts.excessDurationKurus);
    excessRow.hidden = false;
  } else {
    excessRow.hidden = true;
  }

  document.getElementById("accommodationAmount").textContent = accommodationText(result);
  document.getElementById("surchargeAmount").textContent =
    formatKurus(result.amounts.outsideWorkingHoursSurchargeKurus);
  document.getElementById("breakdownExtras").textContent = formatKurus(summary.amounts.extraItemsTotalKurus);
  document.getElementById("resultHospitalTotal").textContent = formatKurus(summary.amounts.hospitalTotalKurus);
  document.getElementById("resultDuration").textContent = result.timing.durationMinutes == null
    ? "Sabit işlem bedeli"
    : `${result.timing.durationMinutes} dakika`;

  document.getElementById("summaryHospitalTotal").textContent = formatKurus(summary.amounts.hospitalTotalKurus);
  document.getElementById("summaryPatientCollected").textContent = summary.amounts.patientCollectedKurus === null
    ? "—"
    : formatKurus(summary.amounts.patientCollectedKurus);
  document.getElementById("summaryRemaining").textContent = summary.amounts.remainingKurus === null
    ? "—"
    : formatKurus(summary.amounts.remainingKurus);
  document.getElementById("summaryDoctorCommission").textContent = summary.amounts.doctorCommissionKurus === null
    ? "—"
    : formatKurus(summary.amounts.doctorCommissionKurus);
  document.getElementById("summaryDoctorNet").textContent = summary.amounts.doctorNetPaymentKurus === null
    ? "—"
    : formatKurus(summary.amounts.doctorNetPaymentKurus);

  const remainingRow = document.querySelector(".remaining-row");
  const warning = document.getElementById("negativeRemainingWarning");
  remainingRow.classList.toggle("negative", summary.hasNegativeRemaining);
  if (summary.hasNegativeRemaining) {
    warning.textContent = `Uyarı: Hastadan alınan tutar hastane toplam bedelinden ${formatKurus(Math.abs(summary.amounts.remainingKurus))} daha düşüktür.`;
    warning.hidden = false;
  } else {
    warning.textContent = "";
    warning.hidden = true;
  }

  const commissionWarning = document.getElementById("commissionWarning");
  const doctorNetRow = document.querySelector(".doctor-net-row");
  doctorNetRow.classList.toggle("negative", summary.commission.hasNegativeDoctorNet);
  if (summary.commission.status === "negative_remaining") {
    commissionWarning.textContent = "Kalan tutar negatif olduğu için doktor payı ve net doktor ödemesi hesaplanmadı.";
    commissionWarning.hidden = false;
  } else if (summary.commission.hasNegativeDoctorNet) {
    commissionWarning.textContent = "Uyarı: Hesaplanan komisyon kalan tutardan yüksek olduğu için net doktor ödemesi negatiftir.";
    commissionWarning.hidden = false;
  } else {
    commissionWarning.textContent = "";
    commissionWarning.hidden = true;
  }

  resultCard.hidden = false;
  lastCalculation = result;
  lastFinancialSummary = summary;
  printReportButton.disabled = false;
  resultCard.scrollIntoView({ behavior: "smooth", block: "start" });
};

const buildCalculationInput = () => {
  const category = categoryElement.value;
  const baseInput = {
    category,
    outsideWorkingHours: document.getElementById("outsideWorkingHours").checked,
    sgk: false
  };
  if (category === CATEGORY.OBSTETRICS) {
    return {
      ...baseInput,
      procedureCode: document.getElementById("procedureCode").value,
      accommodation: ACCOMMODATION.NONE
    };
  }
  if (!startElement.value || !endElement.value) {
    validateDurationValues(startElement.value, endElement.value);
  }
  validateDurationValues(startElement.value, endElement.value);
  return {
    ...baseInput,
    anesthesiaStart: startElement.value,
    anesthesiaEnd: endElement.value,
    accommodation: document.getElementById("accommodation").value
  };
};

const calculateCurrentForm = () => {
  const calculation = calculateGuestPhysician(buildCalculationInput(), activeTariff);
  const collectedText = patientCollectedElement.value;
  const patientCollectedKurus = validatePatientCollected(collectedText);
  const commissionInput = buildCommissionInput(patientCollectedKurus);
  const financialSummary = calculateFinancialSummary({
    calculation,
    extraItems: readExtraItems(),
    patientCollectedKurus,
    commission: commissionInput
  });
  lastCommissionInput = commissionInput;
  renderResult(calculation, financialSummary);
  return { calculation, financialSummary, commissionInput };
};

form.addEventListener("submit", event => {
  event.preventDefault();
  clearError();
  hideResult();
  try {
    calculateCurrentForm();
  } catch (error) {
    hideResult();
    const fieldId = error instanceof UserInputError
      ? error.fieldId
      : /Manuel komisyon/.test(error.message || "")
        ? "commissionManualAmount"
        : null;
    showError(userMessageForError(error), fieldId);
  }
});

categoryElement.addEventListener("change", updateCategoryFields);
document.querySelectorAll("[data-category-choice]").forEach(button => {
  button.addEventListener("click", () => {
    categoryElement.value = button.dataset.categoryChoice;
    updateCategoryFields();
    markDirty();
    document.getElementById("calculatorTitle").scrollIntoView({ behavior: "smooth", block: "start" });
  });
});
startElement.addEventListener("input", () => {
  updateDurationPreview();
  hideResult();
});
endElement.addEventListener("input", () => {
  updateDurationPreview();
  hideResult();
});
document.getElementById("addExtraItemButton").addEventListener("click", createExtraItemRow);

extraItemsElement.addEventListener("input", event => {
  if (event.target.matches("input, select")) {
    updateExtrasPreview();
    hideResult();
  }
});
extraItemsElement.addEventListener("change", updateExtrasPreview);
extraItemsElement.addEventListener("focusout", event => {
  if (event.target.matches("[data-field='unitPrice']")) {
    normalizeMoneyField(event.target);
    updateExtrasPreview();
  }
});
extraItemsElement.addEventListener("click", event => {
  const removeButton = event.target.closest(".remove-extra-button");
  if (!removeButton) return;
  removeButton.closest(".extra-item").remove();
  updateExtrasPreview();
  hideResult();
});

patientCollectedElement.addEventListener("blur", () => normalizeMoneyField(patientCollectedElement));
commissionManualElement.addEventListener("blur", () => normalizeMoneyField(commissionManualElement));
commissionMethodElement.addEventListener("change", updateCommissionFields);
form.addEventListener("input", event => {
  event.target.removeAttribute?.("aria-invalid");
  if (event.target !== startElement && event.target !== endElement) hideResult();
  markDirty();
});

const requiredCaseFields = [
  ["patientName", "Hasta adı zorunludur."],
  ["protocolNumber", "Protokol numarası zorunludur."],
  ["physicianName", "Misafir hekim / doktor adı zorunludur."],
  ["procedureDate", "İşlem tarihi zorunludur."]
];

const readCaseFormData = () => {
  for (const [fieldId, message] of requiredCaseFields) {
    if (!document.getElementById(fieldId).value.trim()) throw new UserInputError(message, fieldId);
  }
  return {
    patientName: document.getElementById("patientName").value.trim(),
    protocolNumber: document.getElementById("protocolNumber").value.trim(),
    physicianName: document.getElementById("physicianName").value.trim(),
    procedureDate: document.getElementById("procedureDate").value,
    notes: document.getElementById("caseNote").value.trim(),
    category: categoryElement.value,
    anesthesiaStart: startElement.value || null,
    anesthesiaEnd: endElement.value || null,
    accommodation: document.getElementById("accommodation").value,
    outsideWorkingHours: document.getElementById("outsideWorkingHours").checked,
    procedureCode: document.getElementById("procedureCode").value,
    patientCollectedText: patientCollectedElement.value,
    commissionMethod: commissionMethodElement.value,
    commissionPercentageText: commissionPercentageElement.value,
    commissionManualText: commissionManualElement.value
  };
};

const readReportFormData = () => ({
  patientName: document.getElementById("patientName").value.trim(),
  protocolNumber: document.getElementById("protocolNumber").value.trim(),
  physicianName: document.getElementById("physicianName").value.trim(),
  procedureDate: document.getElementById("procedureDate").value,
  notes: document.getElementById("caseNote").value.trim()
});

printReportButton.addEventListener("click", () => {
  if (!lastCalculation || !lastFinancialSummary) {
    showError("PDF almak için güncel form bilgileriyle yeniden Hesapla işlemi yapın.");
    printReportButton.disabled = true;
    return;
  }
  const report = buildPrintReportModel({
    formData: readReportFormData(),
    calculation: lastCalculation,
    financialSummary: lastFinancialSummary
  });
  printReportElement.innerHTML = renderPrintReportHtml(report);
  const previousTitle = document.title;
  document.title = report.fileName.replace(/\.pdf$/i, "");
  const restoreTitle = () => { document.title = previousTitle; };
  window.addEventListener("afterprint", restoreTitle, { once: true });
  window.print();
  window.setTimeout(restoreTitle, 2000);
});

const buildCurrentSnapshot = () => {
  const formData = readCaseFormData();
  const { calculation, financialSummary, commissionInput } = calculateCurrentForm();
  const currentNumber = workflow.currentCase?.caseNumber;
  return buildCaseSnapshot({
    caseNumber: currentNumber || `MH-${Date.now()}`,
    formData,
    calculation,
    financialSummary,
    commissionInput,
    tariff: activeTariff
  });
};

saveDraftButton.addEventListener("click", async () => {
  clearError();
  try {
    const wasNew = !workflow.currentCase;
    await workflow.saveDraft(buildCurrentSnapshot());
    hasUnsavedChanges = false;
    updateCaseControls();
    const target = currentRuntime.mode === "local" ? "yerel belleğe" : "staging Emulator ortamına";
    const createdMessage = embeddedMode ? "Taslak vaka kaydedildi." : `Taslak vaka ${target} kaydedildi.`;
    showCaseMessage(wasNew ? createdMessage : "Taslak vaka güncellendi.");
  } catch (error) {
    hideResult();
    showError(userMessageForError(error), error instanceof UserInputError ? error.fieldId : null);
    showCaseMessage("Vaka kaydedilemedi. İşaretli alanları kontrol edin.", true);
  }
});

finalizeCaseButton.addEventListener("click", async () => {
  try {
    await workflow.finalize();
    hasUnsavedChanges = false;
    updateCaseControls();
    showCaseMessage("Vaka kesinleştirildi. Hesap snapshot'ı artık düzenlenemez.");
  } catch (error) {
    showCaseMessage(userMessageForError(error), true);
  }
});

cancelCaseButton.addEventListener("click", async () => {
  try {
    await workflow.cancel("Kullanıcı arayüzünden kontrollü iptal");
    hasUnsavedChanges = false;
    updateCaseControls();
    showCaseMessage("Vaka iptal edildi.");
  } catch (error) {
    showCaseMessage(userMessageForError(error), true);
  }
});

const setToday = () => {
  const today = new Date();
  document.getElementById("procedureDate").value = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0")
  ].join("-");
};

document.getElementById("newCaseButton").addEventListener("click", () => {
  workflow.newCase();
  form.reset();
  extraItemsElement.replaceChildren();
  extraItemSequence = 0;
  setToday();
  clearError();
  hideResult();
  updateExtrasPreview();
  updateCategoryFields();
  updateCommissionFields();
  hasUnsavedChanges = true;
  updateCaseControls();
  showCaseMessage("Yeni vaka formu açıldı; önceki vaka bilgileri temizlendi.");
});

const activateRuntime = async runtime => {
  const candidateWorkflow = new CaseWorkflow(runtime);
  const candidateTariff = await candidateWorkflow.initialize();
  await currentRuntime?.dispose?.();
  currentRuntime = runtime;
  workflow = candidateWorkflow;
  activeTariff = candidateTariff;
  hasUnsavedChanges = true;
  form.reset();
  extraItemsElement.replaceChildren();
  setToday();
  updateExtrasPreview();
  updateCategoryFields();
  updateCommissionFields();
  updateCaseControls();
};

const activateLocal = async () => {
  const runtime = await createLocalRepositoryRuntime();
  await activateRuntime(runtime);
  connectionBadge.textContent = "Local / Mock";
  connectionBadge.className = "connection-badge";
  activeProjectLabel.textContent = "Aktif ortam: Local / Mock";
};

environmentModeElement.addEventListener("change", () => {
  document.getElementById("stagingConnectionFields").hidden = environmentModeElement.value !== "staging";
  connectEnvironmentButton.textContent = environmentModeElement.value === "staging"
    ? "Staging'e Bağlan"
    : "Local / Mock'a Geç";
});

connectEnvironmentButton.addEventListener("click", async () => {
  connectEnvironmentButton.disabled = true;
  caseActionMessage.hidden = true;
  let candidateRuntime;
  try {
    if (embeddedMode && environmentModeElement.value !== "local") {
      throw new Error("Ana uygulama entegrasyonunda yalnız Local / Mock ortamı kullanılabilir.");
    }
    if (environmentModeElement.value === "local") {
      await activateLocal();
      showCaseMessage("Local / Mock ortamı etkinleştirildi.");
      return;
    }
    const projectId = stagingProjectIdElement.value.trim();
    const { createFirebaseEmulatorRuntime } = await import("./firebase-emulator-runtime.js");
    candidateRuntime = await createFirebaseEmulatorRuntime({ projectId });
    await activateRuntime(candidateRuntime);
    connectionBadge.textContent = "Staging ortamı";
    connectionBadge.className = "connection-badge staging";
    activeProjectLabel.textContent = `Aktif staging projesi: ${projectId} · Emulator 127.0.0.1:8080`;
    showCaseMessage(`Staging ortamına bağlanıldı: ${projectId}`);
  } catch (error) {
    if (candidateRuntime && candidateRuntime !== currentRuntime) await candidateRuntime.dispose?.();
    showCaseMessage(`Ortam etkinleştirilemedi: ${userMessageForError(error)}`, true);
  } finally {
    connectEnvironmentButton.disabled = false;
  }
});

const initialize = async () => {
  try {
    await activateLocal();
  } catch (error) {
    showCaseMessage(`Yerel kayıt altyapısı başlatılamadı: ${userMessageForError(error)}`, true);
    saveDraftButton.disabled = true;
  }
};

initialize();
