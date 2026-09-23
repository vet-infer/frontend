import type {
  CatalogItem,
  CatalogStatusPayload,
  ClinicalVariable,
  FactDefinition,
  Evaluation,
  EvaluationPayload,
  PersistedInferenceResult,
  ProcessEvaluationResponse,
} from "../types/evaluation";
import { api } from "./api";

export const evaluationService = {
  async create(payload: EvaluationPayload) {
    const { data } = await api.post<Evaluation>("/api/v1/evaluations", payload);
    return data;
  },

  async getById(evaluationId: number) {
    const { data } = await api.get<Evaluation>(`/api/v1/evaluations/${evaluationId}`);
    return data;
  },

  async list() {
    const { data } = await api.get<Evaluation[]>("/api/v1/evaluations");
    return data;
  },

  async listByPatient(patientId: number) {
    const { data } = await api.get<Evaluation[]>(`/api/v1/patients/${patientId}/evaluations`);
    return data;
  },

  async process(evaluationId: number) {
    const { data } = await api.post<ProcessEvaluationResponse>(`/api/v1/evaluaciones/${evaluationId}/procesar`);
    return data;
  },

  async listResults(evaluationId: number) {
    const { data } = await api.get<PersistedInferenceResult[]>(`/api/v1/evaluations/${evaluationId}/results`);
    return data;
  },

  async listSymptoms() {
    const { data } = await api.get<CatalogItem[]>("/api/v1/symptoms");
    return data;
  },

  async listSymptomsAdmin() {
    const { data } = await api.get<CatalogItem[]>("/api/v1/symptoms/admin");
    return data;
  },

  async updateSymptomStatus(symptomId: number, payload: CatalogStatusPayload) {
    const { data } = await api.patch<CatalogItem>(`/api/v1/symptoms/${symptomId}/status`, payload);
    return data;
  },

  async listClinicalVariables() {
    const { data } = await api.get<ClinicalVariable[]>("/api/v1/clinical-variables");
    return data;
  },

  async getEvaluationFacts(speciesId: number) {
    const { data } = await api.get<FactDefinition[]>("/api/v1/evaluation-facts", {
      params: { species_id: speciesId },
    });
    return data;
  },

  async getEvaluationSymptoms(speciesId: number) {
    const { data } = await api.get<FactDefinition[]>("/api/v1/evaluation-symptoms", {
      params: { species_id: speciesId },
    });
    return data;
  },

  async getEvaluationClinicalVariables(speciesId: number) {
    const { data } = await api.get<FactDefinition[]>("/api/v1/evaluation-clinical-variables", {
      params: { species_id: speciesId },
    });
    return data;
  },
};
