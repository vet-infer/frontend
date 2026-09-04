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

const numericExamples: Record<string, string> = {
  creatinina: "Ejemplo: 1.4 o 2.4 segun resultado de laboratorio.",
  glucosa: "Ejemplo: 95, 145 o 280 segun resultado de laboratorio.",
  sdma: "Ejemplo: 14 o 18 segun reporte del laboratorio.",
  uacr: "Ejemplo: 0.3 o 1.2 segun medicion urinaria.",
  upc: "Ejemplo: 0.5 o 2.0 segun relacion proteina/creatinina.",
  vhs: "Ejemplo: 10.5 o 12.0 segun medicion radiografica.",
  vlas: "Ejemplo: 2.3 o 3.0 segun evaluacion cardiaca.",
  la_ao: "Ejemplo: 1.4 o 1.9 segun ecocardiografia.",
  lviddn: "Ejemplo: 1.6 o 1.9 segun ecocardiografia.",
  lactato: "Ejemplo: 2.5 o 4.0 segun resultado disponible.",
  nt_probnp: "Ejemplo: 900 o 1500 segun prueba cardiaca.",
};

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
  const label = `${fact.display_name}${fact.unit ? ` (${fact.unit})` : ""}`;
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
        {(fact.allowed_values ?? []).map((option) => <option key={String(option)} value={String(option)}>{String(option)}</option>)}
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
    return `Ejemplo: marcar si ${fact.display_name.toLowerCase()} fue observado en la consulta; dejar sin marcar si no aplica.`;
  }

  if (type === "numeric" || type === "number" || type === "float" || type === "integer" || type === "decimal") {
    return numericExamples[fact.fact_key] ?? `Ejemplo: registrar solo el numero${fact.unit ? ` en ${fact.unit}` : ""}; usar decimales si corresponde.`;
  }

  if (fact.allowed_values?.length) {
    return `Ejemplo: ${fact.allowed_values.slice(0, 3).map(String).join(" / ")}. Selecciona el valor que coincida con la evidencia disponible.`;
  }

  return "Este fact categorico no posee valores permitidos publicados; revisar catalogo antes de registrar.";
}
