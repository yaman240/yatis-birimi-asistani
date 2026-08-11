export const COLLECTIONS = Object.freeze({
  TARIFFS: "guestPhysicianTariffs",
  TARIFF_SETTINGS: "guestPhysicianTariffSettings",
  CASES: "guestPhysicianCases",
  AUDIT_LOGS: "guestPhysicianAuditLogs"
});

export const CASE_STATUS = Object.freeze({
  DRAFT: "draft",
  FINALIZED: "finalized",
  CANCELLED: "cancelled"
});

export const AUDIT_EVENT = Object.freeze({
  CASE_CREATED: "case_created",
  CASE_UPDATED: "case_updated",
  CASE_FINALIZED: "case_finalized",
  CASE_CANCELLED: "case_cancelled",
  TARIFF_CREATED: "tariff_created",
  TARIFF_ACTIVATED: "tariff_activated"
});

export const requireRepositoryDependencies = ({ db, sdk, actorProvider }) => {
  if (!db) throw new TypeError("Firestore db bağımlılığı gereklidir.");
  const requiredSdkMethods = [
    "collection", "doc", "getDoc", "setDoc", "updateDoc", "runTransaction", "serverTimestamp"
  ];
  requiredSdkMethods.forEach(method => {
    if (typeof sdk?.[method] !== "function") throw new TypeError(`Firestore SDK ${method} bağımlılığı gereklidir.`);
  });
  if (typeof actorProvider !== "function") throw new TypeError("Aktif kullanıcı sağlayıcısı gereklidir.");
};

export const getActor = actorProvider => {
  const actor = actorProvider();
  if (!actor?.uid || !actor?.email) throw new TypeError("İşlem için kimliği doğrulanmış kullanıcı gereklidir.");
  return { uid: String(actor.uid), email: String(actor.email).toLowerCase() };
};

export const requireObject = (value, name) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${name} nesne olmalıdır.`);
  }
  return value;
};

export const requireNonEmptyString = (value, name) => {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${name} zorunludur.`);
  return value.trim();
};

export const snapshotData = snapshot => snapshot?.exists?.() ? snapshot.data() : null;

