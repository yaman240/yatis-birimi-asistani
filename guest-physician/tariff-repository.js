import { AuditRepository } from "./audit-repository.js";
import {
  AUDIT_EVENT,
  COLLECTIONS,
  getActor,
  requireNonEmptyString,
  requireObject,
  requireRepositoryDependencies,
  snapshotData
} from "./repository-utils.js";

export class TariffRepository {
  constructor(dependencies) {
    requireRepositoryDependencies(dependencies);
    this.db = dependencies.db;
    this.sdk = dependencies.sdk;
    this.actorProvider = dependencies.actorProvider;
    this.audit = dependencies.auditRepository || new AuditRepository(dependencies);
  }

  tariffReference(tariffId) {
    return this.sdk.doc(this.db, COLLECTIONS.TARIFFS, tariffId);
  }

  async getById(tariffId) {
    return snapshotData(await this.sdk.getDoc(this.tariffReference(tariffId)));
  }

  async getActive() {
    const settingsReference = this.sdk.doc(this.db, COLLECTIONS.TARIFF_SETTINGS, "current");
    const settings = snapshotData(await this.sdk.getDoc(settingsReference));
    if (!settings?.activeTariffId) return null;
    const tariff = await this.getById(settings.activeTariffId);
    return tariff ? { id: settings.activeTariffId, ...tariff } : null;
  }

  async createDraft(tariffId, tariff) {
    requireObject(tariff, "Tarife");
    const actor = getActor(this.actorProvider);
    const timestamp = this.sdk.serverTimestamp();
    const document = {
      ...tariff,
      schemaVersion: 1,
      tariffCode: requireNonEmptyString(tariff.tariffCode, "Tarife kodu"),
      version: tariff.version,
      status: "draft",
      currency: "TRY",
      categories: { ...requireObject(tariff.categories, "Tarife kategorileri") },
      surcharges: { ...requireObject(tariff.surcharges, "Tarife ilaveleri") },
      restrictions: { ...requireObject(tariff.restrictions, "Tarife kısıtları") },
      exclusions: [...(tariff.exclusions || [])],
      createdAt: timestamp,
      createdBy: actor,
      updatedAt: timestamp,
      updatedBy: actor,
      activatedAt: null,
      activatedBy: null
    };
    const reference = this.tariffReference(requireNonEmptyString(tariffId, "Tarife kimliği"));
    await this.sdk.runTransaction(this.db, async transaction => {
      transaction.set(reference, document);
      this.audit.appendInTransaction(transaction, {
        eventType: AUDIT_EVENT.TARIFF_CREATED,
        entityType: "tariff",
        entityId: tariffId,
        details: { version: document.version }
      });
    });
    return { id: tariffId, ...document };
  }

  async activate(tariffId) {
    const targetReference = this.tariffReference(tariffId);
    const settingsReference = this.sdk.doc(this.db, COLLECTIONS.TARIFF_SETTINGS, "current");
    const actor = getActor(this.actorProvider);
    await this.sdk.runTransaction(this.db, async transaction => {
      const target = snapshotData(await transaction.get(targetReference));
      if (!target) throw new RangeError("Aktive edilecek tarife bulunamadı.");
      if (target.status !== "draft") throw new RangeError("Yalnız taslak tarife aktive edilebilir.");
      const currentSettings = snapshotData(await transaction.get(settingsReference));
      const timestamp = this.sdk.serverTimestamp();
      if (currentSettings?.activeTariffId && currentSettings.activeTariffId !== tariffId) {
        transaction.update(this.tariffReference(currentSettings.activeTariffId), {
          status: "retired",
          updatedAt: timestamp,
          updatedBy: actor
        });
      }
      transaction.update(targetReference, {
        status: "active",
        activatedAt: timestamp,
        activatedBy: actor,
        updatedAt: timestamp,
        updatedBy: actor
      });
      transaction.set(settingsReference, {
        schemaVersion: 1,
        activeTariffId: tariffId,
        updatedAt: timestamp,
        updatedBy: actor
      });
      this.audit.appendInTransaction(transaction, {
        eventType: AUDIT_EVENT.TARIFF_ACTIVATED,
        entityType: "tariff",
        entityId: tariffId,
        details: { previousTariffId: currentSettings?.activeTariffId || null }
      });
    });
  }
}

