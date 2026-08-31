import { describe, it, expect } from "vitest";
import {
  calcularComissaoMotorista,
  calcularResultadoDireto,
  calcularSaldoAReceber,
  calcularResultadoMensal,
  calcularConsumo,
  calcularPercentualKmVazio,
  rateioCustoFixoCaminhao,
} from "./calculos";
import { reaisParaCentavos } from "@/shared/dinheiro";

describe("resultado direto da viagem", () => {
  it("calcula comissão do motorista como % do frete bruto", () => {
    // 10% de R$ 5.000,00
    expect(calcularComissaoMotorista(reaisParaCentavos(5000), 10)).toBe(
      reaisParaCentavos(500),
    );
  });

  it("frete 5000, comissão transp. 500, despesas 1200, motorista 10%, sem imposto", () => {
    const r = calcularResultadoDireto({
      valorBrutoFrete: reaisParaCentavos(5000),
      comissaoTransportadora: reaisParaCentavos(500),
      despesasDiretas: reaisParaCentavos(1200),
      percentualComissaoMotorista: 10,
      percentualImposto: 0,
    });
    // comissão motorista = 500 ; resultado = 5000 - 500 - 1200 - 500 = 2800
    expect(r.comissaoMotorista).toBe(reaisParaCentavos(500));
    expect(r.imposto).toBe(0);
    expect(r.resultadoDireto).toBe(reaisParaCentavos(2800));
  });

  it("aplica imposto de 2,8% sobre o frete bruto", () => {
    const r = calcularResultadoDireto({
      valorBrutoFrete: reaisParaCentavos(5000),
      comissaoTransportadora: reaisParaCentavos(500),
      despesasDiretas: reaisParaCentavos(1200),
      percentualComissaoMotorista: 10,
      percentualImposto: 2.8,
    });
    // imposto = 2,8% de 5000 = 140 ; resultado = 2800 - 140 = 2660
    expect(r.imposto).toBe(reaisParaCentavos(140));
    expect(r.resultadoDireto).toBe(reaisParaCentavos(2660));
  });

  it("permite resultado negativo (prejuízo na viagem)", () => {
    const r = calcularResultadoDireto({
      valorBrutoFrete: reaisParaCentavos(1000),
      comissaoTransportadora: reaisParaCentavos(100),
      despesasDiretas: reaisParaCentavos(1200),
      percentualComissaoMotorista: 10,
      percentualImposto: 0,
    });
    // 1000 - 100 - 1200 - 100 = -400
    expect(r.resultadoDireto).toBe(reaisParaCentavos(-400));
  });
});

describe("saldo a receber", () => {
  it("subtrai adiantamento e recebimentos", () => {
    const saldo = calcularSaldoAReceber(
      reaisParaCentavos(5000),
      reaisParaCentavos(1500),
      [reaisParaCentavos(1000), reaisParaCentavos(500)],
    );
    // 5000 - 1500 - 1500 = 2000
    expect(saldo).toBe(reaisParaCentavos(2000));
  });

  it("sem adiantamento nem recebimentos, saldo = frete bruto", () => {
    expect(calcularSaldoAReceber(reaisParaCentavos(3000), 0, [])).toBe(
      reaisParaCentavos(3000),
    );
  });

  it("desconta o imposto retido pela transportadora", () => {
    // frete 10.000, imposto 280 (2,8%), adiantamento 2.000, sem recebimentos
    // saldo líquido = 10.000 - 280 - 2.000 = 7.720
    const saldo = calcularSaldoAReceber(
      reaisParaCentavos(10000),
      reaisParaCentavos(2000),
      [],
      reaisParaCentavos(280),
    );
    expect(saldo).toBe(reaisParaCentavos(7720));
  });
});

describe("resultado operacional mensal", () => {
  it("apresenta resultado com e sem custos fixos", () => {
    const r = calcularResultadoMensal({
      receitasReconhecidas: reaisParaCentavos(50000),
      despesasVariaveis: reaisParaCentavos(20000),
      despesasManutencao: reaisParaCentavos(5000),
      rateioCustosFixos: reaisParaCentavos(8000),
    });
    // sem fixos: 50000 - 20000 - 5000 = 25000
    // com fixos: 25000 - 8000 = 17000
    expect(r.resultadoSemCustosFixos).toBe(reaisParaCentavos(25000));
    expect(r.resultadoComCustosFixos).toBe(reaisParaCentavos(17000));
  });
});

describe("rateio de custos fixos por caminhão", () => {
  it("soma custo próprio + fração igual dos custos da empresa", () => {
    // empresa 3.000 / 2 caminhões = 1.500 ; + 8.500 do próprio = 10.000
    expect(
      rateioCustoFixoCaminhao(
        reaisParaCentavos(3000),
        2,
        reaisParaCentavos(8500),
      ),
    ).toBe(reaisParaCentavos(10000));
  });

  it("sem caminhões, não rateia a parte da empresa", () => {
    expect(rateioCustoFixoCaminhao(reaisParaCentavos(3000), 0, 0)).toBe(0);
  });

  it("só custo próprio quando não há custo de empresa", () => {
    expect(
      rateioCustoFixoCaminhao(0, 2, reaisParaCentavos(8500)),
    ).toBe(reaisParaCentavos(8500));
  });
});

describe("consumo de combustível (não inventa valores)", () => {
  it("calcula km/l com dados válidos", () => {
    const r = calcularConsumo(1000, 400);
    expect(r.suficiente).toBe(true);
    if (r.suficiente) expect(r.kmPorLitro).toBeCloseTo(2.5, 5);
  });

  it("informa dados insuficientes quando litros = 0", () => {
    const r = calcularConsumo(1000, 0);
    expect(r.suficiente).toBe(false);
  });

  it("informa dados insuficientes quando km <= 0", () => {
    const r = calcularConsumo(0, 400);
    expect(r.suficiente).toBe(false);
  });
});

describe("percentual de km vazios", () => {
  it("calcula corretamente", () => {
    const r = calcularPercentualKmVazio(800, 200);
    expect(r.suficiente).toBe(true);
    if (r.suficiente) expect(r.percentual).toBeCloseTo(20, 5);
  });

  it("informa quando não há quilometragem", () => {
    const r = calcularPercentualKmVazio(0, 0);
    expect(r.suficiente).toBe(false);
  });
});
