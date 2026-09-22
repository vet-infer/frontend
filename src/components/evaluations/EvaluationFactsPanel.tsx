import type { ChangeEvent } from "react";
import { Skeleton } from "../common/Skeleton";
import type { FactDefinition } from "../../types/evaluation";

type Props = {
  facts: FactDefinition[];
  values: Record<string, string | number | boolean>;
  onChange: (fact: FactDefinition, value: string | number | boolean | undefined) => void;
  isLoading: boolean;
  error: string;
  emptyMessage?: string;
};

const ACCENT_FIXES: Record<string, string> = {
  perdida: "pérdida",
  cardiaco: "cardíaco",
  cardiaca: "cardíaca",
  pequena: "pequeña",
  pequeno: "pequeño",
  disminucion: "disminución",
  sincope: "síncope",
  recesion: "recesión",
  vacunacion: "vacunación",
  cronica: "crónica",
  cronico: "crónico",
  oidos: "oídos",
  otico: "ótico",
  otica: "ótica",
  secrecion: "secreción",
  pabellon: "pabellón",
  simetrica: "simétrica",
  frio: "frío",
  vomito: "vómito",
  fosforo: "fósforo",
  inorganico: "inorgánico",
  inorganica: "inorgánica",
  ecograficos: "ecográficos",
  ecografico: "ecográfico",
  ecografica: "ecográfica",
  radiograficos: "radiográficos",
  radiografico: "radiográfico",
  radiografica: "radiográfica",
  toracicos: "torácicos",
  toracico: "torácico",
  toracica: "torácica",
  sanguinea: "sanguínea",
  sanguineo: "sanguíneo",
  coinfeccion: "coinfección",
  clasificacion: "clasificación",
  citologia: "citología",
};

const OPTION_LABEL_OVERRIDES: Record<string, string> = {
  "high positive": "Positivo alto",
  "low positive": "Positivo bajo",
};

const LAB_DEPENDENT_FACTS = new Set(["carga_proviral_qpcr", "carga_viral_rt_qpcr", "hemoglobina_glucosilada"]);

const CLINICAL_REFERENCE_FALLBACKS: Record<string, string> = {
  nt_probnp: "Ejemplo: valores sanos tipicos rondan 240 pmol/L; el corte de referencia (IDEXX Cardiopet) es menor a 900 pmol/L.",
  uacr: "Ejemplo: valor normal menor a 30 mg/g; entre 30 y 300 mg/g indica microalbuminuria.",
};

function normalizeAccents(text: string): string {
  return text.replace(/\p{L}+/gu, (word) => ACCENT_FIXES[word.toLowerCase()] ?? word);
}

function capitalize(text: string): string {
  return text.length ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

function formatFactLabel(text: string): string {
  return capitalize(normalizeAccents(text));
}

function optionLabel(value: unknown): string {
  const raw = String(value);
  return OPTION_LABEL_OVERRIDES[raw] ?? raw;
}

export function EvaluationFactsPanel({ facts, values, onChange, isLoading, error, emptyMessage = "No hay facts activos para esta especie." }: Props) {
  if (isLoading) return <Skeleton className="h-52" />;
  if (error) return <p className="rounded-lg bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>;
  if (facts.length === 0) return <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">{emptyMessage}</p>;

  return (
    <div className="grid gap-5 md:grid-cols-2">
      {facts.map((fact) => <FactInput fact={fact} key={fact.id} onChange={onChange} value={values[fact.fact_key]} />)}
    </div>
  );
}

function FactInput({ fact, value, onChange }: { fact: FactDefinition; value: string | number | boolean | undefined; onChange: Props["onChange"] }) {
  const type = fact.data_type.toLowerCase();
  const label = `${formatFactLabel(fact.display_name)}${fact.unit ? ` (${fact.unit})` : ""}`;
  const helpText = factHelpText(fact, type);

  if (type === "boolean" || type === "bool") {
    return (
      <label className="block rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
        <span className="flex min-h-7 items-center gap-3">
          <input checked={value === true} className="h-5 w-5" onChange={(event) => onChange(fact, event.target.checked ? true : undefined)} type="checkbox" />
          {label}
        </span>
        <span className="mt-2 block text-xs font-medium leading-5 text-slate-500">{helpText}</span>
      </label>
    );
  }

  if (type === "numeric" || type === "number" || type === "float" || type === "integer" || type === "decimal") {
    return (
      <label className="block text-sm font-bold text-slate-700">
        {label}
        <input
          className="mt-2 h-12 w-full rounded-lg border border-slate-200 px-4"
          onChange={(event) => onNumericChange(event, fact, onChange)}
          placeholder={numericPlaceholder(fact)}
          step="any"
          type="number"
          value={typeof value === "number" ? value : ""}
        />
        <span className="mt-2 block text-xs font-medium leading-5 text-slate-500">{helpText}</span>
      </label>
    );
  }

  return (
    <label className="block text-sm font-bold text-slate-700">
      {label}
      <select className="mt-2 h-12 w-full rounded-lg border border-slate-200 px-4" onChange={(event) => onChange(fact, event.target.value || undefined)} value={typeof value === "string" ? value : ""}>
        <option value="">Seleccionar...</option>
        {(fact.allowed_values ?? []).map((option) => <option key={String(option)} value={String(option)}>{optionLabel(option)}</option>)}
      </select>
      <span className={`mt-2 block text-xs font-medium leading-5 ${fact.allowed_values?.length ? "text-slate-500" : "text-amber-700"}`}>
        {helpText}
      </span>
    </label>
  );
}

function onNumericChange(event: ChangeEvent<HTMLInputElement>, fact: FactDefinition, onChange: Props["onChange"]) {
  const raw = event.target.value;
  onChange(fact, raw === "" ? undefined : Number(raw));
}

function numericPlaceholder(fact: FactDefinition) {
  if (fact.fact_key === "glucosa") return "Ej. 95, 145 o 280";
  if (fact.fact_key === "creatinina") return "Ej. 1.0, 1.4 o 2.4";
  if (fact.fact_key === "la_ao") return "Ej. 1.4 o 1.9";
  if (fact.fact_key === "sdma") return "Ej. 14 o 18";
  return fact.unit ? `Valor en ${fact.unit}` : "Ej. 1.5";
}

function factHelpText(fact: FactDefinition, type: string) {
  if (type === "boolean" || type === "bool") {
    return `Ejemplo: marcar si ${normalizeAccents(fact.display_name).toLowerCase()} fue observado en la consulta; dejar sin marcar si no aplica.`;
  }

  if (type === "numeric" || type === "number" || type === "float" || type === "integer" || type === "decimal") {
    return numericHelpText(fact);
  }

  if (fact.allowed_values?.length) {
    return `Ejemplo: ${fact.allowed_values.slice(0, 3).map(optionLabel).join(" / ")}. Selecciona el valor que coincida con la evidencia disponible.`;
  }

  return "Este fact categorico no posee valores permitidos publicados; revisar catalogo antes de registrar.";
}

function numericHelpText(fact: FactDefinition): string {
  if (LAB_DEPENDENT_FACTS.has(fact.fact_key)) {
    return "Ejemplo: el valor de referencia depende del ensayo o laboratorio utilizado; consultar el rango que reporta el kit o proveedor.";
  }

  const hasMin = typeof fact.normal_min === "number";
  const hasMax = typeof fact.normal_max === "number";
  const unitSuffix = fact.unit ? ` ${fact.unit}` : "";

  if (hasMin && hasMax) {
    return `Ejemplo: rango de referencia entre ${fact.normal_min} y ${fact.normal_max}${unitSuffix} segun laboratorio para esta especie.`;
  }
  if (hasMax) {
    return `Ejemplo: valor de referencia hasta ${fact.normal_max}${unitSuffix} segun laboratorio para esta especie.`;
  }
  if (hasMin) {
    return `Ejemplo: valor de referencia desde ${fact.normal_min}${unitSuffix} segun laboratorio para esta especie.`;
  }

  return CLINICAL_REFERENCE_FALLBACKS[fact.fact_key] ?? `Ejemplo: registrar solo el numero${unitSuffix ? ` en ${fact.unit}` : ""}; usar decimales si corresponde.`;
}
