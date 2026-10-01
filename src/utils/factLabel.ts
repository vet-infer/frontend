import type { FactDefinition } from "../types/evaluation";

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

const OPERATOR_LABELS: Record<string, string> = {
  "==": "es igual a",
  "!=": "es distinto de",
  ">=": "es mayor o igual a",
  "<=": "es menor o igual a",
  ">": "es mayor que",
  "<": "es menor que",
};

export function normalizeAccents(text: string): string {
  return text.replace(/\p{L}+/gu, (word) => ACCENT_FIXES[word.toLowerCase()] ?? word);
}

export function capitalize(text: string): string {
  return text.length ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

export function formatFactLabel(text: string): string {
  return capitalize(normalizeAccents(text));
}

export function labelFromFactKey(factKey: string): string {
  return capitalize(normalizeAccents(factKey.replace(/_/g, " ")));
}

export type FactCatalog = Pick<FactDefinition, "fact_key" | "display_name">[];

export function resolveFactDisplayName(factKey: string, catalog: FactCatalog = []): string {
  const match = catalog.find((item) => item.fact_key === factKey);
  return match ? formatFactLabel(match.display_name) : labelFromFactKey(factKey);
}

function readBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  const text = String(value).trim().toLowerCase();
  if (text === "true") return true;
  if (text === "false") return false;
  return null;
}

/** "Tos" si está presente, "Tos: No" si está ausente, "Temperatura: 39.5" para valores. */
export function formatFact(factKey: string, value: unknown, catalog: FactCatalog = []): string {
  const name = resolveFactDisplayName(factKey, catalog);
  const flag = readBoolean(value);

  if (flag === true) return name;
  if (flag === false) return `${name}: No`;
  return `${name}: ${String(value)}`;
}

export function formatCondition(condition: string, catalog: FactCatalog = []): string {
  const match = condition.match(/^\s*([^\s=!<>]+)\s*(==|!=|>=|<=|>|<)\s*(.+?)\s*$/);
  if (!match) {
    return condition;
  }

  const [, factKey, operator, value] = match;
  const flag = readBoolean(value);
  if (flag !== null && (operator === "==" || operator === "!=")) {
    return formatFact(factKey, operator === "==" ? flag : !flag, catalog);
  }

  const operatorLabel = OPERATOR_LABELS[operator];
  if (!operatorLabel) {
    return condition;
  }

  return `${resolveFactDisplayName(factKey, catalog)} ${operatorLabel} ${value}`;
}
