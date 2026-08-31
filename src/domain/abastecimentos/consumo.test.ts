import { describe, it, expect } from "vitest";
import {
  calcularConsumoDoVeiculo,
  diferencaConsumo,
  type AbastecimentoConsumo,
} from "./consumo";

const cheio = (
  km: number,
  litros: number,
  valorTotal: number,
): AbastecimentoConsumo => ({ km, litros, valorTotal, tanqueCheio: true });

const d = (dia: number): Date => new Date(Date.UTC(2026, 7, dia, 12));

describe("consumo do veículo (tanque cheio a tanque cheio)", () => {
  it("calcula km/l e custo/km entre dois tanques cheios", () => {
    // 1000 -> 1400 km = 400 km; 100 L no 2º; R$ 600 no 2º
    const r = calcularConsumoDoVeiculo([cheio(1000, 90, 500), cheio(1400, 100, 600)]);
    expect(r.suficiente).toBe(true);
    if (r.suficiente) {
      expect(r.kmPorLitro).toBeCloseTo(4, 5); // 400 / 100
      expect(r.custoPorKm).toBeCloseTo(1.5, 5); // 600 / 400
      expect(r.kmRodados).toBe(400);
      expect(r.intervalos).toBe(1);
    }
  });

  it("soma múltiplos intervalos corretamente", () => {
    const r = calcularConsumoDoVeiculo([
      cheio(1000, 80, 480),
      cheio(1400, 100, 600), // +400 km, 100 L
      cheio(1900, 125, 750), // +500 km, 125 L
    ]);
    // total 900 km / 225 L = 4 km/l
    expect(r.suficiente).toBe(true);
    if (r.suficiente) {
      expect(r.kmRodados).toBe(900);
      expect(r.litrosConsumidos).toBe(225);
      expect(r.kmPorLitro).toBeCloseTo(4, 5);
      expect(r.intervalos).toBe(2);
    }
  });

  it("conta parcial SEM km (ordena por data) no trecho entre cheios", () => {
    // Caso real: parcial sem km entre dois tanques cheios com km.
    // 03/08 cheio km 1000 (90 L) -> 05/08 parcial SEM km (50 L)
    // -> 08/08 cheio km 1400 (100 L). Trecho: 400 km; litros = 50 + 100 = 150.
    const r = calcularConsumoDoVeiculo([
      { km: 1000, litros: 90, valorTotal: 500, tanqueCheio: true, data: d(3) },
      { km: null, litros: 50, valorTotal: 300, tanqueCheio: false, data: d(5) },
      { km: 1400, litros: 100, valorTotal: 600, tanqueCheio: true, data: d(8) },
    ]);
    expect(r.suficiente).toBe(true);
    if (r.suficiente) {
      expect(r.litrosConsumidos).toBe(150);
      expect(r.kmPorLitro).toBeCloseTo(400 / 150, 5);
    }
  });

  it("NÃO inventa valor com um único abastecimento", () => {
    const r = calcularConsumoDoVeiculo([cheio(1000, 100, 600)]);
    expect(r.suficiente).toBe(false);
  });

  it("SOMA os litros das abastecidas parciais entre dois tanques cheios", () => {
    // 1000 (cheio) -> 1200 (parcial 50 L) -> 1400 (cheio 100 L)
    // Trecho: 400 km; litros gastos = 50 (parcial) + 100 (completou) = 150 L
    const r = calcularConsumoDoVeiculo([
      cheio(1000, 90, 500),
      { km: 1200, litros: 50, valorTotal: 300, tanqueCheio: false }, // parcial: CONTA
      cheio(1400, 100, 600),
    ]);
    expect(r.suficiente).toBe(true);
    if (r.suficiente) {
      expect(r.litrosConsumidos).toBe(150);
      expect(r.kmPorLitro).toBeCloseTo(400 / 150, 5); // ≈ 2,667 km/l
      expect(r.custoPorKm).toBeCloseTo(900 / 400, 5); // (300+600)/400
      expect(r.intervalos).toBe(1);
    }
  });

  it("soma várias parciais no mesmo trecho", () => {
    // 1000 (cheio) -> 1100 (parcial 30) -> 1250 (parcial 40) -> 1500 (cheio 80)
    // 500 km; litros = 30 + 40 + 80 = 150 L
    const r = calcularConsumoDoVeiculo([
      cheio(1000, 90, 540),
      { km: 1100, litros: 30, valorTotal: 180, tanqueCheio: false },
      { km: 1250, litros: 40, valorTotal: 240, tanqueCheio: false },
      cheio(1500, 80, 480),
    ]);
    expect(r.suficiente).toBe(true);
    if (r.suficiente) {
      expect(r.litrosConsumidos).toBe(150);
      expect(r.kmPorLitro).toBeCloseTo(500 / 150, 5);
    }
  });

  it("ignora intervalo com hodômetro inconsistente (km não avança)", () => {
    const r = calcularConsumoDoVeiculo([cheio(1400, 100, 600), cheio(1400, 100, 600)]);
    expect(r.suficiente).toBe(false);
  });

  it("informa insuficiência quando faltam km", () => {
    const r = calcularConsumoDoVeiculo([
      { km: null, litros: 100, valorTotal: 600, tanqueCheio: true },
      { km: null, litros: 100, valorTotal: 600, tanqueCheio: true },
    ]);
    expect(r.suficiente).toBe(false);
  });
});

describe("diferença de consumo (real vs esperado)", () => {
  it("positivo quando o real supera o esperado", () => {
    expect(diferencaConsumo(3.2, 2.8)).toBeCloseTo(0.4, 5);
  });
  it("negativo quando o real é pior que o esperado", () => {
    expect(diferencaConsumo(2.5, 3.0)).toBeCloseTo(-0.5, 5);
  });
  it("sem esperado válido, não compara (null)", () => {
    expect(diferencaConsumo(3.2, null)).toBeNull();
    expect(diferencaConsumo(3.2, 0)).toBeNull();
  });
});
