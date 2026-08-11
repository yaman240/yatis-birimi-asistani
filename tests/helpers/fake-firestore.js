const clone = value => structuredClone(value);

export const createFakeFirestore = () => {
  const documents = new Map();
  let sequence = 0;
  const db = { name: "fake-firestore" };

  const makeSnapshot = reference => ({
    exists: () => documents.has(reference.path),
    data: () => clone(documents.get(reference.path))
  });

  const sdk = {
    collection(_db, path) {
      return { path };
    },
    doc(first, second, third) {
      if (first?.path && second === undefined) {
        sequence += 1;
        const id = `auto-${sequence}`;
        return { id, path: `${first.path}/${id}` };
      }
      return { id: third, path: `${second}/${third}` };
    },
    async getDoc(reference) {
      return makeSnapshot(reference);
    },
    async setDoc(reference, data) {
      documents.set(reference.path, clone(data));
    },
    async updateDoc(reference, patch) {
      documents.set(reference.path, { ...clone(documents.get(reference.path)), ...clone(patch) });
    },
    async runTransaction(_db, callback) {
      const transaction = {
        async get(reference) {
          return makeSnapshot(reference);
        },
        set(reference, data) {
          documents.set(reference.path, clone(data));
        },
        update(reference, patch) {
          if (!documents.has(reference.path)) throw new Error("Belge bulunamadı.");
          documents.set(reference.path, { ...clone(documents.get(reference.path)), ...clone(patch) });
        }
      };
      return callback(transaction);
    },
    serverTimestamp() {
      return "SERVER_TIMESTAMP";
    }
  };

  return { db, sdk, documents };
};

