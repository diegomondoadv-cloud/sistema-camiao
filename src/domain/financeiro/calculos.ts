/**
 * Regras de cálculo financeiro — camada de DOMÍNIO (puro, sem banco/framework).
 * Conforme seção 6 do PLANO_DO_SISTEMA.md.
 *
 * Todos os valores monetários estão em CENTAVOS inteiros (ver shared/dinheiro).
 * Estas funções são puras e totalmente testáveis.
 */

import {
  type Centavos,
  somar,
  subtrair,
  aplicarPercentual,
  arredondarComercial,
} from "@/shared/dinheiro";

// --------------------------------------------------------------------------
// 6.2 Resultado direto da viagem
// --------------------------------------------------------------------------

export interface EntradaResultadoDireto {
  valorBrutoFrete: Centavos;
  comissaoTransportadora: Centavos;
  /** Soma das despesas diretamente ligadas à viagem (já em centavos). */
  despesasDiretas: Centavos;
  /** Percentual da comissão do motorista sobre o frete bruto. Ex.: 10 = 10%. */
  percentualComissaoMotorista: number;
  /** Percentual de imposto sobre o frete bruto. Padrão do sistema: 2,8%. */
  percentualImposto: number;
}

export interface ResultadoDireto {
  comissaoMotorista: Centavos;
  imposto: Centavos;
  resultadoDireto: Centavos;
}

/**
 * Comissão do motorista = percentual sobre o frete bruto (decisão do plano).
 */
export function calcularComissaoMotorista(
  valorBrutoFrete: Centavos,
  percentual: number,
): Centavos {
  return aplicarPercentual(valorBrutoFrete, percentual);
}

/** Imposto sobre o frete = percentual sobre o frete bruto (padrão 2,8%). */
export function calcularImposto(
  valorBrutoFrete: Centavos,
  percentual: number,
): Centavos {
  return aplicarPercentual(valorBrutoFrete, percentual);
}

/**
 * Resultado direto da viagem =
 *   frete bruto
 * − comissão da transportadora
 * − despesas diretas da viagem
 * − comissão do motorista (% do frete bruto)
 * − imposto sobre o frete (% do frete bruto)
 */
export function calcularResultadoDireto(e: EntradaResultadoDireto): ResultadoDireto {
  const comissaoMotorista = calcularComissaoMotorista(
    e.valorBrutoFrete,
    e.percentualComissaoMotorista,
  );
  const imposto = calcularImposto(e.valorBrutoFrete, e.percentualImposto);

  const resultadoDireto = subtrair(
    e.valorBrutoFrete,
    somar(e.comissaoTransportadora, e.despesasDiretas, comissaoMotorista, imposto),
  );

  return { comissaoMotorista, imposto, resultadoDireto };
}

// --------------------------------------------------------------------------
// 6.1 Saldo a receber (por viagem)
// --------------------------------------------------------------------------

/**
 * Saldo a receber = frete bruto − imposto retido − adiantamento − Σ(recebimentos).
 *
 * O imposto (ex.: 2,8%) é retido pela transportadora contratante antes de pagar,
 * então o saldo já reflete o valor LÍQUIDO que a empresa vai efetivamente receber.
 * `imposto` é opcional (padrão 0) para manter compatibilidade.
 */
export function calcularSaldoAReceber(
  valorBrutoFrete: Centavos,
  adiantamento: Centavos,
  recebimentos: Centavos[],
  imposto: Centavos = 0,
): Centavos {
  return subtrair(valorBrutoFrete, somar(imposto, adiantamento, ...recebimentos));
}

// --------------------------------------------------------------------------
// 6.3 Resultado operacional mensal do veículo
// --------------------------------------------------------------------------

export interface EntradaResultadoMensal {
  receitasReconhecidas: Centavos;
  despesasVariaveis: Centavos;
  despesasManutencao: Centavos;
  /** Rateio de custos fixos (padrão: valor fixo por caminhão). */
  rateioCustosFixos: Centavos;
}

export interface ResultadoMensal {
  resultadoSemCustosFixos: Centavos;
  resultadoComCustosFixos: Centavos;
}

export function calcularResultadoMensal(e: EntradaResultadoMensal): ResultadoMensal {
  const resultadoSemCustosFixos = subtrair(
    e.receitasReconhecidas,
    somar(e.despesasVariaveis, e.despesasManutencao),
  );

  const resultadoComCustosFixos = subtrair(
    resultadoSemCustosFixos,
    e.rateioCustosFixos,
  );

  return { resultadoSemCustosFixos, resultadoComCustosFixos };
}

/**
 * Rateio de custos fixos por caminhão (regra "valor fixo por caminhão"):
 * cada caminhão absorve o custo fixo próprio (mensalizado) mais uma fração
 * igual dos custos fixos da empresa (custos da empresa ÷ nº de caminhões).
 */
export function rateioCustoFixoCaminhao(
  custosEmpresaMensal: Centavos,
  numeroCaminhoes: number,
  custosDoCaminhaoMensal: Centavos,
): Centavos {
  const parteEmpresa =
    numeroCaminhoes > 0
      ? arredondarComercial(custosEmpresaMensal / numeroCaminhoes)
      : 0;
  return parteEmpresa + custosDoCaminhaoMensal;
}

// --------------------------------------------------------------------------
// 6.4 Consumo de combustível (honestidade nos números)
// --------------------------------------------------------------------------

export type ResultadoConsumo =
  | { suficiente: true; kmPorLitro: number }
  | { suficiente: false; motivo: string };

/**
 * Consumo (km/l). Se não houver dados suficientes/consistentes, devolve
 * `suficiente: false` — NUNCA inventa um valor.
 */
export function calcularConsumo(
  kmRodados: number,
  litros: number,
): ResultadoConsumo {
  if (!Number.isFinite(kmRodados) || !Number.isFinite(litros)) {
    return { suficiente: false, motivo: "Dados insuficientes." };
  }
  if (litros <= 0) {
    return { suficiente: false, motivo: "Litros abastecidos inválidos." };
  }
  if (kmRodados <= 0) {
    return { suficiente: false, motivo: "Quilometragem insuficiente." };
  }
  return { suficiente: true, kmPorLitro: kmRodados / litros };
}

// --------------------------------------------------------------------------
// Percentual de km vazios
// --------------------------------------------------------------------------

export type ResultadoKmVazio =
  | { suficiente: true; percentual: number }
  | { suficiente: false; motivo: string };

export function calcularPercentualKmVazio(
  kmCarregado: number,
  kmVazio: number,
): ResultadoKmVazio {
  const total = kmCarregado + kmVazio;
  if (total <= 0) {
    return { suficiente: false, motivo: "Sem quilometragem registrada." };
  }
  return { suficiente: true, percentual: (kmVazio / total) * 100 };
}
