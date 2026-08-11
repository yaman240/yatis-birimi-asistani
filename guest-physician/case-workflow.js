import { CASE_STATUS } from "./repository-utils.js";

export class CaseWorkflow {
  constructor({ caseRepository, tariffRepository }) {
    if (!caseRepository || !tariffRepository) throw new TypeError("Vaka ve tarife repository gereklidir.");
    this.caseRepository = caseRepository;
    this.tariffRepository = tariffRepository;
    this.currentCase = null;
    this.activeTariff = null;
  }

  async initialize() {
    this.activeTariff = await this.tariffRepository.getActive();
    if (!this.activeTariff) throw new Error("Aktif Misafir Hekim tarifesi bulunamadı.");
    return this.activeTariff;
  }

  async saveDraft(snapshot) {
    if (!this.currentCase) {
      this.currentCase = await this.caseRepository.createDraft(snapshot);
      return this.currentCase;
    }
    if (this.currentCase.status !== CASE_STATUS.DRAFT) throw new Error("Yalnız taslak vaka kaydedilebilir.");
    await this.caseRepository.updateDraft(this.currentCase.id, snapshot);
    this.currentCase = { id: this.currentCase.id, ...await this.caseRepository.getById(this.currentCase.id) };
    return this.currentCase;
  }

  async finalize() {
    if (this.currentCase?.status !== CASE_STATUS.DRAFT) throw new Error("Yalnız taslak vaka kesinleştirilebilir.");
    await this.caseRepository.finalize(this.currentCase.id);
    this.currentCase = { id: this.currentCase.id, ...await this.caseRepository.getById(this.currentCase.id) };
    return this.currentCase;
  }

  async cancel(reason = "") {
    if (![CASE_STATUS.DRAFT, CASE_STATUS.FINALIZED].includes(this.currentCase?.status)) {
      throw new Error("Bu vaka iptal edilemez.");
    }
    await this.caseRepository.cancel(this.currentCase.id, reason);
    this.currentCase = { id: this.currentCase.id, ...await this.caseRepository.getById(this.currentCase.id) };
    return this.currentCase;
  }

  newCase() {
    this.currentCase = null;
  }
}
