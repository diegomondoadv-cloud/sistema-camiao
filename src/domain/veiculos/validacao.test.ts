import { describe, it, expect } from "vitest";
import {
  paraInteiro,
  paraDecimal,
  normalizarPlaca,
  cavaloSchema,
  carretaSchema,
} from "./validacao";

describe("paraInteiro", () => {
  it("converte texto com separadores em inteiro", () => {
    expect(paraInteiro("480.000")).toBe(480000);
    expect(paraInteiro("2020")).toBe(2020);
  });
  it("vazio vira null", () => {
    expect(paraInteiro("")).toBeNull();
    expect(paraInteiro(null)).toBeNull();
  });
});

describe("paraDecimal (formato brasileiro)", () => {
  it("aceita vírgula como decimal", () => {
    expect(paraDecimal("2,5")).toBe(2.5);
  });
  it("aceita milhar com ponto e decimal com vírgula", () => {
    expect(paraDecimal("8.500,00")).toBe(8500);
  });
  it("aceita ponto como decimal", () => {
    expect(paraDecimal("2.5")).toBe(2.5);
  });
  it("vazio vira null", () => {
    expect(paraDecimal("")).toBeNull();
  });
});

describe("normalizarPlaca", () => {
  it("maiúsculas e sem símbolos", () => {
    expect(normalizarPlaca("abc-1d23")).toBe("ABC1D23");
    expect(normalizarPlaca(" xyz 4e56 ")).toBe("XYZ4E56");
  });
});

describe("cavaloSchema", () => {
  const base = {
    placa: "ABC1D23",
    marca: "Scania",
    modelo: "R450",
    ano: 2020,
    kmAtual: 480000,
    mediaConsumoEsperada: 2.5,
    capacidade: null,
    situacao: "ativo",
    valorParcela: 8500,
    vencimentoParcela: 10,
    seguro: null,
    rastreador: null,
    observacoes: null,
  };

  it("aceita um cavalo válido", () => {
    expect(cavaloSchema.safeParse(base).success).toBe(true);
  });
  it("rejeita placa curta", () => {
    expect(cavaloSchema.safeParse({ ...base, placa: "AB1" }).success).toBe(false);
  });
  it("rejeita dia de vencimento fora de 1..31", () => {
    expect(cavaloSchema.safeParse({ ...base, vencimentoParcela: 40 }).success).toBe(
      false,
    );
  });
  it("rejeita situação inválida", () => {
    expect(cavaloSchema.safeParse({ ...base, situacao: "xpto" }).success).toBe(false);
  });
});

describe("carretaSchema", () => {
  it("aceita uma carreta válida", () => {
    expect(
      carretaSchema.safeParse({
        placa: "XYZ4E56",
        tipoCarroceria: "Sider",
        numeroEixos: 3,
        situacao: "ativo",
        observacoes: null,
      }).success,
    ).toBe(true);
  });
  it("rejeita número de eixos inválido", () => {
    expect(
      carretaSchema.safeParse({
        placa: "XYZ4E56",
        tipoCarroceria: "Sider",
        numeroEixos: 0,
        situacao: "ativo",
        observacoes: null,
      }).success,
    ).toBe(false);
  });
});
