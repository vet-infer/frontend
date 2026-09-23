import {
  ArrowLeft,
  BarChart3,
  Calendar,
  ClipboardPlus,
  Eye,
  FileClock,
  Info,
  LineChart,
  PawPrint,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { AlertMessage } from "../../components/common/AlertMessage";
import { Card } from "../../components/common/Card";
import { Skeleton } from "../../components/common/Skeleton";
import { historyService, type PatientHistoryEvaluation, type PatientHistorySummary } from "../../services/history.service";
import {
  calculateAge,
  factSummary,
  formatDate,
  getOwnerName,
  primaryResult,
  riskClasses,
  riskLabel,
} from "../../utils/clinical";
import { getErrorMessage } from "../../utils/errors";
import { useEvaluationFacts } from "../../hooks/useEvaluationFacts";

export function PatientHistoryPage() {
  const { patientId } = useParams();
  const parsedPatientId = patientId ? Number(patientId) : null;
  const [history, setHistory] = useState<PatientHistorySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadHistory() {
      if (!parsedPatientId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const data = await historyService.getPatientHistory(parsedPatientId);

        if (isMounted) {
          setHistory(data);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(getErrorMessage(caughtError, "No fue posible cargar el historial del paciente."));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      isMounted = false;
    };
  }, [parsedPatientId]);

  const factCatalog = useEvaluationFacts(history?.patient.species.id).data;

  const filteredEvaluations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return (history?.evaluations ?? []).filter((item) => {
      const result = primaryResult(item.results);
      const matchesQuery = normalizedQuery
        ? [item.evaluation.reason, result?.suggested_diagnosis, factSummary(item.evaluation.facts, factCatalog)]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(normalizedQuery))
        : true;
      const matchesRisk = riskFilter ? riskLabel(result?.risk_level) === riskFilter : true;

      return matchesQuery && matchesRisk;
    });
  }, [history?.evaluations, factCatalog, query, riskFilter]);

  const latest = history?.evaluations[0];
  const latestResult = latest ? primaryResult(latest.results) : null;
  const totalRules = history?.evaluations.reduce(
    (sum, item) => sum + item.results.reduce((rules, result) => rules + result.activated_rules.length, 0),
    0
  );

  if (!parsedPatientId || Number.isNaN(parsedPatientId)) {
    return <Navigate replace to="/history" />;
  }

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  if (error || !history) {
    return <AlertMessage message={error || "No se encontro historial para el paciente."} tone="error" />;
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <Link className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-teal-500" to="/history">
            <ArrowLeft size={18} />
            Historial clinico
          </Link>
          <h1 className="text-3xl font-extrabold tracking-normal text-[#172554]">Detalle del historial clinico</h1>
          <p className="mt-2 text-base text-slate-500">
            Consulta la evolucion clinica, evaluaciones y resultados previos del paciente.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-600"
            to={`/evaluations?patientId=${history.patient.id}`}
          >
            <ClipboardPlus size={19} />
            Nueva evaluacion
          </Link>
          <Link
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-teal-200 bg-white px-4 py-2 text-sm font-semibold text-teal-500 shadow-sm transition hover:bg-teal-50"
            to={latest ? `/results?evaluationId=${latest.evaluation.id}` : "/results"}
          >
            <LineChart size={19} />
            Ver resultados
          </Link>
        </div>
      </section>

      <Card className="p-6 sm:p-8">
        <div className="grid gap-6 xl:grid-cols-[1.2fr_2fr]">
          <div className="flex items-center gap-5">
            <span className="grid h-24 w-24 place-items-center rounded-full bg-teal-50 text-4xl font-extrabold text-teal-700">
              {history.patient.name.charAt(0).toUpperCase()}
            </span>
            <div>
              <p className="text-sm font-bold text-slate-500">Paciente</p>
              <h2 className="text-2xl font-extrabold text-[#172554]">{history.patient.name}</h2>
              <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-500">
                <PawPrint size={18} />
                {history.patient.species.name} · {history.patient.breed?.name ?? "Sin raza"}
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <InfoMini label="Propietario" value={getOwnerName(history.patient)} />
            <InfoMini label="Sexo" value={history.patient.sex || "Sin registrar"} />
            <InfoMini label="Edad" value={calculateAge(history.patient.birth_date)} />
            <InfoMini label="Peso" value={history.patient.weight ? `${history.patient.weight} kg` : "Sin registrar"} />
            <InfoMini label="Fecha de registro" value={formatDate(history.patient.created_at)} />
          </div>
        </div>
      </Card>

      <section className="grid gap-5 xl:grid-cols-[1fr_0.48fr]">
        <Card className="p-5 sm:p-6">
          <h2 className="mb-5 flex items-center gap-3 text-xl font-extrabold text-[#172554]">
            <FileClock size={24} />
            Linea de tiempo clinica
          </h2>
          <div className="mb-6 grid gap-3 md:grid-cols-[1fr_220px]">
            <input
              className="h-12 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por motivo o resultado..."
              value={query}
            />
            <select
              className="h-12 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
              onChange={(event) => setRiskFilter(event.target.value)}
              value={riskFilter}
            >
              <option value="">Todos los riesgos</option>
              <option value="Bajo">Bajo</option>
              <option value="Moderado">Moderado</option>
              <option value="Alto">Alto</option>
            </select>
          </div>

          {filteredEvaluations.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
              <p className="font-bold text-[#172554]">Sin evaluaciones registradas</p>
              <p className="mt-2 text-sm text-slate-500">Cuando se registre una evaluacion, aparecera en esta linea de tiempo.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEvaluations.map((item, index) => (
                <TimelineItem catalog={factCatalog} item={item} index={index + 1} key={item.evaluation.id} />
              ))}
            </div>
          )}
        </Card>

        <aside className="space-y-5">
          <Card className="p-5">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-extrabold text-[#172554]">
              <BarChart3 size={24} />
              Resumen del historial
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <SummaryBox label="Evaluaciones totales" value={String(history.evaluations.length)} />
              <SummaryBox label="Ultimo resultado" value={latestResult?.suggested_diagnosis ?? "Sin resultado"} />
              <SummaryBox label="Riesgo mas reciente" value={riskLabel(latestResult?.risk_level)} />
              <SummaryBox label="Ultima evaluacion" value={latest ? formatDate(latest.evaluation.created_at) : "Sin registro"} />
              <SummaryBox label="Reglas activadas acumuladas" value={String(totalRules ?? 0)} />
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 flex items-center gap-3 text-xl font-extrabold text-[#172554]">
              <Info size={24} />
              Observacion general
            </h2>
            <p className="text-sm leading-6 text-slate-600">
              Este historial clinico refleja la evolucion del paciente segun las evaluaciones realizadas en el sistema. La
              informacion presentada apoya la trazabilidad clinica, pero no reemplaza el juicio profesional veterinario.
            </p>
          </Card>
        </aside>
      </section>
    </div>
  );
}

function TimelineItem({ catalog, item, index }: { catalog: ReturnType<typeof useEvaluationFacts>["data"]; item: PatientHistoryEvaluation; index: number }) {
  const result = primaryResult(item.results);

  return (
    <div className="grid gap-4 sm:grid-cols-[44px_1fr]">
      <div className="flex flex-col items-center">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-teal-500 text-sm font-bold text-white">
          {index}
        </span>
        <span className="mt-2 h-full w-px bg-teal-100" />
      </div>
      <div className="rounded-lg border border-slate-100 bg-white p-5 shadow-[0_8px_22px_rgba(15,23,42,0.04)]">
        <div className="grid gap-4 lg:grid-cols-[150px_1fr_1fr_170px_140px] lg:items-center">
          <div>
            <p className="font-bold text-[#172554]">{formatDate(item.evaluation.created_at)}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              <Calendar className="mr-1 inline" size={14} />
              {formatDate(item.evaluation.created_at, true).split(",").at(-1)?.trim()}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500">Motivo de consulta</p>
            <p className="mt-1 font-bold text-slate-700">{item.evaluation.reason || "Sin motivo registrado"}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500">Sintomas observados</p>
            <p className="mt-1 text-sm font-semibold text-slate-600">{factSummary(item.evaluation.facts, catalog)}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500">Resultado sugerido</p>
            <p className="mt-1 font-bold text-slate-700">{result?.suggested_diagnosis ?? "Sin resultado procesado"}</p>
            <p className="mt-2 text-xs font-semibold text-slate-500">
              Reglas activadas {result?.activated_rules.length ?? 0}
            </p>
          </div>
          <div className="space-y-3">
            <span className={`inline-flex rounded-md px-3 py-1 text-xs font-bold ${riskClasses(result?.risk_level)}`}>
              Riesgo {riskLabel(result?.risk_level).toLowerCase()}
            </span>
            <Link
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-teal-200 bg-white px-3 text-xs font-bold text-teal-500 transition hover:bg-teal-50"
              to={`/results?evaluationId=${item.evaluation.id}`}
            >
              <Eye size={15} />
              Ver resultado
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoMini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-2 font-bold text-[#172554]">{value}</p>
    </div>
  );
}

function SummaryBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-extrabold text-[#172554]">{value}</p>
    </div>
  );
}
