const CATEGORY_LABELS = Object.freeze({
  surgery: "Cerrahi",
  dentalEnt: "Diş / KBB",
  obstetrics: "Kadın Doğum"
});

const PROCEDURE_LABELS = Object.freeze({
  cesarean: "Sezaryen",
  normalDelivery: "Normal Doğum",
  curettageOther: "Küretaj vb."
});

const ACCOMMODATION_LABELS = Object.freeze({
  none: "Yok",
  private_room_one_day: "1 günlük özel oda",
  private_room_day_case: "Günübirlik özel oda",
  observation_day_case: "Müşahede salonu"
});

const EXTRA_TYPE_LABELS = Object.freeze({
  erythrocyte: "Eritrosit", ffp: "TDP", laboratory: "Laboratuvar",
  radiology: "Radyoloji", ambulance: "Ambulans", consultation: "Konsültasyon",
  pathology: "Patoloji", special_material: "Özellikli malzeme",
  dental_consumable: "Diş sarfı", other: "Diğer"
});

const moneyFormatter = new Intl.NumberFormat("tr-TR", {
  style: "currency", currency: "TRY", minimumFractionDigits: 2, maximumFractionDigits: 2
});

const formatKurus = value => value === null || value === undefined ? "—" : moneyFormatter.format(value / 100);

const formatDate = value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return value || "—";
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
};

export const safeFilePart = (value, fallback = "Rapor") => {
  const normalized = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
  return normalized || fallback;
};

export const buildPrintFileName = (protocolNumber, procedureDate) => {
  const protocol = safeFilePart(protocolNumber, "Protokolsuz");
  const date = safeFilePart(procedureDate, "Tarihsiz");
  return `Misafir_Hekim_${protocol}_${date}.pdf`;
};

export const buildPrintReportModel = ({ formData, calculation, financialSummary }) => {
  if (!calculation?.amounts || !financialSummary?.amounts) {
    throw new TypeError("PDF raporu için güncel hesaplama sonucu gereklidir.");
  }
  const isDurationCase = calculation.timing.durationMinutes !== null;
  return {
    title: "MİSAFİR HEKİM HESAP ÖZETİ",
    fileName: buildPrintFileName(formData.protocolNumber, formData.procedureDate),
    information: [
      ["İşlem tarihi", formatDate(formData.procedureDate)],
      ["Hasta adı", formData.patientName || "—"],
      ["Protokol numarası", formData.protocolNumber || "—"],
      ["Misafir hekim / doktor", formData.physicianName || "—"],
      ["Kategori", CATEGORY_LABELS[calculation.category] || calculation.category],
      ...(calculation.procedureCode ? [["İşlem türü", PROCEDURE_LABELS[calculation.procedureCode] || calculation.procedureCode]] : []),
      ...(isDurationCase ? [
        ["Anestezi başlangıç / bitiş", `${calculation.timing.anesthesiaStart} / ${calculation.timing.anesthesiaEnd}`],
        ["Toplam ameliyathane süresi", `${calculation.timing.durationMinutes} dakika`],
        ["Oda seçimi", ACCOMMODATION_LABELS[calculation.accommodation] || calculation.accommodation]
      ] : []),
      ["Mesai dışı", calculation.outsideWorkingHours ? "Evet" : "Hayır"]
    ],
    charges: [
      ["Ana işlem / ameliyathane", formatKurus(calculation.amounts.baseFeeKurus)],
      ["Fazla süre bedeli", formatKurus(calculation.amounts.excessDurationKurus)],
      ["Oda bedeli", formatKurus(calculation.amounts.accommodationKurus)],
      ["Mesai dışı fark", formatKurus(calculation.amounts.outsideWorkingHoursSurchargeKurus)],
      ["Ek kalemler toplamı", formatKurus(financialSummary.amounts.extraItemsTotalKurus)]
    ],
    extraItems: financialSummary.extraItems.map(item => ({
      label: EXTRA_TYPE_LABELS[item.type] || item.type,
      description: item.description,
      quantity: item.quantity,
      unitPrice: formatKurus(item.unitPriceKurus),
      total: formatKurus(item.totalKurus)
    })),
    hospitalTotal: formatKurus(financialSummary.amounts.hospitalTotalKurus),
    distribution: [
      ["Hastadan alınan toplam tutar", formatKurus(financialSummary.amounts.patientCollectedKurus)],
      ["Kalan tutar", formatKurus(financialSummary.amounts.remainingKurus)],
      ["Doktor payı / komisyon", formatKurus(financialSummary.amounts.doctorCommissionKurus)]
    ],
    doctorNet: formatKurus(financialSummary.amounts.doctorNetPaymentKurus),
    negativeRemaining: financialSummary.hasNegativeRemaining,
    notes: formData.notes || ""
  };
};

const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[character]);

const rows = items => items.map(([label, value]) => `
  <div class="print-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("");

export const renderPrintReportHtml = report => `
  <div class="print-sheet">
    <header class="print-header"><div class="print-mark">MH</div><div><p>YATIŞ BİRİMİ ASİSTANI</p><h1>${escapeHtml(report.title)}</h1></div></header>
    <section class="print-section print-information"><h2>Vaka Bilgileri</h2><div class="print-info-grid">${rows(report.information)}</div></section>
    <section class="print-section"><h2>Ücret Dökümü</h2>${rows(report.charges)}
      ${report.extraItems.length ? `<div class="print-extras"><h3>Ek Kalemler</h3>${report.extraItems.map(item => `<div class="print-extra-row"><span><b>${escapeHtml(item.label)}</b>${item.description ? ` - ${escapeHtml(item.description)}` : ""}</span><span>${item.quantity} × ${escapeHtml(item.unitPrice)}</span><strong>${escapeHtml(item.total)}</strong></div>`).join("")}</div>` : ""}
      <div class="print-total-card"><span>Hastane Toplam Bedeli</span><strong class="financial-card-amount">${escapeHtml(report.hospitalTotal)}</strong></div>
    </section>
    <section class="print-section"><h2>Mali Dağılım</h2>${rows(report.distribution)}
      <div class="print-net-card${report.negativeRemaining ? " critical" : ""}"><span>Doktora Ödenecek Net Tutar</span><strong class="financial-card-amount${report.negativeRemaining ? " financial-card-amount-critical" : ""}">${escapeHtml(report.doctorNet)}</strong></div>
    </section>
    ${report.notes ? `<section class="print-section print-notes"><h2>Açıklama / Not</h2><p>${escapeHtml(report.notes)}</p></section>` : ""}
  </div>`;
