import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { AlertMessage } from "../../components/common/AlertMessage";
import { Autocomplete, type AutocompleteOption } from "../../components/common/Autocomplete";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { FormTextarea } from "../../components/common/FormTextarea";
import { Skeleton } from "../../components/common/Skeleton";
import { EvaluationFactsPanel } from "../../components/evaluations/EvaluationFactsPanel";
import { useEvaluationFacts } from "../../hooks/useEvaluationFacts";
import { evaluationService } from "../../services/evaluation.service";
import { patientService } from "../../services/patient.service";
import type { ClinicalFactIn, Evaluation, FactDefinition, PersistedInferenceResult } from "../../types/evaluation";
import type { Patient } from "../../types/patient";
import { cn } from "../../utils/cn";
import { getErrorMessage as getResponseErrorMessage } from "../../utils/errors";
import { stripDigits } from "../../utils/text";

const tabs = ["Datos de evaluacion", "Sintomas", "Variables clinicas", "Variables complementarias"] as const;

const complementaryVariableKeys = new Set([
  "hallazgos_ecograficos_renales",
  "sdma",
  "microarn_urinarios",
  "exosomas_urinarios",
  "hemoglobina_glucosilada",
  "microalbuminuria",
  "uacr",
  "upc",
  "vhs",
  "vlas",
  "la_ao",
  "lviddn",
  "lactato",
  "nt_probnp",
  "carga_proviral_qpcr",
  "carga_viral_rt_qpcr",
  "clasificacion_felv",
  "coinfeccion_fiv",
  "qpcr_placa",
  "biomarcadores_bacterianos",
  "treponema",
  "porphyromonas",
  "firmicutes",
  "spirochaetae",
  "synergistetes",
]);

// Solo el módulo de pacientes envía `returnTo`; si se entra directo, no hay a dónde volver.
function readReturnTo(state: unknown) {
  const returnTo = (state as { returnTo?: unknown } | null)?.returnTo;
  if (typeof returnTo !== "string") return null;
  if (returnTo === "/patients") return { to: returnTo, label: "Volver a pacientes" };
  if (returnTo.startsWith("/patients/")) return { to: returnTo, label: "Volver al paciente" };
  return null;
}

export function ClinicalEvaluationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const returnTo = readReturnTo(location.state);
  const [activeTab, setActiveTab] = useState(0);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState(searchParams.get("patientId") ?? "");
  const [reason, setReason] = useState("");
  const [observations, setObservations] = useState("");
  const [values, setValues] = useState<Record<string, string | number | boolean>>({});
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [results, setResults] = useState<PersistedInferenceResult[]>([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const patient = useMemo(() => patients.find((item) => String(item.id) === patientId) ?? null, [patientId, patients]);
  const factQuery = useEvaluationFacts(patient?.species.id);
  const mainClinicalVariables = useMemo(
    () => factQuery.clinicalVariables.filter((fact) => !complementaryVariableKeys.has(fact.fact_key)),
    [factQuery.clinicalVariables]
  );
  const complementaryVariables = useMemo(
    () => factQuery.clinicalVariables.filter((fact) => complementaryVariableKeys.has(fact.fact_key)),
    [factQuery.clinicalVariables]
  );

  useEffect(() => {
    patientService
      .listAll()
      .then(setPatients)
      .catch((cause: unknown) => setError(message(cause)))
      .finally(() => setIsLoadingPatients(false));
  }, []);

  const payloadFacts = useMemo<ClinicalFactIn[]>(() => {
    return [...factQuery.symptoms, ...factQuery.clinicalVariables].flatMap((fact) => {
      const value = values[fact.fact_key];
      return value === undefined || value === "" ? [] : [{ fact_key: fact.fact_key, value, source_type: fact.source_type }];
    });
  }, [factQuery.symptoms, factQuery.clinicalVariables, values]);

  function choosePatient(nextId: string) {
    setPatientId(nextId);
    setValues({});
    setEvaluation(null);
    setResults([]);
    setNotice("");
  }

  function changeFact(fact: FactDefinition, value: string | number | boolean | undefined) {
    setValues((current) => {
      const next = { ...current };
      if (value === undefined) delete next[fact.fact_key];
      else next[fact.fact_key] = value;
      return next;
    });
    setEvaluation(null);
    setResults([]);
  }

  // Pasos 2 a 4: la tarjeta tiene scroll propio y el encabezado queda fijo.
  const isScrollableStep = activeTab > 0;

  function goToTab(nextTab: number) {
    if (nextTab > activeTab && activeTab === 0 && !patientOrReasonValid(patient, reason)) {
      setError("Completa los campos obligatorios: paciente y motivo de consulta.");
      return;
    }
    setError("");
    setActiveTab(nextTab);
  }

  async function saveEvaluation() {
    if (!patient || !reason.trim() || !payloadFacts.length) {
      setError("Selecciona un paciente, registra el motivo y completa al menos un sintoma o variable clinica valida.");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      const created = await evaluationService.create({
        patient_id: patient.id,
        reason: reason.trim(),
        observations: observations.trim() || null,
        facts: payloadFacts,
      });
      setEvaluation(created);
      setNotice("Evaluacion guardada. Ya puede procesarse.");
    } catch (cause) {
      setError(message(cause));
    } finally {
      setIsSaving(false);
    }
  }

  async function processEvaluation() {
    if (!evaluation) {
      setError("Primero guarda la evaluacion clinica.");
      return;
    }
    setIsProcessing(true);
    setError("");
    try {
      await evaluationService.process(evaluation.id);
      const persisted = await evaluationService.listResults(evaluation.id);
      setResults(persisted);
      setNotice("Inferencia hibrida procesada. Ya puede abrir los resultados trazables.");
    } catch (cause) {
      setError(message(cause));
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-3xl font-extrabold text-[#172554]">Evaluacion clinica veterinaria</h1>
        <p className="mt-2 text-slate-500">
          Flujo clinico: datos de evaluacion, sintomas, variables clinicas, variables complementarias y resultados trazables.
        </p>
      </section>

      {notice ? <AlertMessage message={notice} onClose={() => setNotice("")} /> : null}
      {error ? <AlertMessage message={error} onClose={() => setError("")} tone="error" /> : null}

      <nav aria-label="Etapas de evaluacion" className="flex gap-2 overflow-x-auto border-b border-slate-200 pb-3">
        {tabs.map((tab, index) => (
          <button
            aria-current={activeTab === index ? "step" : undefined}
            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-bold ${
              activeTab === index ? "bg-teal-500 text-white" : "bg-slate-100 text-slate-600"
            }`}
            key={tab}
            onClick={() => goToTab(index)}
            type="button"
          >
            {index + 1}. {tab}
          </button>
        ))}
      </nav>

      <Card
        className={cn(
          "p-6 sm:p-8",
          isScrollableStep && "max-h-[calc(100vh-21rem)] min-h-80 overflow-y-auto overscroll-contain"
        )}
        key={activeTab}
      >
        {activeTab === 0 ? (
          <div className="space-y-6">
            <PatientTab
              isLoading={isLoadingPatients}
              patient={patient}
              patients={patients}
              patientId={patientId}
              onChange={choosePatient}
            />
            <div className="border-t border-slate-100 pt-6">
              <FormTextarea
                label="Motivo de consulta"
                onChange={(event) => {
                  setReason(event.target.value);
                  setEvaluation(null);
                  setResults([]);
                }}
                helpText="Ejemplo: poliuria y polidipsia desde hace 2 semanas, perdida de peso progresiva."
                placeholder="Ej. Poliuria, polidipsia y perdida de peso desde hace 2 semanas"
                required
                value={reason}
              />
              <div className="mt-5">
                <FormTextarea
                  label="Observaciones"
                  onChange={(event) => {
                    setObservations(event.target.value);
                    setEvaluation(null);
                    setResults([]);
                  }}
                  helpText="Ejemplo: paciente alerta, mucosas rosadas, apetito disminuido, propietario refiere aumento de consumo de agua."
                  placeholder="Ej. Paciente alerta; mucosas rosadas; apetito disminuido"
                  value={observations}
                />
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === 1 ? (
          <section className="space-y-5">
            <div>
              <h2 className="text-xl font-extrabold text-[#172554]">Sintomas</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Registra solo signos clinicos observados durante la consulta.
              </p>
            </div>
            <EvaluationFactsPanel
              emptyMessage="No hay sintomas activos para esta especie."
              error={factQuery.error}
              facts={factQuery.symptoms}
              isLoading={factQuery.isLoading}
              onChange={changeFact}
              values={values}
            />
          </section>
        ) : null}

        {activeTab === 2 ? (
          <section className="space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-[#172554]">Variables clinicas</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Registra las mediciones clinicas principales tomadas durante la consulta.
              </p>
            </div>
            <EvaluationFactsPanel
              emptyMessage="No hay variables clinicas principales activas para esta especie."
              error={factQuery.error}
              facts={mainClinicalVariables}
              isLoading={factQuery.isLoading}
              onChange={changeFact}
              values={values}
            />
          </section>
        ) : null}

        {activeTab === 3 ? (
          <section className="space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-[#172554]">Variables complementarias</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Registra biomarcadores, mediciones avanzadas o resultados de apoyo diagnostico.
              </p>
            </div>
            <EvaluationFactsPanel
              emptyMessage="No hay variables complementarias activas para esta especie."
              error={factQuery.error}
              facts={complementaryVariables}
              isLoading={factQuery.isLoading}
              onChange={changeFact}
              values={values}
            />
            {evaluation ? (
              <p className="border-t border-slate-100 pt-6 text-sm font-bold text-emerald-700">
                Evaluacion #{evaluation.id} guardada.
              </p>
            ) : null}
          </section>
        ) : null}
      </Card>

      <div className={cn("flex items-center", returnTo ? "justify-between" : "justify-end")}>
        {returnTo ? (
          <Link className="text-sm font-bold text-teal-500" to={returnTo.to}>
            {returnTo.label}
          </Link>
        ) : null}
        {activeTab < 3 ? (
          <div className="flex gap-3">
            {activeTab > 0 ? (
              <Button onClick={() => goToTab(activeTab - 1)} type="button" variant="secondary">
                Atrás
              </Button>
            ) : null}
            <Button onClick={() => goToTab(activeTab + 1)} type="button">
              Siguiente
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap justify-end gap-3">
            <Button onClick={() => goToTab(activeTab - 1)} type="button" variant="secondary">
              Atrás
            </Button>
            <Button disabled={isSaving || Boolean(evaluation)} onClick={saveEvaluation} type="button">
              {isSaving ? "Guardando..." : "Guardar"}
            </Button>
            <Button disabled={!evaluation || isProcessing} onClick={processEvaluation} type="button">
              {isProcessing ? "Procesando..." : "Procesar evaluacion"}
            </Button>
            <Button disabled={!evaluation || !results.length} onClick={() => navigate(`/results?evaluationId=${evaluation?.id}`)}>
              Ir a resultados
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function PatientTab({
  patients,
  patientId,
  patient,
  isLoading,
  onChange,
}: {
  patients: Patient[];
  patientId: string;
  patient: Patient | null;
  isLoading: boolean;
  onChange: (id: string) => void;
}) {
  const patientOptions = useMemo<AutocompleteOption[]>(
    () =>
      patients.map((item) => {
        const ownerName = [item.owner.first_name, item.owner.last_name].filter(Boolean).join(" ");

        return {
          value: String(item.id),
          label: item.name,
          description: [item.species.name, ownerName].filter(Boolean).join(" · "),
        };
      }),
    [patients]
  );

  if (isLoading) return <Skeleton className="h-40" />;

  return (
    <div className="space-y-5">
      <Autocomplete
        emptyMessage="No se encontraron pacientes."
        helpText="Escribe el nombre del paciente o del propietario y selecciona una opción."
        label="Paciente"
        onChange={onChange}
        options={patientOptions}
        placeholder="Buscar paciente..."
        sanitize={stripDigits}
        value={patientId}
      />
      {patient ? (
        <dl className="grid gap-4 rounded-lg bg-slate-50 p-5 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-bold text-slate-500">Propietario</dt>
            <dd className="font-bold text-slate-700">{patient.owner.first_name} {patient.owner.last_name ?? ""}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold text-slate-500">Especie</dt>
            <dd className="font-bold text-slate-700">{patient.species.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold text-slate-500">Paciente</dt>
            <dd className="font-bold text-slate-700">{patient.name}</dd>
          </div>
        </dl>
      ) : (
        <p className="text-sm text-slate-500">
          El propietario se determina a partir del paciente seleccionado; el sistema no permite registrar un propietario independiente del paciente.
        </p>
      )}
    </div>
  );
}

function patientOrReasonValid(patient: Patient | null, reason: string) {
  return Boolean(patient && reason.trim());
}

function message(error: unknown) {
  return getResponseErrorMessage(error, "No fue posible completar la operacion clinica.");
}
