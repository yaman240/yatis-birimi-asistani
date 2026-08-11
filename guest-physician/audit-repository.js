import {
  AUDIT_EVENT,
  COLLECTIONS,
  getActor,
  requireNonEmptyString,
  requireObject,
  requireRepositoryDependencies
} from "./repository-utils.js";

const ALLOWED_EVENTS = new Set(Object.values(AUDIT_EVENT));
const ALLOWED_ENTITY_TYPES = new Set(["case", "tariff"]);

export class AuditRepository {
  constructor(dependencies) {
    requireRepositoryDependencies(dependencies);
    this.db = dependencies.db;
    this.sdk = dependencies.sdk;
    this.actorProvider = dependencies.actorProvider;
  }

  buildEvent({ eventType, entityType, entityId, details = {} }) {
    if (!ALLOWED_EVENTS.has(eventType)) throw new RangeError("Geçersiz audit olay türü.");
    if (!ALLOWED_ENTITY_TYPES.has(entityType)) throw new RangeError("Geçersiz audit varlık türü.");
    requireObject(details, "Audit detayları");
    return {
      schemaVersion: 1,
      eventType,
      entityType,
      entityId: requireNonEmptyString(entityId, "Audit varlık kimliği"),
      actor: getActor(this.actorProvider),
      occurredAt: this.sdk.serverTimestamp(),
      details: { ...details }
    };
  }

  async append(event) {
    const reference = this.sdk.doc(this.sdk.collection(this.db, COLLECTIONS.AUDIT_LOGS));
    await this.sdk.setDoc(reference, this.buildEvent(event));
    return reference.id;
  }

  appendInTransaction(transaction, event) {
    const reference = this.sdk.doc(this.sdk.collection(this.db, COLLECTIONS.AUDIT_LOGS));
    transaction.set(reference, this.buildEvent(event));
    return reference.id;
  }
}

