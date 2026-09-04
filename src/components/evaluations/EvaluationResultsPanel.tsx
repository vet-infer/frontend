import { Link } from "react-router-dom";
import type { PersistedInferenceResult } from "../../types/evaluation";
import { ActivatedRulesPanel } from "./ActivatedRulesPanel";

type EvaluationResultsPanelProps = {
  evaluationId?: number;
  results: PersistedInferenceResult[];
};

function riskRange(riskLevel: string) {
  const normalizedRisk = riskLevel.toLowerCase();
  if (normalizedRisk.includes("alto")) return "70% a 100%";
  if (normalizedRisk.includes("moder")) return "40% a menos de 70%";
  return "0% a menos de 40%";
}

export function EvaluationResultsPanel({ evaluationId, results }: EvaluationResultsPanelProps) {
  if (!results.length) {
    return <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">Aún no existen resultados procesados.</p>;
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-violet-100 bg-violet-50 p-5">
        <p className="text-sm font-extrabold text-brand-500">Paso 3 · Resultado de la inferencia</p>
        <h2 className="mt-1 text-lg font-extrabold text-[#172554]">Revisa la sugerencia y su evidencia clínica</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          El motor ya procesó los facts registrados y guardó {results.length === 1 ? "una sugerencia" : `${results.length} sugerencias`} para esta evaluación. El resultado sugerido orienta la priorización; revisa el riesgo, la probabilidad y las reglas que explican por qué se generó antes de tomar una decisión clínica.
        </p>
        {evaluationId ? (
          <Link className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-600" to={`/results?evaluationId=${evaluationId}`}>
            Abrir detalle trazable del resultado
          </Link>
        ) : null}
      </section>

      <section className="grid gap-3 rounded-lg border border-slate-200 bg-white p-5 text-sm sm:grid-cols-3">
        <div><p className="font-extrabold text-slate-700">1. Sugerencia y riesgo</p><p className="mt-1 leading-5 text-slate-500">Identifican el hallazgo priorizado por el motor.</p></div>
        <div><p className="font-extrabold text-slate-700">2. Probabilidad y método</p><p className="mt-1 leading-5 text-slate-500">Muestran el peso del cálculo y cómo se obtuvo.</p></div>
        <div><p className="font-extrabold text-slate-700">3. Reglas activadas</p><p className="mt-1 leading-5 text-slate-500">Relacionan la conclusión con las condiciones clínicas cumplidas.</p></div>
      </section>

      {[...results].sort((a, b) => (b.probability ?? -1) - (a.probability ?? -1) || b.score - a.score).map((result) => (
        <article className="rounded-lg border border-slate-200 p-5" key={result.id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h3 className="font-extrabold text-slate-800">{result.suggested_diagnosis}</h3><p className="mt-2 text-sm text-slate-600">{result.explanation}</p></div>
            <span className="rounded-full bg-violet-50 px-3 py-1 text-sm font-bold text-violet-700">Riesgo {result.risk_level} · {riskRange(result.risk_level)}</span>
          </div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="font-semibold text-slate-500">Probabilidad Bayes</dt><dd className="font-bold text-slate-700">{result.probability == null ? "No disponible" : `${(result.probability * 100).toFixed(1)}%`}</dd></div>
            <div><dt className="font-semibold text-slate-500">Método</dt><dd className="font-bold text-slate-700">{result.inference_method ?? "No registrado"}</dd></div>
          </dl>
          <h4 className="mt-5 font-bold text-slate-700">Reglas activadas</h4>
          <p className="mt-1 text-sm text-slate-500">Las condiciones cumplidas en estas reglas sustentan la evidencia clínica del resultado.</p>
          <div className="mt-3"><ActivatedRulesPanel rules={result.activated_rules} /></div>
        </article>
      ))}
    </div>
  );
}
