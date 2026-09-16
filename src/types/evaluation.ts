export type Evaluation = {
  id: number;
  patient_id: number;
  veterinarian_id?: number;
  reason?: string | null;
  observations?: string | null;
  created_at: string;
  evaluation_date?: string;
  date?: string;
  result?: string;
  risk_level?: string | { id: number; name: string };
  facts?: ClinicalFactOut[];
};

export type ClinicalFactIn = {
  fact_key: string;
  value: string | number | boolean;
  source_type: "symptom" | "clinical_variable" | "clinical_input";
};

export type ClinicalFactOut = ClinicalFactIn & {
  id: number;
};

export type EvaluationPayload = {
  patient_id: number;
  reason?: string | null;
  observations?: string | null;
  facts: ClinicalFactIn[];
};

export type CatalogItem = {
  id: number;
  name: string;
  description?: string | null;
  species_id?: number | null;
  is_active: boolean;
};

export type ClinicalVariable = {
  id: number;
  key: string;
  name: string;
  data_type: string;
  unit?: string | null;
  normal_min?: number | null;
  normal_max?: number | null;
  species_id?: number | null;
  is_active: boolean;
};

export type FactDefinition = {
  id: number;
  fact_key: string;
  display_name: string;
  source_type: ClinicalFactIn["source_type"];
  data_type: string;
  unit?: string | null;
  allowed_values?: Array<string | number | boolean> | null;
  species_id?: number | null;
  is_active: boolean;
};

export type ProcessedResult = {
  enfermedad: string;
  probabilidad?: number | null;
  nivel_riesgo: string;
  resultado_sugerido: string;
  reglas_activadas: string[];
  explicacion?: string | null;
};

export type ProcessEvaluationResponse = {
  evaluacion_id: number;
  metodo_inferencia?: string | null;
  resultados: ProcessedResult[];
};

export type PersistedActivatedRule = {
  id: number;
  rule_id: number;
  fulfilled_conditions: unknown;
  justification: string;
  rule_code?: string | null;
  rule_version?: number | null;
};

export type PersistedInferenceResult = {
  id: number;
  evaluation_id: number;
  patient_id: number;
  disease_id: number;
  risk_level_id: number;
  suggested_diagnosis: string;
  risk_level: string;
  score: number;
  probability?: number | null;
  inference_method?: string | null;
  explanation?: string | null;
  activated_rules: PersistedActivatedRule[];
};
