import { describe, expect, it, vi } from "vitest";
import { getErrorMessage } from "./errors";

describe("getErrorMessage", () => {
  it("nunca retorna el detail crudo del backend", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    const error = {
      response: {
        data: {
          detail: "ValidationError: field 'fact_key' must match pattern ^[a-z_]+$",
        },
      },
    };

    const message = getErrorMessage(error, "No fue posible completar la accion.");

    expect(message).toBe("No fue posible completar la accion.");
    expect(message).not.toContain("ValidationError");
  });

  it("retorna el fallback cuando no hay respuesta del backend", () => {
    const message = getErrorMessage(new Error("network error"), "No fue posible completar la accion.");
    expect(message).toBe("No fue posible completar la accion.");
  });

  it("retorna el detail curado cuando el backend responde 409 (conflicto)", () => {
    const error = {
      response: {
        status: 409,
        data: {
          detail: "El documento ya esta registrado",
        },
      },
    };

    const message = getErrorMessage(error, "No fue posible completar la accion.");

    expect(message).toBe("El documento ya esta registrado");
  });

  it.each([400, 422])("retorna el detail curado cuando el backend responde %i", (status) => {
    const error = { response: { status, data: { detail: "La contrasena actual no es valida" } } };

    expect(getErrorMessage(error, "fallback")).toBe("La contrasena actual no es valida");
  });

  it("ignora un detail que no es string (422 en formato lista)", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const error = { response: { status: 422, data: { detail: [{ msg: "x" }] } } };

    expect(getErrorMessage(error, "fallback")).toBe("fallback");
  });

  it("no expone el detail de un 500", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const error = { response: { status: 500, data: { detail: "Error interno del servidor" } } };

    expect(getErrorMessage(error, "fallback")).toBe("fallback");
  });
});
