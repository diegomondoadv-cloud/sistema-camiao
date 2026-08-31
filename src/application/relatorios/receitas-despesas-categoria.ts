/**
 * Relatório mensal de RECEITAS e DESPESAS por categoria (camada de aplicação).
 *
 * Dois regimes:
 *  - COMPETÊNCIA: pela data do fato (frete pela competência da viagem;
 *    manutenção pela data; custos fixos mensalizados). Reconcilia com o Painel.
 *      Resultado = fretes − imposto − comissões − despesas de viagem
 *                  − manutenção − custos fixos mensalizados
 *  - CAIXA: pelo dinheiro que efetivamente entrou/saiu no mês.
 *      Entradas = recebimentos (data efetiva) + adiantamentos (carregamento)
 *      Saídas = despesas de viagem (data) + manutenção (data)
 *               + contas a pagar PAGAS (data de pagamento)
 *      Resultado = entradas − saídas
 */
import { prisma } from "@/infrastructure/prisma";
import { reaisParaCentavos, aplicarPercentual, type Centavos } from "@/shared/dinheiro";
import { calcularComissaoMotorista } from "@/domain/financeiro/calculos";
import { ROTULO_CATEGORIA } from "@/domain/despesas/validacao";
import { custoMensalizado, ROTULO_CATEGORIA_CUSTO } from "@/domain/custos-fixos/validacao";
import { ROTULO_CATEGORIA_PAGAR } from "@/domain/contas-pagar/validacao";

export type RegimeRelatorio = "competencia" | "caixa";

export interface LinhaCategoria {
  grupo: string;
  rotulo: string;
  valorC: Centavos;
}

export interface RelatorioCategorias {
  regime: RegimeRelatorio;
  /** Receita bruta (fretes na competência) ou entradas (no caixa). */
  receitaBrutaC: Centavos;
  /** Imposto retido (só faz sentido na competência; 0 no caixa). */
  impostoRetidoC: Centavos;
  /** Receita líquida = bruta − imposto (competência) / entradas (caixa). */
  receitaLiquidaC: Centavos;
  despesas: LinhaCategoria[]; // ordenadas por valor desc
  totalDespesasC: Centavos;
  resultadoC: Centavos;
}

function noMes(d: Date | null | undefined, ini: Date, fim: Date): boolean {
  if (!d) return false;
  const t = d.getTime();
  return t >= ini.getTime() && t < fim.getTime();
}

export async function gerarRelatorioCategorias(
  mes: number,
  ano: number,
  regime: RegimeRelatorio = "competencia",
): Promise<RelatorioCategorias> {
  const ini = new Date(Date.UTC(ano, mes - 1, 1));
  const fim = new Date(Date.UTC(ano, mes, 1));

  if (regime === "caixa") {
    return gerarCaixa(ini, fim);
  }
  return gerarCompetencia(ini, fim);
}

async function gerarCompetencia(ini: Date, fim: Date): Promise<RelatorioCategorias> {
  const [viagens, manutencoes, custos] = await Promise.all([
    prisma.viagem.findMany({
      where: { status: { not: "cancelada" } },
      select: {
        valorBrutoFrete: true,
        comissaoTransportadora: true,
        percentualImposto: true,
        dataEntrega: true,
        dataCarregamento: true,
        motorista: { select: { percentualComissao: true } },
        despesas: { select: { categoria: true, valor: true } },
      },
    }),
    prisma.manutencao.findMany({ select: { data: true, valor: true } }),
    prisma.custoFixo.findMany({ select: { categoria: true, valor: true, periodicidade: true } }),
  ]);

  let receitaBrutaC = 0;
  let impostoC = 0;
  let comissaoMotoristaC = 0;
  let comissaoTranspC = 0;
  const despesasViagemPorCat = new Map<string, Centavos>();

  for (const v of viagens) {
    const comp = v.dataEntrega ?? v.dataCarregamento;
    if (!noMes(comp, ini, fim)) continue;

    const brutoC = reaisParaCentavos(Number(v.valorBrutoFrete));
    receitaBrutaC += brutoC;
    impostoC += aplicarPercentual(brutoC, Number(v.percentualImposto ?? 0));
    comissaoMotoristaC += calcularComissaoMotorista(brutoC, Number(v.motorista?.percentualComissao ?? 0));
    comissaoTranspC += reaisParaCentavos(Number(v.comissaoTransportadora));

    for (const d of v.despesas) {
      if (d.categoria === "comissao_motorista") continue;
      despesasViagemPorCat.set(
        d.categoria,
        (despesasViagemPorCat.get(d.categoria) ?? 0) + reaisParaCentavos(Number(d.valor)),
      );
    }
  }

  let manutencaoC = 0;
  for (const m of manutencoes) {
    if (noMes(m.data, ini, fim)) manutencaoC += reaisParaCentavos(Number(m.valor));
  }

  const custosFixosPorCat = new Map<string, Centavos>();
  for (const c of custos) {
    const mensalC = custoMensalizado(reaisParaCentavos(Number(c.valor)), c.periodicidade);
    if (mensalC <= 0) continue;
    custosFixosPorCat.set(c.categoria, (custosFixosPorCat.get(c.categoria) ?? 0) + mensalC);
  }

  const despesas: LinhaCategoria[] = [];
  if (impostoC > 0) despesas.push({ grupo: "Tributos e comissões", rotulo: "Imposto sobre frete", valorC: impostoC });
  if (comissaoMotoristaC > 0) despesas.push({ grupo: "Tributos e comissões", rotulo: "Comissão do motorista", valorC: comissaoMotoristaC });
  if (comissaoTranspC > 0) despesas.push({ grupo: "Tributos e comissões", rotulo: "Comissão da transportadora", valorC: comissaoTranspC });
  for (const [cat, valorC] of despesasViagemPorCat) {
    if (valorC <= 0) continue;
    despesas.push({ grupo: "Despesas de viagem", rotulo: ROTULO_CATEGORIA[cat] ?? cat, valorC });
  }
  if (manutencaoC > 0) despesas.push({ grupo: "Manutenção", rotulo: "Manutenção", valorC: manutencaoC });
  for (const [cat, valorC] of custosFixosPorCat) {
    despesas.push({ grupo: "Custos fixos", rotulo: ROTULO_CATEGORIA_CUSTO[cat] ?? cat, valorC });
  }
  despesas.sort((a, b) => b.valorC - a.valorC);

  const totalDespesasC = despesas.reduce((s, l) => s + l.valorC, 0);
  return {
    regime: "competencia",
    receitaBrutaC,
    impostoRetidoC: impostoC,
    receitaLiquidaC: receitaBrutaC - impostoC,
    despesas,
    totalDespesasC,
    resultadoC: receitaBrutaC - totalDespesasC,
  };
}

async function gerarCaixa(ini: Date, fim: Date): Promise<RelatorioCategorias> {
  const [viagens, manutencoes, contasPagas] = await Promise.all([
    prisma.viagem.findMany({
      where: { status: { not: "cancelada" } },
      select: {
        adiantamento: true,
        dataCarregamento: true,
        despesas: { select: { categoria: true, valor: true, data: true } },
        recebimentos: { select: { valor: true, dataEfetiva: true } },
      },
    }),
    prisma.manutencao.findMany({ select: { data: true, valor: true } }),
    prisma.contaPagar.findMany({
      where: { paga: true },
      select: { categoria: true, valor: true, dataPagamento: true },
    }),
  ]);

  // Entradas: recebimentos (data efetiva) + adiantamentos (carregamento).
  let entradasC = 0;
  const despesasViagemPorCat = new Map<string, Centavos>();
  for (const v of viagens) {
    if (noMes(v.dataCarregamento, ini, fim)) {
      entradasC += reaisParaCentavos(Number(v.adiantamento));
    }
    for (const r of v.recebimentos) {
      if (noMes(r.dataEfetiva, ini, fim)) entradasC += reaisParaCentavos(Number(r.valor));
    }
    for (const d of v.despesas) {
      if (!noMes(d.data, ini, fim)) continue;
      despesasViagemPorCat.set(
        d.categoria,
        (despesasViagemPorCat.get(d.categoria) ?? 0) + reaisParaCentavos(Number(d.valor)),
      );
    }
  }

  let manutencaoC = 0;
  for (const m of manutencoes) {
    if (noMes(m.data, ini, fim)) manutencaoC += reaisParaCentavos(Number(m.valor));
  }

  const contasPorCat = new Map<string, Centavos>();
  for (const c of contasPagas) {
    if (!noMes(c.dataPagamento, ini, fim)) continue;
    const cat = c.categoria ?? "outros";
    contasPorCat.set(cat, (contasPorCat.get(cat) ?? 0) + reaisParaCentavos(Number(c.valor)));
  }

  const despesas: LinhaCategoria[] = [];
  for (const [cat, valorC] of despesasViagemPorCat) {
    if (valorC <= 0) continue;
    despesas.push({ grupo: "Despesas de viagem", rotulo: ROTULO_CATEGORIA[cat] ?? cat, valorC });
  }
  if (manutencaoC > 0) despesas.push({ grupo: "Manutenção", rotulo: "Manutenção", valorC: manutencaoC });
  for (const [cat, valorC] of contasPorCat) {
    despesas.push({ grupo: "Contas pagas", rotulo: ROTULO_CATEGORIA_PAGAR[cat] ?? cat, valorC });
  }
  despesas.sort((a, b) => b.valorC - a.valorC);

  const totalDespesasC = despesas.reduce((s, l) => s + l.valorC, 0);
  return {
    regime: "caixa",
    receitaBrutaC: entradasC,
    impostoRetidoC: 0,
    receitaLiquidaC: entradasC,
    despesas,
    totalDespesasC,
    resultadoC: entradasC - totalDespesasC,
  };
}
