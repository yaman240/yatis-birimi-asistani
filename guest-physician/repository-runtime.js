import { TARIFF_2026_V1 } from "./calculation-engine.js";
import { AuditRepository } from "./audit-repository.js";
import { CaseRepository } from "./case-repository.js";
import { createMemoryFirestore } from "./memory-firestore.js";
import { TariffRepository } from "./tariff-repository.js";

const LOCAL_ACTOR = Object.freeze({ uid: "local-demo-admin", email: "yaman615@gmail.com" });
const SAFE_REMOTE_PROJECT = /^(demo-|staging-)[a-z0-9-]+$/;

const buildRepositories = ({ db, sdk, actorProvider }) => {
  const dependencies = { db, sdk, actorProvider };
  const auditRepository = new AuditRepository(dependencies);
  return {
    auditRepository,
    caseRepository: new CaseRepository({ ...dependencies, auditRepository }),
    tariffRepository: new TariffRepository({ ...dependencies, auditRepository })
  };
};

const seedLocalTariff = async tariffRepository => {
  if (await tariffRepository.getActive()) return;
  await tariffRepository.createDraft(TARIFF_2026_V1.tariffId, {
    ...structuredClone(TARIFF_2026_V1),
    effectiveFrom: "2026-01-01",
    effectiveUntil: null,
    exclusions: [
      "Tetkikler dahil değildir.",
      "Özellikli malzeme ve patoloji dahil değildir.",
      "Diş operasyonlarında ekstra sarflar dahil değildir."
    ],
    changeNote: "Yerel prototip için değişmez 2026-v1 tarife kopyası."
  });
  await tariffRepository.activate(TARIFF_2026_V1.tariffId);
};

export const createLocalRepositoryRuntime = async options => {
  const memory = createMemoryFirestore(options);
  const repositories = buildRepositories({
    db: memory.db,
    sdk: memory.sdk,
    actorProvider: () => LOCAL_ACTOR
  });
  await seedLocalTariff(repositories.tariffRepository);
  return Object.freeze({ mode: "local", ...repositories, localDebug: memory.inspect });
};

export const createExplicitFirestoreRuntime = ({
  explicitlyEnableFirestore = false,
  projectId,
  db,
  sdk,
  actorProvider
} = {}) => {
  if (explicitlyEnableFirestore !== true) {
    throw new Error("Firestore modu yalnız açık etkinleştirme ile kullanılabilir.");
  }
  if (typeof projectId !== "string" || !SAFE_REMOTE_PROJECT.test(projectId)) {
    throw new Error("Yalnız açıkça belirtilmiş demo- veya staging- proje kimliği kabul edilir.");
  }
  return Object.freeze({ mode: "firestore-explicit", projectId, ...buildRepositories({ db, sdk, actorProvider }) });
};
