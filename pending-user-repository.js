import { collection, doc, getDoc, onSnapshot, serverTimestamp, setDoc, writeBatch } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { requireCorporateEmailAddress } from "./corporate-auth-policy.js";

const COLLECTION_NAME = "pendingUsers";
const USER_COLLECTION = "users";
const ASSIGNABLE_ROLES = new Set(["personel", "doktor", "idari"]);
const required = (value, label) => {
  const text = String(value || "").trim();
  if (!text) throw new TypeError(`${label} zorunludur.`);
  return text;
};

export class PendingUserRepository {
  constructor(db) { this.db = db; }

  async createForAuthenticatedUser(user) {
    const uid = required(user?.uid, "UID");
    const email = requireCorporateEmailAddress(user?.email);
    const reference = doc(this.db, COLLECTION_NAME, uid);
    if ((await getDoc(reference)).exists()) return false;
    await setDoc(reference, {
      uid,
      email,
      displayName: String(user?.displayName || "").trim(),
      requestedAt: serverTimestamp()
    });
    return true;
  }

  subscribe(listener, onError) {
    return onSnapshot(collection(this.db, COLLECTION_NAME), snapshot => {
      listener(snapshot.docs.map(item => ({ id: item.id, ...item.data() })));
    }, onError);
  }

  async authorize(pendingUser, role) {
    if (!ASSIGNABLE_ROLES.has(role)) throw new TypeError("Geçersiz kullanıcı rolü.");
    const uid = required(pendingUser?.uid || pendingUser?.id, "UID");
    const batch = writeBatch(this.db);
    batch.set(doc(this.db, USER_COLLECTION, uid), {
      uid,
      email: required(pendingUser?.email, "E-posta").toLowerCase(),
      displayName: String(pendingUser?.displayName || "").trim(),
      role,
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    batch.delete(doc(this.db, COLLECTION_NAME, uid));
    await batch.commit();
  }
}
