import type { ClinicalFactOut, PersistedInferenceResult } from "../types/evaluation";
import type { Patient } from "../types/patient";

export function getOwnerName(patient: Patient) {
  return [patient.owner.first_name, patient.owner.last_name].filter(Boolean).join(" ") || "Sin propietario";
}

export function calculateAge(birthDate?: string | null) {
  if (!birthDate) {
    return "Sin fecha";
  }

  const birth = new Date(`${birthDate}T00:00:00`);
  const today = new Date();
  let years = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    years -= 1;
  }

  if (years <= 0) {
    const months = Math.max(
      0,
      (today.getFullYear() - birth.getFullYear()) * 12 + today.getMonth() - birth.getMonth()
    );
    return `${months || 1} ${months === 1 ? "mes" : "meses"}`;
  }

  return `${years} ${years === 1 ? "año" : "años"}`;
}

export function formatDate(value?: string | null, withTime = false, monthFormat: "2-digit" | "short" = "2-digit") {
  if (!value) {
    return "Sin registrar";
  }

  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: monthFormat,
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(value.includes("T") ? value : `${value}T00:00:00`));
}

export function primaryResult(results: PersistedInferenceResult[]) {
  return [...results].sort((a, b) => (b.probability ?? -1) - (a.probability ?? -1) || b.score - a.score)[0] ?? null;
}

export function riskLabel(risk?: string | null) {
  const normalized = risk?.toLowerCase() ?? "";

  if (normalized.includes("alto")) {
    return "Alto";
  }

  if (normalized.includes("moder")) {
    return "Moderado";
  }

  if (normalized.includes("bajo")) {
    return "Bajo";
  }

  return "Sin riesgo";
}

export function riskClasses(risk?: string | null) {
  const label = riskLabel(risk).toLowerCase();

  if (label.includes("alto")) {
    return "bg-red-50 text-red-700";
  }

  if (label.includes("moder")) {
    return "bg-amber-50 text-amber-700";
  }

  if (label.includes("bajo")) {
    return "bg-emerald-50 text-emerald-700";
  }

  return "bg-slate-100 text-slate-500";
}

export function factSummary(facts: ClinicalFactOut[] = []) {
  const symptoms = facts.filter((fact) => fact.source_type === "symptom").map((fact) => fact.fact_key);
  return symptoms.length ? symptoms.join(", ") : "Sin sintomas registrados.";
}
