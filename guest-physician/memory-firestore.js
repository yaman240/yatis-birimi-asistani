const clone = value => structuredClone(value);

export const createMemoryFirestore = ({ now = () => new Date() } = {}) => {
  const documents = new Map();
  let sequence = 0;
  const db = Object.freeze({ name: "guest-physician-local-memory" });

  const snapshot = reference => ({
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
        return { id: `local-${sequence}`, path: `${first.path}/local-${sequence}` };
      }
      return { id: third, path: `${second}/${third}` };
    },
    async getDoc(reference) {
      return snapshot(reference);
    },
    async setDoc(reference, data) {
      documents.set(reference.path, clone(data));
    },
    async updateDoc(reference, patch) {
      if (!documents.has(reference.path)) throw new Error("Belge bulunamadı.");
      documents.set(reference.path, { ...clone(documents.get(reference.path)), ...clone(patch) });
    },
    async runTransaction(_db, callback) {
      const transaction = {
        async get(reference) {
          return snapshot(reference);
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
      return now().toISOString();
    }
  };

  const inspect = Object.freeze({
    get(path) {
      return documents.has(path) ? clone(documents.get(path)) : null;
    },
    list(collectionPath) {
      const prefix = `${collectionPath}/`;
      return [...documents.entries()]
        .filter(([path]) => path.startsWith(prefix) && !path.slice(prefix.length).includes("/"))
        .map(([path, data]) => ({ id: path.slice(prefix.length), ...clone(data) }));
    }
  });

  return { db, sdk, inspect };
};
