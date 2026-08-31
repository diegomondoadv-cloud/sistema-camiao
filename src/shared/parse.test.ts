import { describe, it, expect } from "vitest";
import { paraData, dataParaInput, paraDecimal, paraInteiro } from "./parse";

describe("paraData", () => {
  it("converte AAAA-MM-DD em Date (meio-dia UTC)", () => {
    const d = paraData("2026-08-15");
    expect(d).toBeInstanceOf(Date);
    expect(d?.toISOString()).toBe("2026-08-15T12:00:00.000Z");
  });
  it("vazio ou inválido vira null", () => {
    expect(paraData("")).toBeNull();
    expect(paraData("15/08/2026")).toBeNull();
    expect(paraData(null)).toBeNull();
  });
});

describe("dataParaInput", () => {
  it("Date → AAAA-MM-DD", () => {
    expect(dataParaInput(paraData("2026-08-15"))).toBe("2026-08-15");
  });
  it("null → vazio", () => {
    expect(dataParaInput(null)).toBe("");
  });
});

describe("paraDecimal / paraInteiro (compartilhados)", () => {
  it("decimal brasileiro", () => {
    expect(paraDecimal("8.500,00")).toBe(8500);
    expect(paraDecimal("2,5")).toBe(2.5);
    expect(paraDecimal("R$ 5.000,00")).toBe(5000);
  });

  it("ponto como separador de milhar (sem vírgula)", () => {
    expect(paraDecimal("10.000")).toBe(10000);
    expect(paraDecimal("1.500")).toBe(1500);
    expect(paraDecimal("1.200.000")).toBe(1200000);
  });

  it("ponto como decimal quando tem 1 ou 2 casas", () => {
    expect(paraDecimal("2.5")).toBe(2.5);
    expect(paraDecimal("2500.50")).toBe(2500.5);
  });

  it("vazio/ inválido vira null", () => {
    expect(paraDecimal("")).toBeNull();
    expect(paraDecimal("abc")).toBeNull();
  });

  it("inteiro com separador", () => {
    expect(paraInteiro("480.000")).toBe(480000);
  });
});
