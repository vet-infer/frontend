import { describe, expect, it } from "vitest";
import { formatCondition, resolveFactDisplayName } from "./factLabel";

const catalog = [
  { fact_key: "hallazgos_ecograficos_renales", display_name: "hallazgos ecograficos renales" },
  { fact_key: "sdma", display_name: "sdma" },
];

describe("resolveFactDisplayName", () => {
  it("usa el display_name del catalogo cuando existe", () => {
    expect(resolveFactDisplayName("hallazgos_ecograficos_renales", catalog)).toBe("Hallazgos ecográficos renales");
  });

  it("deriva un nombre legible cuando la clave no esta en el catalogo", () => {
    expect(resolveFactDisplayName("perdida_de_peso", catalog)).toBe("Pérdida de peso");
  });
});

describe("formatCondition", () => {
  it.each([
    ["sdma == 15", "Sdma es igual a 15"],
    ["sdma != 15", "Sdma es distinto de 15"],
    ["sdma > 15", "Sdma es mayor que 15"],
    ["sdma < 15", "Sdma es menor que 15"],
    ["sdma >= 15", "Sdma es mayor o igual a 15"],
    ["sdma <= 15", "Sdma es menor o igual a 15"],
  ])("traduce la condicion cruda '%s'", (condition, expected) => {
    expect(formatCondition(condition, catalog)).toBe(expected);
  });
});
