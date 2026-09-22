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
});
