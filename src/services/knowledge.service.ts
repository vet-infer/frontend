import type { KnowledgeBaseData, Disease, RiskLevel, Rule, RulePayload, RuleStatusPayload } from "../types/knowledge";
import { api } from "./api";
import { evaluationService } from "./evaluation.service";

export const knowledgeService = {
  async listDiseases() {
    const { data } = await api.get<Disease[]>("/api/v1/diseases");
    return data;
  },

  async listRules() {
    const { data } = await api.get<Rule[]>("/api/v1/rules");
    return data;
  },

  async getRule(ruleId: number) {
    const { data } = await api.get<Rule>(`/api/v1/rules/${ruleId}`);
    return data;
  },

  async createRule(payload: RulePayload) {
    const { data } = await api.post<Rule>("/api/v1/rules", payload);
    return data;
  },

  async updateRule(ruleId: number, payload: Partial<RulePayload>) {
    const { data } = await api.put<Rule>(`/api/v1/rules/${ruleId}`, payload);
    return data;
  },

  async updateRuleStatus(ruleId: number, payload: RuleStatusPayload) {
    const { data } = await api.patch<Rule>(`/api/v1/rules/${ruleId}/status`, payload);
    return data;
  },

  async listRiskLevels() {
    const { data } = await api.get<RiskLevel[]>("/api/v1/risk-levels");
    return data;
  },

  async getKnowledgeBase(includeRules = false): Promise<KnowledgeBaseData> {
    const [diseases, symptoms, clinicalVariables, rules, riskLevels] = await Promise.all([
      this.listDiseases(),
      includeRules ? evaluationService.listSymptomsAdmin() : evaluationService.listSymptoms(),
      evaluationService.listClinicalVariables(),
      includeRules ? this.listRules() : Promise.resolve([]),
      this.listRiskLevels(),
    ]);

    return {
      diseases,
      symptoms,
      clinicalVariables,
      rules,
      riskLevels,
    };
  },
};
