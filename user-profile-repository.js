import { collection, doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const COLLECTION_NAME = "users";
const ROLES = new Set(["admin", "personel", "doktor", "idari"]);
const required = (value, label) => {
  const text = String(value || "").trim();
  if (!text) throw new TypeError(`${label} zorunludur.`);
  return text;
};

export class UserProfileRepository {
  constructor(db) { this.db = db; }

  async getByUid(uid) {
    const snapshot = await getDoc(doc(this.db, COLLECTION_NAME, required(uid, "UID")));
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
  }

  subscribe(listener, onError) {
    return onSnapshot(collection(this.db, COLLECTION_NAME), snapshot => {
      listener(snapshot.docs.map(item => ({ id: item.id, ...item.data() })));
    }, onError);
  }

  async create({ uid, email, displayName = "", role, active = true }) {
    const safeUid = required(uid, "UID");
    if (!ROLES.has(role)) throw new TypeError("Geçersiz kullanıcı rolü.");
    await setDoc(doc(this.db, COLLECTION_NAME, safeUid), {
      uid: safeUid,
      email: required(email, "E-posta").toLowerCase(),
      displayName: String(displayName || "").trim(),
      role,
      active: active === true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  async update(uid, { role, active, displayName }) {
    if (!ROLES.has(role)) throw new TypeError("Geçersiz kullanıcı rolü.");
    await updateDoc(doc(this.db, COLLECTION_NAME, required(uid, "UID")), {
      role,
      active: active === true,
      displayName: String(displayName || "").trim(),
      updatedAt: serverTimestamp()
    });
  }
}
