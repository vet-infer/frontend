import type { Evaluation, PersistedInferenceResult } from "../types/evaluation";
import type { Patient } from "../types/patient";
import { evaluationService } from "./evaluation.service";
import { patientService } from "./patient.service";
import { api } from "./api";

export type PatientHistoryEvaluation = {
  evaluation: Evaluation;
  results: PersistedInferenceResult[];
};

export type ClinicalHistoryEvent = { id: number; patient_id: number; evaluation_id?: number | null; event_type: string; summary: string };

export type PatientHistorySummary = {
  patient: Patient;
  evaluations: PatientHistoryEvaluation[];
  events: ClinicalHistoryEvent[];
};

export const historyService = {
  async getPatientHistory(patientId: number): Promise<PatientHistorySummary> {
    const [patient, evaluations, events] = await Promise.all([
      patientService.getById(patientId),
      evaluationService.listByPatient(patientId),
      api.get<ClinicalHistoryEvent[]>(`/api/v1/patients/${patientId}/history`).then((response) => response.data),
    ]);

    const evaluationsWithResults = await Promise.all(
      evaluations.map(async (evaluation) => ({
        evaluation,
        results: await evaluationService.listResults(evaluation.id).catch(() => [] as PersistedInferenceResult[]),
      }))
    );

    return {
      patient,
      events,
      evaluations: evaluationsWithResults.sort(
        (a, b) => new Date(b.evaluation.created_at).getTime() - new Date(a.evaluation.created_at).getTime()
      ),
    };
  },

  async getAllHistories(): Promise<PatientHistorySummary[]> {
    const patients = await patientService.listAll();
    const histories = await Promise.all(patients.map((patient) => this.getPatientHistory(patient.id)));
    return histories;
  },
};
