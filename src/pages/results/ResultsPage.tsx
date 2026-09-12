import {
  ArrowLeft,
  Calendar,
  Check,
  ClipboardPlus,
  FileDown,
  FileClock,
  FlaskConical,
  HeartHandshake,
  Info,
  LineChart,
  PawPrint,
  Scale,
  Search,
  Settings,
  UserRound,
  VenusAndMars,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertMessage } from "../../components/common/AlertMessage";
import { Card } from "../../components/common/Card";
import { DataTable } from "../../components/common/DataTable";
import { EmptyState } from "../../components/common/EmptyState";
import { IconBadge } from "../../components/common/IconBadge";
import { Skeleton } from "../../components/common/Skeleton";
import { evaluationService } from "../../services/evaluation.service";
import { patientService } from "../../services/patient.service";
import type { ClinicalFactOut, Evaluation, PersistedInferenceResult } from "../../types/evaluation";
import type { Patient } from "../../types/patient";
import { cn } from "../../utils/cn";
import { calculateAge, formatDate as formatDateWithTime } from "../../utils/clinical";
import { getErrorMessage } from "../../utils/errors";
import { downloadEvaluationPdf } from "../../utils/evaluationPdf";

const AnatomicalViewer3D = lazy(() =>
  import("../../components/evaluations/AnatomicalViewer3D").then((module) => ({
    default: module.AnatomicalViewer3D,
  })),
);

function getOwnerName(patient: Patient) {
  return [patient.owner.first_name, patient.owner.last_name].filter(Boolean).join(" ") || "Sin propietario";
}

function getInitial(patient: Patient) {
  return patient.name.charAt(0).toUpperCase();
}

function formatDate(value?: string | null) {
  return formatDateWithTime(value, true);
}

function getRiskTone(riskLevel?: string | null) {
  const risk = riskLevel?.toLowerCase() ?? "";

  if (risk.includes("alto")) {
    return {
      label: "Riesgo alto",
      className: "bg-red-50 text-red-700",
      iconClassName: "bg-red-50 text-red-600",
    };
  }

  if (risk.includes("moder")) {
    return {
      label: "Riesgo moderado",
      className: "bg-amber-50 text-amber-700",
      iconClassName: "bg-amber-50 text-amber-600",
    };
  }

  return {
    label: "Riesgo bajo",
    className: "bg-emerald-50 text-emerald-700",
    iconClassName: "bg-emerald-50 text-emerald-600",
  };
}

function probabilityLabel(probability?: number | null) {
  return probability == null ? "No disponible" : `${(probability * 100).toFixed(1)}%`;
}

function riskRangeLabel(riskLevel?: string | null) {
  const risk = riskLevel?.toLowerCase() ?? "";
  if (risk.includes("alto")) return "70% a 100%";
  if (risk.includes("moder")) return "40% a menos de 70%";
  return "0% a menos de 40%";
}


function factLabel(fact: ClinicalFactOut) {
  return `${fact.fact_key}: ${String(fact.value)}`;
}

function splitFacts(facts: ClinicalFactOut[] = []) {
  return {
    symptoms: facts.filter((fact) => fact.source_type === "symptom"),
    variables: facts.filter((fact) => fact.source_type !== "symptom"),
  };
}

function primaryResult(results: PersistedInferenceResult[]) {
  return [...results].sort((a, b) => (b.probability ?? -1) - (a.probability ?? -1) || b.score - a.score)[0] ?? null;
}

type ResultListRow = {
  evaluation: Evaluation;
  patient: Patient;
  result: PersistedInferenceResult;
};

export function ResultsPage() {
  const [searchParams] = useSearchParams();
  const evaluationId = searchParams.get("evaluationId");
  const parsedEvaluationId = evaluationId ? Number(evaluationId) : null;
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [results, setResults] = useState<PersistedInferenceResult[]>([]);
  const [resultRows, setResultRows] = useState<ResultListRow[]>([]);
  const [query, setQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadResults() {
      if (!parsedEvaluationId || Number.isNaN(parsedEvaluationId)) {
        setIsLoading(true);
        setError("");

        try {
          const [evaluationData, patientData] = await Promise.all([
            evaluationService.list(),
            patientService.listAll(),
          ]);
          const patientById = new Map(patientData.map((item) => [item.id, item]));
          const resultEntries = await Promise.all(
            evaluationData.map(async (item) => {
              try {
                const itemResults = await evaluationService.listResults(item.id);
                return [item, primaryResult(itemResults)] as const;
              } catch {
                return [item, null] as const;
              }
            })
          );

          if (isMounted) {
            setResultRows(
              resultEntries
                .map(([item, itemResult]) => {
                  const itemPatient = patientById.get(item.patient_id);

                  return itemResult && itemPatient
                    ? {
                        evaluation: item,
                        patient: itemPatient,
                        result: itemResult,
                      }
                    : null;
                })
                .filter((item): item is ResultListRow => Boolean(item))
                .sort(
                  (first, second) =>
                    new Date(second.evaluation.created_at).getTime() -
                    new Date(first.evaluation.created_at).getTime()
                )
            );
          }
        } catch (caughtError) {
          if (isMounted) {
            setError(getErrorMessage(caughtError, "No fue posible cargar los resultados."));
          }
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }

        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const evaluationData = await evaluationService.getById(parsedEvaluationId);
        const [patientData, resultData] = await Promise.all([
          patientService.getById(evaluationData.patient_id),
          evaluationService.listResults(parsedEvaluationId),
        ]);

        if (isMounted) {
          setEvaluation(evaluationData);
          setPatient(patientData);
          setResults(resultData);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(getErrorMessage(caughtError, "No fue posible cargar los resultados."));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadResults();

    return () => {
      isMounted = false;
    };
  }, [parsedEvaluationId]);

  const result = useMemo(() => primaryResult(results), [results]);
  const facts = splitFacts(evaluation?.facts ?? []);
  const riskTone = getRiskTone(result?.risk_level);
  const filteredResultRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return resultRows.filter((row) => {
      const matchesQuery = normalizedQuery
        ? [
            row.patient.name,
            getOwnerName(row.patient),
            row.patient.species.name,
            row.patient.breed?.name,
            row.result.suggested_diagnosis,
          ]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(normalizedQuery))
        : true;
      const matchesRisk = riskFilter ? getRiskTone(row.result.risk_level).label === riskFilter : true;

      return matchesQuery && matchesRisk;
    });
  }, [query, resultRows, riskFilter]);

  if (!evaluationId || Number.isNaN(parsedEvaluationId)) {
    return (
      <ResultsListView
        error={error}
        filteredRows={filteredResultRows}
        isLoading={isLoading}
        onQueryChange={setQuery}
        onRiskFilterChange={setRiskFilter}
        query={query}
        riskFilter={riskFilter}
        rows={resultRows}
      />
    );
  }

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  if (error) {
    return <AlertMessage message={error} tone="error" />;
  }

  if (!evaluation || !patient) {
    return <AlertMessage message="No se encontro la evaluacion solicitada." tone="error" />;
  }

  if (!result) {
    return (
      <div className="space-y-6">
        <PageHeader patientId={patient.id} />
        <Card className="grid min-h-80 place-items-center p-8 text-center">
          <EmptyState
            action={
              <Link
                className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-600"
                to={`/evaluations?patientId=${patient.id}`}
              >
                <ClipboardPlus size={18} />
                Nueva evaluacion
              </Link>
            }
            description="Esta evaluacion existe, pero aun no tiene resultados persistidos. Procesala desde la pantalla de evaluacion clinica."
            descriptionClassName="max-w-lg"
            icon={LineChart}
            title="Evaluacion sin resultados procesados"
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        onDownloadPdf={() => downloadEvaluationPdf({ evaluation, patient, results })}
        patientId={patient.id}
      />

      <Card className="p-6 sm:p-8">
        <div className="grid gap-6 xl:grid-cols-[1.1fr_1.6fr]">
          <div className="flex items-center gap-5 border-b border-slate-100 pb-6 xl:border-b-0 xl:border-r xl:pb-0 xl:pr-8">
            <span className="grid h-28 w-28 shrink-0 place-items-center rounded-full bg-teal-50 text-5xl font-extrabold text-teal-700">
              {getInitial(patient)}
            </span>
            <div>
              <h2 className="text-3xl font-extrabold text-[#172554]">{patient.name}</h2>
              <p className="mt-2 flex items-center gap-2 text-lg font-semibold text-slate-500">
                <PawPrint size={20} />
                {patient.species.name} · {patient.breed?.name ?? "Sin raza"}
              </p>
              <p className="mt-2 flex items-center gap-2 text-lg font-semibold text-slate-500">
                <UserRound size={20} />
                {getOwnerName(patient)}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <InfoTile icon={Calendar} label="Fecha de procesamiento" value={formatDate(evaluation.created_at)} />
            <InfoTile icon={VenusAndMars} label="Sexo" value={patient.sex || "Sin registrar"} />
            <InfoTile icon={ClipboardPlus} label="Edad" value={calculateAge(patient.birth_date)} />
            <InfoTile icon={Scale} label="Peso" value={patient.weight ? `${patient.weight} kg` : "Sin registrar"} />
          </div>
        </div>
      </Card>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={ClipboardPlus} label="Resultado sugerido" value={result.suggested_diagnosis} />
        <SummaryCard icon={AlertTriangle} iconClassName={riskTone.iconClassName} label="Nivel de riesgo">
          <span className={cn("inline-flex rounded-md px-3 py-1 text-sm font-bold", riskTone.className)}>
            {riskTone.label}
          </span>
        </SummaryCard>
        <SummaryCard icon={LineChart} iconClassName="bg-blue-50 text-blue-600" label="Probabilidad calculada" value={probabilityLabel(result.probability)} />
        <SummaryCard icon={Settings} label="Motor aplicado" value={result.inference_method ?? "Reglas IF-THEN + inferencia clinica"} />
      </section>

      <Card className="p-6">
        <div className="flex gap-5">
          <IconBadge className="h-14 w-14 shrink-0 text-teal-700" icon={Info} iconSize={30} />
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-extrabold text-[#172554]">Explicacion del resultado</h2>
            <p className="mt-3 leading-7 text-slate-600">
              {result.explanation ||
                "El resultado sugerido se obtuvo a partir de los sintomas y variables clinicas registradas en la evaluacion."}
            </p>
            <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
              El {probabilityLabel(result.probability)} se ubica en el rango de riesgo {result.risk_level.toLowerCase()} ({riskRangeLabel(result.risk_level)}). Las reglas IF-THEN y las variables registradas sustentan esta inferencia; no reemplaza el juicio profesional del médico veterinario.
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 flex items-center gap-3 text-xl font-extrabold text-[#172554]">
          <PawPrint size={24} />
          Zona corporal afectada
        </h2>
        <Suspense fallback={<Skeleton className="h-72 w-full rounded-lg" />}>
          <AnatomicalViewer3D
            species={patient.species.name}
            riskLevel={result.risk_level}
            regions={result.regions ?? []}
            secondaryRegions={result.secondary_regions ?? []}
          />
        </Suspense>
      </Card>

      <section className="grid gap-5 xl:grid-cols-[1fr_1.05fr]">
        <Card className="p-6">
          <h2 className="mb-4 flex items-center gap-3 text-xl font-extrabold text-[#172554]">
            <Scale size={24} />
            Reglas activadas
          </h2>
          {result.activated_rules.length === 0 ? (
            <p className="rounded-lg bg-slate-50 p-4 text-sm font-semibold text-slate-500">No hay reglas activadas asociadas.</p>
          ) : (
            <DataTable
              columns={["Regla", "Condiciones cumplidas", "Justificacion"]}
              rows={result.activated_rules}
              renderRow={(rule) => (
                <tr key={rule.id}>
                  <td className="whitespace-nowrap px-5 py-3 font-bold text-slate-700">{rule.rule_code ?? `#${rule.rule_id}`}</td>
                  <td className="px-5 py-3">{Array.isArray(rule.fulfilled_conditions) ? rule.fulfilled_conditions.map(String).join(" · ") : String(rule.fulfilled_conditions ?? "Condiciones registradas")}</td>
                  <td className="px-5 py-3">{rule.justification || "Regla activada por condiciones cumplidas."}</td>
                </tr>
              )}
            />
          )}
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 flex items-center gap-3 text-xl font-extrabold text-[#172554]">
            <FlaskConical size={24} />
            Variables consideradas
          </h2>
          <FactGroup facts={facts.symptoms} title="Sintomas observados" tone="green" />
          <FactGroup facts={facts.variables} title="Variables clinicas" tone="violet" />
        </Card>
      </section>

      <Card className="p-6">
        <div className="flex gap-5">
          <IconBadge className="h-14 w-14 shrink-0" icon={HeartHandshake} iconSize={28} />
          <div>
            <h2 className="text-xl font-extrabold text-[#172554]">Recomendacion de seguimiento</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Se recomienda realizar una evaluacion clinica complementaria y confirmar el diagnostico con el medico
              veterinario antes de definir el manejo definitivo del paciente.
            </p>
          </div>
        </div>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Link
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-teal-700 shadow-sm transition hover:bg-teal-50"
          to="/results"
        >
          <ArrowLeft size={18} />
          Volver a resultados
        </Link>
        <Link
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-teal-700 shadow-sm transition hover:bg-teal-50"
          to={`/patients/${patient.id}/history`}
        >
          <FileClock size={18} />
          Ver historial clinico
        </Link>
      </div>
    </div>
  );
}

type ResultsListViewProps = {
  error: string;
  filteredRows: ResultListRow[];
  isLoading: boolean;
  onQueryChange: (value: string) => void;
  onRiskFilterChange: (value: string) => void;
  query: string;
  riskFilter: string;
  rows: ResultListRow[];
};

function ResultsListView({
  error,
  filteredRows,
  isLoading,
  onQueryChange,
  onRiskFilterChange,
  query,
  riskFilter,
  rows,
}: ResultsListViewProps) {
  const highRiskCount = rows.filter((row) => getRiskTone(row.result.risk_level).label === "Riesgo alto").length;
  const moderateRiskCount = rows.filter((row) => getRiskTone(row.result.risk_level).label === "Riesgo moderado").length;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-normal text-[#172554]">Resultados clinicos</h1>
          <p className="mt-2 text-base text-slate-500">
            Consulta las evaluaciones procesadas y prioriza los casos segun el nivel de riesgo.
          </p>
        </div>
        <Link
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-600"
          to="/evaluations"
        >
          <ClipboardPlus size={20} />
          Nueva evaluacion
        </Link>
      </section>

      {error ? <AlertMessage message={error} tone="error" /> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={LineChart} label="Resultados procesados" value={String(rows.length)} />
        <SummaryCard icon={AlertTriangle} iconClassName="bg-red-50 text-red-600" label="Riesgo alto" value={String(highRiskCount)} />
        <SummaryCard icon={AlertTriangle} iconClassName="bg-amber-50 text-amber-600" label="Riesgo moderado" value={String(moderateRiskCount)} />
        <SummaryCard icon={Check} iconClassName="bg-emerald-50 text-emerald-600" label="Visibles en lista" value={String(filteredRows.length)} />
      </section>

      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
          <label className="relative block min-w-[260px] flex-1">
            <span className="mb-2 block text-sm font-bold text-slate-700">Buscar resultado</span>
            <Search className="pointer-events-none absolute bottom-3.5 left-4 text-slate-400" size={20} />
            <input
              className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-12 pr-4 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Paciente, propietario o diagnostico..."
              value={query}
            />
          </label>
          <label className="block min-w-[210px]">
            <span className="mb-2 block text-sm font-bold text-slate-700">Nivel de riesgo</span>
            <select
              className="h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
              onChange={(event) => onRiskFilterChange(event.target.value)}
              value={riskFilter}
            >
              <option value="">Todos los riesgos</option>
              <option value="Riesgo bajo">Bajo</option>
              <option value="Riesgo moderado">Moderado</option>
              <option value="Riesgo alto">Alto</option>
            </select>
          </label>
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-extrabold text-[#172554]">Resultados encontrados</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
              {filteredRows.length} registros
            </span>
          </div>
        </div>

        {isLoading ? <Skeleton className="h-72" /> : null}

        {!isLoading && filteredRows.length === 0 ? (
          <div className="grid min-h-72 place-items-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-6 text-center">
            <EmptyState
              action={
                <Link
                  className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-600"
                  to="/evaluations"
                >
                  <ClipboardPlus size={18} />
                  Crear evaluacion
                </Link>
              }
              description="Cuando una evaluacion clinica tenga resultados persistidos, aparecera en este listado."
              icon={LineChart}
              title="No hay resultados procesados"
            />
          </div>
        ) : null}

        {!isLoading && filteredRows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-[1120px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-sm font-bold text-slate-600">
                  <th className="px-4 py-4">Paciente</th>
                  <th className="px-4 py-4">Propietario</th>
                  <th className="px-4 py-4">Fecha</th>
                  <th className="px-4 py-4">Diagnostico sugerido</th>
                  <th className="px-4 py-4">Riesgo</th>
                  <th className="px-4 py-4">Motor</th>
                  <th className="px-4 py-4">Accion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {filteredRows.map((row) => {
                  const tone = getRiskTone(row.result.risk_level);

                  return (
                    <tr key={row.evaluation.id}>
                      <td className="px-4 py-5">
                        <div className="flex items-center gap-3">
                          <span className="grid h-12 w-12 place-items-center rounded-full bg-teal-50 text-lg font-extrabold text-teal-700">
                            {getInitial(row.patient)}
                          </span>
                          <div>
                            <p className="font-bold text-slate-800">{row.patient.name}</p>
                            <p className="text-xs font-semibold text-slate-500">
                              {row.patient.species.name} · {row.patient.breed?.name ?? "Sin raza"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-5 font-semibold">{getOwnerName(row.patient)}</td>
                      <td className="whitespace-nowrap px-4 py-5 font-semibold">{formatDate(row.evaluation.created_at)}</td>
                      <td className="max-w-[260px] px-4 py-5 font-semibold">{row.result.suggested_diagnosis}</td>
                      <td className="px-4 py-5">
                        <span className={cn("inline-flex rounded-md px-3 py-1 text-xs font-bold", tone.className)}>
                          {tone.label}
                        </span>
                      </td>
                      <td className="max-w-[220px] px-4 py-5 font-semibold">
                        {row.result.inference_method ?? "Reglas IF-THEN + inferencia clinica"}
                      </td>
                      <td className="px-4 py-5">
                        <Link
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-teal-200 bg-white px-4 text-sm font-semibold text-teal-500 shadow-sm transition hover:bg-teal-50"
                          to={`/results?evaluationId=${row.evaluation.id}`}
                        >
                          Ver resultado
                          <ChevronRight size={17} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="border-t border-slate-100 px-3 py-4 text-sm font-semibold text-slate-500">
              Mostrando 1 a {filteredRows.length} de {filteredRows.length} resultados
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

function PageHeader({ onDownloadPdf, patientId }: { onDownloadPdf?: () => void; patientId?: number }) {
  return (
    <section className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
      <div>
        <div className="mb-3 flex items-center gap-2 text-sm font-bold">
          <Link className="text-teal-500 hover:text-teal-700" to="/results">
            Resultados
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-slate-500">Detalle del resultado</span>
        </div>
        <h1 className="text-2xl font-extrabold leading-tight tracking-normal text-[#172554]">
          Resultado de la evaluacion
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Interpretacion generada a partir de la evaluacion clinica procesada.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        {onDownloadPdf ? (
          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-teal-700 shadow-sm transition hover:bg-teal-50"
            onClick={onDownloadPdf}
            type="button"
          >
            <FileDown size={20} />
            Descargar PDF
          </button>
        ) : null}
        <Link
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-600"
          to={patientId ? `/evaluations?patientId=${patientId}` : "/evaluations"}
        >
          <ClipboardPlus size={20} />
          Nueva evaluacion
        </Link>
        <Link
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-teal-700 shadow-sm transition hover:bg-teal-50"
          to={patientId ? `/patients/${patientId}/history` : "/history"}
        >
          <FileClock size={20} />
          Ver historial clinico
        </Link>
      </div>
    </section>
  );
}

function InfoTile({ icon: Icon, label, value }: { icon: typeof Calendar; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 border-b border-slate-100 px-2 py-3">
      <Icon className="shrink-0 text-teal-500" size={25} />
      <div>
        <p className="text-sm font-semibold text-slate-500">{label}</p>
        <p className="mt-1 font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  iconClassName,
  label,
  value,
  children,
}: {
  icon: typeof ClipboardPlus;
  iconClassName?: string;
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-4">
        <IconBadge className={cn("h-16 w-16 shrink-0", iconClassName)} icon={Icon} iconSize={29} />
        <div>
          <p className="text-sm font-bold text-slate-500">{label}</p>
          {children ?? <p className="mt-2 text-xl font-extrabold text-teal-700">{value}</p>}
        </div>
      </div>
    </Card>
  );
}

function FactGroup({ facts, title, tone }: { facts: ClinicalFactOut[]; title: string; tone: "green" | "violet" }) {
  return (
    <div className="mb-5 last:mb-0">
      <h3 className="mb-3 text-sm font-bold text-slate-600">{title}</h3>
      {facts.length === 0 ? (
        <p className="text-sm font-semibold text-slate-400">Sin datos registrados.</p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {facts.map((fact) => (
            <span
              className={cn(
                "rounded-md px-4 py-2 text-sm font-bold",
                tone === "green" ? "bg-emerald-50 text-emerald-700" : "bg-teal-50 text-teal-500"
              )}
              key={fact.id}
            >
              {factLabel(fact)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
