import type { ClinicalHistoryEvent, PatientHistoryEvaluation } from "../../services/history.service";

export function HistoryTimeline({ events, evaluations }: { events: ClinicalHistoryEvent[]; evaluations: PatientHistoryEvaluation[] }) {
  if (!events.length && !evaluations.length) return <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">El paciente aún no registra eventos clínicos.</p>;
  return <div className="space-y-4">{events.map((event) => <article className="border-l-2 border-teal-300 pl-4" key={event.id}><p className="font-bold text-slate-700">{event.summary}</p><p className="text-xs text-slate-500">Evento: {event.event_type}{event.evaluation_id ? ` · Evaluación #${event.evaluation_id}` : ""}</p></article>)}{evaluations.map(({ evaluation, results }) => <article className="border-l-2 border-slate-300 pl-4" key={`evaluation-${evaluation.id}`}><p className="font-bold text-slate-700">Evaluación #{evaluation.id}: {evaluation.reason || "Sin motivo registrado"}</p><p className="text-sm text-slate-600">{results.map((result) => `${result.suggested_diagnosis} (${result.risk_level})`).join(" · ") || "Sin resultados procesados"}</p></article>)}</div>;
}
