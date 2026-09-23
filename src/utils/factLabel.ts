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

export function formatCondition(condition: string, catalog: FactCatalog = []): string {
  const match = condition.match(/^\s*([^\s=!<>]+)\s*(==|!=|>=|<=|>|<)\s*(.+?)\s*$/);
  if (!match) {
    return condition;
  }

  const [, factKey, operator, value] = match;
  const operatorLabel = OPERATOR_LABELS[operator];
  if (!operatorLabel) {
    return condition;
  }

  return `${resolveFactDisplayName(factKey, catalog)} ${operatorLabel} ${value}`;
}
