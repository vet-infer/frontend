import { Calendar, Cat, ChevronRight, Dog, Eraser, FileClock, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertMessage } from "../../components/common/AlertMessage";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { FormSelect } from "../../components/common/FormSelect";
import { historyService, type PatientHistorySummary } from "../../services/history.service";
import { calculateAge, formatDate, getOwnerName, primaryResult, riskClasses, riskLabel } from "../../utils/clinical";
import { getErrorMessage as getResponseErrorMessage } from "../../utils/errors";

type HistoryRow = PatientHistorySummary & {
  latestDate: string | null;
  latestResult: string;
  latestRisk: string;
  latestEvaluationId?: number;
};

function getErrorMessage(error: unknown) {
  return getResponseErrorMessage(error, "No fue posible cargar el historial clinico.");
}

function toHistoryRow(history: PatientHistorySummary): HistoryRow {
  const latest = history.evaluations[0];
  const result = latest ? primaryResult(latest.results) : null;

  return {
    ...history,
    latestDate: latest?.evaluation.created_at ?? null,
    latestResult: result?.suggested_diagnosis ?? (latest ? "Sin resultado procesado" : "Sin evaluaciones"),
    latestRisk: result?.risk_level ?? "Sin riesgo",
    latestEvaluationId: latest?.evaluation.id,
  };
}

export function HistoryPage() {
  const [searchParams] = useSearchParams();
  const queryPatientId = searchParams.get("patientId");
  const [histories, setHistories] = useState<PatientHistorySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [speciesFilter, setSpeciesFilter] = useState("");
  const [riskFilter, setRiskFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadHistory() {
      setIsLoading(true);
      setError("");

      try {
        const data = queryPatientId
          ? [await historyService.getPatientHistory(Number(queryPatientId))]
          : await historyService.getAllHistories();

        if (isMounted) {
          setHistories(data);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(getErrorMessage(caughtError));
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
  }, [queryPatientId]);

  const rows = useMemo(() => histories.map(toHistoryRow), [histories]);
  const owners = useMemo(() => Array.from(new Set(rows.map((row) => getOwnerName(row.patient)))).sort(), [rows]);
  const species = useMemo(() => Array.from(new Set(rows.map((row) => row.patient.species.name))).sort(), [rows]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return rows.filter((row) => {
      const latestTime = row.latestDate ? new Date(row.latestDate).getTime() : null;
      const fromTime = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null;
      const toTime = toDate ? new Date(`${toDate}T23:59:59`).getTime() : null;

      const matchesQuery = normalizedQuery
        ? [row.patient.name, row.patient.breed?.name, getOwnerName(row.patient), row.latestResult]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(normalizedQuery))
        : true;

      const matchesOwner = ownerFilter ? getOwnerName(row.patient) === ownerFilter : true;
      const matchesSpecies = speciesFilter ? row.patient.species.name === speciesFilter : true;
      const matchesRisk = riskFilter ? riskLabel(row.latestRisk) === riskFilter : true;
      const matchesFrom = fromTime && latestTime ? latestTime >= fromTime : true;
      const matchesTo = toTime && latestTime ? latestTime <= toTime : true;

      return matchesQuery && matchesOwner && matchesSpecies && matchesRisk && matchesFrom && matchesTo;
    });
  }, [fromDate, ownerFilter, query, riskFilter, rows, speciesFilter, toDate]);

  function clearFilters() {
    setQuery("");
    setOwnerFilter("");
    setSpeciesFilter("");
    setRiskFilter("");
    setFromDate("");
    setToDate("");
  }

  return (
    <div className="space-y-6">
      <section>
        <div>
          <h1 className="text-3xl font-extrabold tracking-normal text-[#172554]">Historial clinico</h1>
          <p className="mt-2 text-base text-slate-500">
            Consulta el historial clinico completo de los pacientes registrados.
          </p>
        </div>
      </section>

      {error ? <AlertMessage message={error} tone="error" onClose={() => setError("")} /> : null}

      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:flex-wrap xl:items-end 2xl:flex-nowrap">
          <label className="relative block min-w-[260px] flex-1">
            <span className="mb-2 block text-sm font-bold text-slate-700">Buscar paciente</span>
            <Search className="pointer-events-none absolute bottom-3.5 left-4 text-slate-400" size={20} />
            <input
              className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-12 pr-4 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#4635D3] focus:ring-4 focus:ring-[#4635D3]/10"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nombre del paciente..."
              value={query}
            />
          </label>
          <FormSelect
            className="min-w-[210px]"
            label="Propietario"
            onChange={(event) => setOwnerFilter(event.target.value)}
            value={ownerFilter}
          >
            <option value="">Todos los propietarios</option>
            {owners.map((owner) => (
              <option key={owner} value={owner}>
                {owner}
              </option>
            ))}
          </FormSelect>
          <FormSelect
            className="min-w-[170px]"
            label="Especie"
            onChange={(event) => setSpeciesFilter(event.target.value)}
            value={speciesFilter}
          >
            <option value="">Todas las especies</option>
            {species.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </FormSelect>
          <FormSelect
            className="min-w-[180px]"
            label="Nivel de riesgo"
            onChange={(event) => setRiskFilter(event.target.value)}
            value={riskFilter}
          >
            <option value="">Todos los riesgos</option>
            <option value="Bajo">Bajo</option>
            <option value="Moderado">Moderado</option>
            <option value="Alto">Alto</option>
          </FormSelect>
          <DateRangePicker
            fromDate={fromDate}
            onChange={(from, to) => {
              setFromDate(from);
              setToDate(to);
            }}
            toDate={toDate}
          />
          <Button
            aria-label="Limpiar filtros"
            className="h-12 w-12 shrink-0 p-0"
            onClick={clearFilters}
            title="Limpiar filtros"
            type="button"
            variant="secondary"
          >
            <Eraser size={18} />
            <span className="sr-only">Limpiar filtros</span>
          </Button>
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-extrabold text-[#172554]">Historiales encontrados</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-500">
              {filteredRows.length} registros
            </span>
          </div>
        </div>

        {isLoading ? <HistoryLoadingState /> : null}

        {!isLoading && filteredRows.length === 0 ? (
          <div className="grid min-h-72 place-items-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-6 text-center">
            <div>
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-violet-50 text-[#4635D3]">
                <FileClock size={30} />
              </span>
              <h2 className="mt-5 text-xl font-extrabold text-[#172554]">Sin historial clinico</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                No se encontraron evaluaciones para los filtros seleccionados.
              </p>
            </div>
          </div>
        ) : null}

        {!isLoading && filteredRows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-[1120px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-sm font-extrabold text-slate-600">
                  <th className="px-4 py-4">Paciente</th>
                  <th className="px-4 py-4">Propietario</th>
                  <th className="px-4 py-4">Especie</th>
                  <th className="px-4 py-4">Ultima evaluacion</th>
                  <th className="px-4 py-4">Numero de evaluaciones</th>
                  <th className="px-4 py-4">Ultimo resultado</th>
                  <th className="px-4 py-4">Ultimo nivel de riesgo</th>
                  <th className="px-4 py-4">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {filteredRows.map((row) => (
                  <tr key={row.patient.id}>
                    <td className="px-4 py-5">
                      <div className="flex items-center gap-3">
                        <span className="grid h-12 w-12 place-items-center rounded-full bg-violet-50 text-lg font-extrabold text-[#3026A6]">
                          {row.patient.name.charAt(0).toUpperCase()}
                        </span>
                        <div>
                          <p className="font-extrabold text-slate-800">{row.patient.name}</p>
                          <p className="text-xs font-semibold text-slate-500">
                            {row.patient.breed?.name ?? "Sin raza"} · {calculateAge(row.patient.birth_date)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-5 font-semibold">{getOwnerName(row.patient)}</td>
                    <td className="px-4 py-5">
                      <span className="inline-flex items-center gap-2 font-semibold">
                        {row.patient.species.name.toLowerCase().includes("gat") ? <Cat size={18} /> : <Dog size={18} />}
                        {row.patient.species.name}
                      </span>
                    </td>
                    <td className="px-4 py-5 font-semibold">{formatDate(row.latestDate, true)}</td>
                    <td className="px-4 py-5 font-semibold">{row.evaluations.length}</td>
                    <td className="px-4 py-5 font-semibold">{row.latestResult}</td>
                    <td className="px-4 py-5">
                      <span className={`inline-flex rounded-md px-3 py-1 text-xs font-extrabold ${riskClasses(row.latestRisk)}`}>
                        {riskLabel(row.latestRisk)}
                      </span>
                    </td>
                    <td className="px-4 py-5">
                      <Link
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-violet-200 bg-white px-4 text-sm font-semibold text-[#4635D3] shadow-sm transition hover:bg-violet-50"
                        to={`/patients/${row.patient.id}/history`}
                      >
                        <FileClock size={17} />
                        Ver historial
                        <ChevronRight size={17} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-slate-100 px-3 py-4 text-sm font-semibold text-slate-500">
              Mostrando 1 a {filteredRows.length} de {filteredRows.length} registros
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

type DateRangePickerProps = {
  fromDate: string;
  toDate: string;
  onChange: (fromDate: string, toDate: string) => void;
};

function formatRangeLabel(fromDate: string, toDate: string) {
  if (!fromDate && !toDate) {
    return "Seleccionar rango";
  }

  const format = (value: string) =>
    new Intl.DateTimeFormat("es-CO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(`${value}T00:00:00`));

  if (fromDate && toDate) {
    return `${format(fromDate)} - ${format(toDate)}`;
  }

  return fromDate ? `Desde ${format(fromDate)}` : `Hasta ${format(toDate)}`;
}

function DateRangePicker({ fromDate, toDate, onChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(fromDate);
  const [draftTo, setDraftTo] = useState(toDate);

  useEffect(() => {
    setDraftFrom(fromDate);
    setDraftTo(toDate);
  }, [fromDate, toDate]);

  function applyRange() {
    onChange(draftFrom, draftTo);
    setIsOpen(false);
  }

  function clearRange() {
    setDraftFrom("");
    setDraftTo("");
    onChange("", "");
    setIsOpen(false);
  }

  return (
    <div className="relative min-w-[280px]">
      <span className="mb-2 block text-sm font-bold text-slate-700">Rango de fechas</span>
      <button
        className="inline-flex h-12 w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:border-[#4635D3] focus:outline-none focus:ring-4 focus:ring-[#4635D3]/10"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span className="inline-flex min-w-0 items-center gap-2">
          <Calendar className="shrink-0 text-slate-400" size={18} />
          <span className="truncate">{formatRangeLabel(fromDate, toDate)}</span>
        </span>
        {(fromDate || toDate) ? (
          <span className="rounded-full bg-violet-50 px-2 py-1 text-xs font-extrabold text-[#4635D3]">Activo</span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-20 w-full rounded-lg border border-slate-100 bg-white p-4 shadow-2xl">
          <div className="grid gap-3">
            <label className="block">
              <span className="mb-2 block text-xs font-extrabold text-slate-500">Desde</span>
              <input
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-[#4635D3] focus:ring-4 focus:ring-[#4635D3]/10"
                onChange={(event) => {
                  const nextFrom = event.target.value;
                  setDraftFrom(nextFrom);

                  if (draftTo && nextFrom && draftTo < nextFrom) {
                    setDraftTo(nextFrom);
                  }
                }}
                type="date"
                value={draftFrom}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-extrabold text-slate-500">Hasta</span>
              <input
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-[#4635D3] focus:ring-4 focus:ring-[#4635D3]/10"
                min={draftFrom || undefined}
                onChange={(event) => setDraftTo(event.target.value)}
                type="date"
                value={draftTo}
              />
            </label>
          </div>
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button className="min-h-10 px-3" onClick={clearRange} type="button" variant="secondary">
              Limpiar
            </Button>
            <Button className="min-h-10 px-3" onClick={applyRange} type="button">
              Aplicar
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function HistoryLoadingState() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div className="h-20 animate-pulse rounded-lg bg-slate-100" key={index} />
      ))}
    </div>
  );
}
