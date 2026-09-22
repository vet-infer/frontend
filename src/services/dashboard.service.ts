import { PawPrint, ClipboardPlus, TriangleAlert, Users } from "lucide-react";
import type { DashboardData, RecentEvaluation, RecentPatient, SummaryCard, WeekRange } from "../types/dashboard";
import type { Evaluation, PersistedInferenceResult } from "../types/evaluation";
import type { Owner } from "../types/owner";
import type { Patient } from "../types/patient";
import { evaluationService } from "./evaluation.service";
import { ownerService } from "./owner.service";
import { patientService } from "./patient.service";

const emptyDashboard: DashboardData = {
  recentEvaluations: [],
  recentPatients: [],
};

function formatDate(value?: string | null) {
  if (!value) {
    return "Sin fecha";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function scopeChange(count: number, week?: WeekRange) {
  return week ? `${count} esta semana` : `${count} en total`;
}

function readEvaluationDate(evaluation: Evaluation) {
  return evaluation.evaluation_date ?? evaluation.created_at ?? evaluation.date;
}

function isWithinWeek(value: string | null | undefined, week?: WeekRange) {
  if (!week || !value) {
    return true;
  }

  const date = new Date(value);

  return !Number.isNaN(date.getTime()) && date >= week.start && date <= week.end;
}

function normalizeRisk(value?: string | null): "low" | "moderate" | "high" {
  const risk = value?.toLowerCase() ?? "";

  if (risk.includes("alto") || risk.includes("high")) {
    return "high";
  }

  if (risk.includes("moderado") || risk.includes("medium") || risk.includes("moderate")) {
    return "moderate";
  }

  return "low";
}

function pickMainResult(results: PersistedInferenceResult[]) {
  return [...results].sort((first, second) => (second.probability ?? second.score ?? 0) - (first.probability ?? first.score ?? 0))[0];
}

function readName(value: unknown, fallback = "Sin registrar") {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object" && "name" in value && typeof value.name === "string") {
    return value.name;
  }

  return fallback;
}

function speciesBreed(patient: Patient) {
  return `${readName(patient.species, "Especie sin registrar")} / ${readName(patient.breed, "Raza sin registrar")}`;
}

function mapPatient(patient: Patient, evaluationsByPatient: Map<number, Evaluation[]>): RecentPatient {
  const ownerName = [patient.owner.first_name, patient.owner.last_name].filter(Boolean).join(" ") || "Sin propietario";
  const lastEvaluation = evaluationsByPatient.get(patient.id)?.[0];

  return {
    id: patient.id,
    patient: patient.name,
    speciesBreed: speciesBreed(patient),
    owner: ownerName || "Sin propietario",
    lastEvaluation: lastEvaluation ? formatDate(lastEvaluation.created_at) : "Sin evaluaciones",
  };
}

function buildEvaluationsByPatient(evaluations: Evaluation[]) {
  return evaluations.reduce((accumulator, evaluation) => {
    const current = accumulator.get(evaluation.patient_id) ?? [];
    current.push(evaluation);
    accumulator.set(evaluation.patient_id, current);
    return accumulator;
  }, new Map<number, Evaluation[]>());
}

async function readResultsByEvaluation(evaluations: Evaluation[]) {
  const entries = await Promise.all(
    evaluations.map(async (evaluation) => {
      try {
        const results = await evaluationService.listResults(evaluation.id);
        return [evaluation.id, results] as const;
      } catch {
        return [evaluation.id, [] as PersistedInferenceResult[]] as const;
      }
    })
  );

  return new Map(entries);
}

function countCreatedThisWeek<T extends { created_at?: string | null }>(items: T[], week?: WeekRange) {
  return items.filter((item) => isWithinWeek(item.created_at, week)).length;
}

function getPatientActivityDate(patient: Patient, evaluationsByPatient: Map<number, Evaluation[]>) {
  const lastEvaluationDate = evaluationsByPatient.get(patient.id)?.[0]?.created_at;

  return new Date(lastEvaluationDate ?? patient.created_at).getTime();
}

export const dashboardService = {
  async getDashboard(week?: WeekRange): Promise<DashboardData> {
    try {
      const [patients, evaluations] = await Promise.all([patientService.listAll(), evaluationService.list()]);
      const weeklyEvaluations = evaluations.filter((evaluation) => isWithinWeek(readEvaluationDate(evaluation), week));
      const evaluationsByPatient = buildEvaluationsByPatient(evaluations);
      const weeklyEvaluationsByPatient = buildEvaluationsByPatient(weeklyEvaluations);
      const patientById = new Map(patients.map((patient) => [patient.id, patient]));
      const resultsByEvaluation = await readResultsByEvaluation(weeklyEvaluations.slice(0, 5));

      const recentEvaluations = weeklyEvaluations.slice(0, 5).map((evaluation): RecentEvaluation => {
        const patient = patientById.get(evaluation.patient_id);
        const mainResult = pickMainResult(resultsByEvaluation.get(evaluation.id) ?? []);

        return {
          id: evaluation.id,
          patient: patient?.name ?? `Paciente #${evaluation.patient_id}`,
          speciesBreed: patient ? speciesBreed(patient) : "Sin datos clinicos",
          date: formatDate(evaluation.created_at),
          result: mainResult?.suggested_diagnosis ?? evaluation.reason ?? "Pendiente de diagnostico",
          risk: normalizeRisk(mainResult?.risk_level),
        };
      });

      const recentPatients = [...patients]
        .filter((patient) => isWithinWeek(patient.created_at, week) || weeklyEvaluationsByPatient.has(patient.id))
        .sort((first, second) => getPatientActivityDate(second, evaluationsByPatient) - getPatientActivityDate(first, evaluationsByPatient))
        .slice(0, 5)
        .map((patient) => mapPatient(patient, evaluationsByPatient));

      return {
        recentPatients,
        recentEvaluations,
      };
    } catch {
      return emptyDashboard;
    }
  },

  async getSummary(week?: WeekRange): Promise<SummaryCard[]> {
    try {
      const [owners, patients, evaluations] = await Promise.all([
        ownerService.listAll(),
        patientService.listAll(),
        evaluationService.list(),
      ]);
      const weeklyEvaluations = evaluations.filter((evaluation) => isWithinWeek(readEvaluationDate(evaluation), week));
      const resultsByEvaluation = await readResultsByEvaluation(weeklyEvaluations);
      const highRiskCases = [...resultsByEvaluation.values()].filter((results) =>
        results.some((result) => normalizeRisk(result.risk_level) === "high")
      ).length;
      const highRiskCasesThisWeek = weeklyEvaluations.filter((evaluation) => {
        const results = resultsByEvaluation.get(evaluation.id) ?? [];
        return results.some((result) => normalizeRisk(result.risk_level) === "high");
      }).length;

      return [
        {
          label: "Propietarios registrados",
          value: String(countCreatedThisWeek<Owner>(owners, week)),
          change: scopeChange(countCreatedThisWeek<Owner>(owners, week), week),
          tone: "primary",
          icon: Users,
        },
        {
          label: "Pacientes registrados",
          value: String(countCreatedThisWeek<Patient>(patients, week)),
          change: scopeChange(countCreatedThisWeek<Patient>(patients, week), week),
          tone: "primary",
          icon: PawPrint,
        },
        {
          label: "Evaluaciones realizadas",
          value: String(weeklyEvaluations.length),
          change: scopeChange(weeklyEvaluations.length, week),
          tone: "primary",
          icon: ClipboardPlus,
        },
        {
          label: "Casos con riesgo alto",
          value: String(highRiskCases),
          change: scopeChange(highRiskCasesThisWeek, week),
          tone: "danger",
          icon: TriangleAlert,
        },
      ];
    } catch {
      return [];
    }
  },
};



