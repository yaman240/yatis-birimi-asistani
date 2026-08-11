import { deleteApp, initializeApp } from "firebase/app";
import {
  collection,
  connectFirestoreEmulator,
  doc,
  getDoc,
  getFirestore,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc
} from "firebase/firestore";
import { createExplicitFirestoreRuntime } from "./repository-runtime.js";

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);
const DEFAULT_ACTOR = Object.freeze({ uid: "staging-demo-admin", email: "yaman615@gmail.com" });

export const createFirebaseSdkAdapter = () => Object.freeze({
  collection,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc
});

export const createFirebaseEmulatorRuntime = async ({
  projectId,
  host = "127.0.0.1",
  port = 8080,
  actor = DEFAULT_ACTOR
} = {}) => {
  if (!LOOPBACK_HOSTS.has(host)) throw new Error("Staging doğrulamasında yalnız yerel Emulator adresi kullanılabilir.");
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) throw new Error("Geçerli bir Emulator portu gereklidir.");

  const app = initializeApp({
    projectId,
    apiKey: "demo-emulator-only",
    appId: `demo-emulator:${projectId}`
  }, `guest-physician-${projectId}-${Date.now()}-${Math.random()}`);
  const db = getFirestore(app);
  connectFirestoreEmulator(db, host, port, {
    mockUserToken: {
      sub: actor.uid,
      user_id: actor.uid,
      email: actor.email,
      email_verified: true
    }
  });

  const runtime = createExplicitFirestoreRuntime({
    explicitlyEnableFirestore: true,
    projectId,
    db,
    sdk: createFirebaseSdkAdapter(),
    actorProvider: () => actor
  });
  return Object.freeze({
    ...runtime,
    mode: "staging-emulator",
    emulator: Object.freeze({ host, port }),
    async dispose() {
      await deleteApp(app);
    }
  });
};
