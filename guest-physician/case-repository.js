import { AuditRepository } from "./audit-repository.js";
import {
  AUDIT_EVENT,
  CASE_STATUS,
  COLLECTIONS,
  getActor,
  requireNonEmptyString,
  requireObject,
  requireRepositoryDependencies,
  snapshotData
} from "./repository-utils.js";

const EDITABLE_DRAFT_FIELDS = new Set([
  "caseNumber", "tariff", "category", "procedureCode", "patient", "physician", "timing",
  "accommodation", "options", "lineItems", "totals", "tariffSnapshot", "calculation",
  "calculationSnapshot", "notes"
]);

export class CaseRepository {
  constructor(dependencies) {
    requireRepositoryDependencies(dependencies);
    this.db = dependencies.db;
    this.sdk = dependencies.sdk;
    this.actorProvider = dependencies.actorProvider;
    this.audit = dependencies.auditRepository || new AuditRepository(dependencies);
  }

  caseReference(caseId) {
    return this.sdk.doc(this.db, COLLECTIONS.CASES, caseId);
  }

  async getById(caseId) {
    return snapshotData(await this.sdk.getDoc(this.caseReference(caseId)));
  }

  async createDraft(input) {
    requireObject(input, "Vaka");
    const reference = this.sdk.doc(this.sdk.collection(this.db, COLLECTIONS.CASES));
    const actor = getActor(this.actorProvider);
    const timestamp = this.sdk.serverTimestamp();
    const document = {
      schemaVersion: 1,
      caseNumber: requireNonEmptyString(input.caseNumber, "Vaka numarası"),
      status: CASE_STATUS.DRAFT,
      tariff: { ...requireObject(input.tariff, "Tarife referansı") },
      category: requireNonEmptyString(input.category, "Kategori"),
      procedureCode: input.procedureCode ?? null,
      patient: { ...requireObject(input.patient, "Hasta bilgisi") },
      physician: { ...requireObject(input.physician, "Hekim bilgisi") },
      timing: { ...requireObject(input.timing, "Süre bilgisi") },
      accommodation: { ...requireObject(input.accommodation, "Oda bilgisi") },
      options: { ...requireObject(input.options, "Vaka seçenekleri") },
      lineItems: [...(input.lineItems || [])],
      totals: { ...requireObject(input.totals, "Mali toplamlar") },
      tariffSnapshot: { ...requireObject(input.tariffSnapshot, "Tarife snapshot") },
      calculation: { ...requireObject(input.calculation, "Hesaplama bilgisi") },
      calculationSnapshot: { ...requireObject(input.calculationSnapshot, "Hesaplama snapshot") },
      notes: String(input.notes || ""),
      createdAt: timestamp,
      createdBy: actor,
      updatedAt: timestamp,
      updatedBy: actor,
      finalizedAt: null,
      finalizedBy: null,
      cancelledAt: null,
      cancelledBy: null
    };
    await this.sdk.runTransaction(this.db, async transaction => {
      transaction.set(reference, document);
      this.audit.appendInTransaction(transaction, {
        eventType: AUDIT_EVENT.CASE_CREATED,
        entityType: "case",
        entityId: reference.id,
        details: { status: CASE_STATUS.DRAFT }
      });
    });
    return { id: reference.id, ...document };
  }

  async updateDraft(caseId, patch) {
    requireObject(patch, "Vaka güncellemesi");
    const invalidField = Object.keys(patch).find(key => !EDITABLE_DRAFT_FIELDS.has(key));
    if (invalidField) throw new RangeError(`Taslak vaka alanı güncellenemez: ${invalidField}`);
    const reference = this.caseReference(caseId);
    const actor = getActor(this.actorProvider);
    await this.sdk.runTransaction(this.db, async transaction => {
      const current = snapshotData(await transaction.get(reference));
      if (!current) throw new RangeError("Vaka bulunamadı.");
      if (current.status !== CASE_STATUS.DRAFT) throw new RangeError("Yalnız taslak vaka düzenlenebilir.");
      transaction.update(reference, {
        ...patch,
        updatedAt: this.sdk.serverTimestamp(),
        updatedBy: actor
      });
      this.audit.appendInTransaction(transaction, {
        eventType: AUDIT_EVENT.CASE_UPDATED,
        entityType: "case",
        entityId: caseId,
        details: { changedFields: Object.keys(patch) }
      });
    });
  }

  async finalize(caseId) {
    return this.#changeStatus(caseId, CASE_STATUS.FINALIZED, AUDIT_EVENT.CASE_FINALIZED);
  }

  async cancel(caseId, reason = "") {
    return this.#changeStatus(caseId, CASE_STATUS.CANCELLED, AUDIT_EVENT.CASE_CANCELLED, { reason: String(reason) });
  }

  async #changeStatus(caseId, targetStatus, eventType, details = {}) {
    const reference = this.caseReference(caseId);
    const actor = getActor(this.actorProvider);
    await this.sdk.runTransaction(this.db, async transaction => {
      const current = snapshotData(await transaction.get(reference));
      if (!current) throw new RangeError("Vaka bulunamadı.");
      if (targetStatus === CASE_STATUS.FINALIZED && current.status !== CASE_STATUS.DRAFT) {
        throw new RangeError("Yalnız taslak vaka kesinleştirilebilir.");
      }
      if (targetStatus === CASE_STATUS.CANCELLED
          && ![CASE_STATUS.DRAFT, CASE_STATUS.FINALIZED].includes(current.status)) {
        throw new RangeError("Bu vaka iptal edilemez.");
      }
      const timestamp = this.sdk.serverTimestamp();
      const statusFields = targetStatus === CASE_STATUS.FINALIZED
        ? { finalizedAt: timestamp, finalizedBy: actor }
        : { cancelledAt: timestamp, cancelledBy: actor };
      transaction.update(reference, {
        status: targetStatus,
        updatedAt: timestamp,
        updatedBy: actor,
        ...statusFields
      });
      this.audit.appendInTransaction(transaction, {
        eventType,
        entityType: "case",
        entityId: caseId,
        details: { fromStatus: current.status, toStatus: targetStatus, ...details }
      });
    });
  }
}

