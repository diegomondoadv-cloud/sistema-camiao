import { describe, it, expect } from "vitest";
import {
  reaisParaCentavos,
  centavosParaReais,
  somar,
  subtrair,
  aplicarPercentual,
  formatarBRL,
  parseBRLParaCentavos,
  arredondarComercial,
} from "./dinheiro";

describe("dinheiro — conversões", () => {
  it("converte reais para centavos sem erro de ponto flutuante", () => {
    expect(reaisParaCentavos(19.99)).toBe(1999);
    expect(reaisParaCentavos(0.1)).toBe(10);
    expect(reaisParaCentavos(0.2)).toBe(20);
    expect(reaisParaCentavos(1234.56)).toBe(123456);
  });

  it("converte centavos para reais", () => {
    expect(centavosParaReais(1999)).toBeCloseTo(19.99, 5);
    expect(centavosParaReais(0)).toBe(0);
  });

  it("evita o clássico 0.1 + 0.2 !== 0.3", () => {
    const total = somar(reaisParaCentavos(0.1), reaisParaCentavos(0.2));
    expect(total).toBe(30);
    expect(centavosParaReais(total)).toBeCloseTo(0.3, 5);
  });
});

describe("dinheiro — arredondamento comercial", () => {
  it("arredonda metade para longe do zero", () => {
    expect(arredondarComercial(2.5)).toBe(3);
    expect(arredondarComercial(-2.5)).toBe(-3);
    expect(arredondarComercial(2.4)).toBe(2);
  });

  it("aplica percentual arredondando centavos corretamente", () => {
    expect(aplicarPercentual(10000, 12)).toBe(1200);
    expect(aplicarPercentual(150000, 8.5)).toBe(12750);
    expect(aplicarPercentual(1000, 33.33)).toBe(333);
  });
});

describe("dinheiro — operações", () => {
  it("soma e subtrai em centavos", () => {
    expect(somar(1000, 2000, 500)).toBe(3500);
    expect(subtrair(5000, 1500)).toBe(3500);
  });
});

describe("dinheiro — formatação e parse pt-BR", () => {
  it("formata em R$", () => {
    // O Intl usa espaço não-quebrável entre "R$" e o número; normalizamos
    // qualquer espaço (\s casa U+00A0 e U+202F) para espaço comum ao comparar.
    expect(formatarBRL(123456).replace(/\s/g, " ")).toBe("R$ 1.234,56");
    expect(formatarBRL(0).replace(/\s/g, " ")).toBe("R$ 0,00");
  });

  it("interpreta valores digitados em formato brasileiro", () => {
    expect(parseBRLParaCentavos("1.234,56")).toBe(123456);
    expect(parseBRLParaCentavos("1234,56")).toBe(123456);
    expect(parseBRLParaCentavos("R$ 10,00")).toBe(1000);
    expect(parseBRLParaCentavos("1234.56")).toBe(123456);
    expect(parseBRLParaCentavos("100")).toBe(10000);
  });

  it("rejeita valores inválidos", () => {
    expect(() => parseBRLParaCentavos("")).toThrow();
    expect(() => parseBRLParaCentavos("abc")).toThrow();
  });
});
