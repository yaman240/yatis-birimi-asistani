import {
  collection, doc, getDoc, onSnapshot, runTransaction, serverTimestamp, updateDoc, writeBatch
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { requireCorporateEmailAddress } from "./corporate-auth-policy.js";

const COLLECTION_NAME = "userInvitations";
const USER_COLLECTION = "users";
const INVITABLE_ROLES = new Set(["personel", "doktor", "idari"]);

const required = (value, label) => {
  const text = String(value || "").trim();
  if (!text) throw new TypeError(`${label} zorunludur.`);
  return text;
};

const actorOf = user => ({
  uid: required(user?.uid, "Yönetici UID"),
  email: required(user?.email, "Yönetici e-postası").toLowerCase()
});

export class UserInvitationRepository {
  constructor(db) { this.db = db; }

  subscribe(listener, onError) {
    return onSnapshot(collection(this.db, COLLECTION_NAME), snapshot => {
      listener(snapshot.docs.map(item => ({ id: item.id, ...item.data() })));
    }, onError);
  }

  async create({ email, displayName, role }, adminUser) {
    const normalizedEmail = requireCorporateEmailAddress(email);
    const safeDisplayName = required(displayName, "Ad soyad").replace(/\s+/g, " ");
    if (safeDisplayName.length > 120) throw new TypeError("Ad soyad en fazla 120 karakter olabilir.");
    if (!INVITABLE_ROLES.has(role)) throw new TypeError("Rol yalnız Personel, Doktor veya İdari olabilir.");
    const actor = actorOf(adminUser);
    const reference = doc(this.db, COLLECTION_NAME, normalizedEmail);
    await runTransaction(this.db, async transaction => {
      if ((await transaction.get(reference)).exists()) throw new TypeError("Bu e-posta için daha önce davet oluşturulmuş.");
      transaction.set(reference, {
        email: normalizedEmail, displayName: safeDisplayName, role,
        active: true, claimed: false, claimedUid: null, claimedAt: null,
        createdAt: serverTimestamp(), createdBy: actor,
        updatedAt: serverTimestamp(), updatedBy: actor
      });
    });
    return normalizedEmail;
  }

  async cancel(email, adminUser) {
    await updateDoc(doc(this.db, COLLECTION_NAME, requireCorporateEmailAddress(email)), {
      active: false, updatedAt: serverTimestamp(), updatedBy: actorOf(adminUser)
    });
  }

  async claimForAuthenticatedUser(user) {
    const uid = required(user?.uid, "UID");
    const email = requireCorporateEmailAddress(user?.email);
    const invitationReference = doc(this.db, COLLECTION_NAME, email);
    const snapshot = await getDoc(invitationReference);
    if (!snapshot.exists()) return false;
    const invitation = snapshot.data();
    if (invitation.active !== true || invitation.claimed === true || !INVITABLE_ROLES.has(invitation.role)) return false;

    const batch = writeBatch(this.db);
    batch.set(doc(this.db, USER_COLLECTION, uid), {
      uid, email, displayName: String(invitation.displayName || "").trim(),
      role: invitation.role, active: true,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp()
    });
    batch.update(invitationReference, {
      claimed: true, claimedUid: uid, claimedAt: serverTimestamp(), updatedAt: serverTimestamp()
    });
    await batch.commit();
    return true;
  }
}
