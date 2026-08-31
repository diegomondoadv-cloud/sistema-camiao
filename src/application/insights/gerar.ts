/**
 * Insights (camada de aplicação) — gera alertas úteis a partir de REGRAS e
 * comparações dos próprios dados cadastrados. SEM inteligência artificial.
 *
 * Cobre: documentos/CNH/toxicológico vencendo, manutenção próxima/vencida,
 * contas a pagar vencidas, contas a receber vencidas, cliente com atraso
 * recorrente, consumo pior que o esperado, queda de faturamento, aumento de
 * despesas, caminhão parado e a evolução mensal da empresa.
 */
import { prisma } from "@/infrastructure/prisma";
import { reaisParaCentavos, formatarBRL, aplicarPercentual, type Centavos } from "@/shared/dinheiro";
import { formatarData, formatarNumero } from "@/shared/formato";
import { calcularResultadoDireto, calcularSaldoAReceber } from "@/domain/financeiro/calculos";
import { calcularConsumoDoVeiculo, type AbastecimentoConsumo } from "@/domain/abastecimentos/consumo";
import { statusAlertaManutencao } from "@/domain/manutencoes/validacao";
import { situacaoConta } from "@/domain/recebimentos/validacao";
import { situacaoContaPagar } from "@/domain/contas-pagar/validacao";

export type Severidade = "critico" | "atencao" | "info";

export interface Insight {
  id: string;
  severidade: Severidade;
  categoria: string;
  titulo: string;
  descricao: string;
}

const ORDEM: Record<Severidade, number> = { critico: 0, atencao: 1, info: 2 };

function dias(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / 86_400_000;
}
function somarDias(base: Date, d: number): Date {
  const x = new Date(base);
  x.setDate(x.getDate() + d);
  return x;
}
function competencia(v: { dataEntrega: Date | null; dataCarregamento: Date | null }) {
  return v.dataEntrega ?? v.dataCarregamento;
}
function noMes(d: Date | null | undefined, ini: Date, fim: Date): boolean {
  if (!d) return false;
  const t = d.getTime();
  return t >= ini.getTime() && t < fim.getTime();
}

export async function gerarInsights(hoje: Date): Promise<Insight[]> {
  const insights: Insight[] = [];

  const iniMes = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), 1));
  const fimMes = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() + 1, 1));
  const iniMesAnt = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - 1, 1));

  const [motoristas, documentos, manutencoes, cavalos, contasPagar, viagens] =
    await Promise.all([
      prisma.motorista.findMany({ select: { nome: true, vencCnh: true, vencToxicologico: true } }),
      prisma.documento.findMany({
        where: { dataVencimento: { not: null } },
        select: { titulo: true, dataVencimento: true },
      }),
      prisma.manutencao.findMany({
        where: { OR: [{ proximaData: { not: null } }, { proximoKm: { not: null } }] },
        select: { proximaData: true, proximoKm: true, tipoServico: true, cavalo: { select: { placa: true, kmAtual: true } } },
      }),
      prisma.cavalo.findMany({
        where: { situacao: { not: "vendido" } },
        select: {
          id: true, placa: true, situacao: true, mediaConsumoEsperada: true,
          abastecimentos: { select: { km: true, litros: true, valorTotal: true, tanqueCheio: true } },
        },
      }),
      prisma.contaPagar.findMany({
        where: { paga: false },
        select: { descricao: true, valor: true, dataVencimento: true },
      }),
      prisma.viagem.findMany({
        where: { status: { not: "cancelada" } },
        select: {
          cavaloId: true, valorBrutoFrete: true, adiantamento: true, comissaoTransportadora: true,
          percentualImposto: true, dataEntrega: true, dataCarregamento: true,
          motorista: { select: { percentualComissao: true } },
          cliente: { select: { id: true, razaoSocial: true, prazoMedioPagamento: true } },
          despesas: { select: { categoria: true, valor: true } },
          recebimentos: { select: { valor: true } },
        },
      }),
    ]);

  // 1) CNH / toxicológico
  for (const m of motoristas) {
    for (const [doc, data] of [["CNH", m.vencCnh], ["Exame toxicológico", m.vencToxicologico]] as const) {
      if (!data) continue;
      const d = dias(hoje, data);
      if (d < 0) insights.push({ id: `mot-${m.nome}-${doc}`, severidade: "critico", categoria: "Documentos", titulo: `${doc} vencida — ${m.nome}`, descricao: `Venceu em ${formatarData(data)}.` });
      else if (d <= 30) insights.push({ id: `mot-${m.nome}-${doc}`, severidade: "atencao", categoria: "Documentos", titulo: `${doc} a vencer — ${m.nome}`, descricao: `Vence em ${formatarData(data)} (${Math.ceil(d)} dias).` });
    }
  }

  // 2) Documentos gerais
  for (const doc of documentos) {
    if (!doc.dataVencimento) continue;
    const d = dias(hoje, doc.dataVencimento);
    if (d < 0) insights.push({ id: `doc-${doc.titulo}`, severidade: "critico", categoria: "Documentos", titulo: `Documento vencido — ${doc.titulo}`, descricao: `Venceu em ${formatarData(doc.dataVencimento)}.` });
    else if (d <= 30) insights.push({ id: `doc-${doc.titulo}`, severidade: "atencao", categoria: "Documentos", titulo: `Documento a vencer — ${doc.titulo}`, descricao: `Vence em ${formatarData(doc.dataVencimento)}.` });
  }

  // 3) Manutenções
  for (const mn of manutencoes) {
    const st = statusAlertaManutencao(mn.proximaData, mn.proximoKm, mn.cavalo.kmAtual, hoje);
    if (st === "vencida") insights.push({ id: `man-${mn.cavalo.placa}-${mn.tipoServico ?? ""}`, severidade: "critico", categoria: "Manutenção", titulo: `Manutenção vencida — ${mn.cavalo.placa}`, descricao: `${mn.tipoServico ?? "Manutenção"}${mn.proximaData ? ` prevista para ${formatarData(mn.proximaData)}` : ""}.` });
    else if (st === "proxima") insights.push({ id: `man-${mn.cavalo.placa}-${mn.tipoServico ?? ""}`, severidade: "atencao", categoria: "Manutenção", titulo: `Manutenção próxima — ${mn.cavalo.placa}`, descricao: `${mn.tipoServico ?? "Manutenção"}${mn.proximaData ? ` em ${formatarData(mn.proximaData)}` : ""}.` });
  }

  // 4) Contas a pagar vencidas
  let totalPagarVencidoC = 0;
  for (const c of contasPagar) {
    if (situacaoContaPagar(false, c.dataVencimento, hoje) === "vencida") {
      totalPagarVencidoC += reaisParaCentavos(Number(c.valor));
    }
  }
  if (totalPagarVencidoC > 0) {
    insights.push({ id: "pagar-vencido", severidade: "critico", categoria: "Contas a pagar", titulo: "Contas a pagar vencidas", descricao: `Há ${formatarBRL(totalPagarVencidoC)} em contas a pagar já vencidas.` });
  }

  // 5) Contas a receber vencidas + cliente com atraso recorrente
  let totalReceberVencidoC = 0;
  const vencidasPorCliente = new Map<string, { nome: string; n: number }>();
  for (const v of viagens) {
    const brutoC = reaisParaCentavos(Number(v.valorBrutoFrete));
    const adiantC = reaisParaCentavos(Number(v.adiantamento));
    const recsC = v.recebimentos.map((r) => reaisParaCentavos(Number(r.valor)));
    const impostoC = aplicarPercentual(brutoC, Number(v.percentualImposto ?? 0));
    const saldo = calcularSaldoAReceber(brutoC, adiantC, recsC, impostoC);
    if (saldo <= 0) continue;
    const base = v.dataEntrega ?? v.dataCarregamento;
    const previsao = base && v.cliente?.prazoMedioPagamento != null ? somarDias(base, v.cliente.prazoMedioPagamento) : null;
    const sit = situacaoConta({ saldo, jaRecebido: adiantC + recsC.reduce((s, x) => s + x, 0), previsaoPagamento: previsao, hoje });
    if (sit === "vencida") {
      totalReceberVencidoC += saldo;
      if (v.cliente) {
        const cur = vencidasPorCliente.get(v.cliente.id) ?? { nome: v.cliente.razaoSocial, n: 0 };
        cur.n += 1;
        vencidasPorCliente.set(v.cliente.id, cur);
      }
    }
  }
  if (totalReceberVencidoC > 0) {
    insights.push({ id: "receber-vencido", severidade: "atencao", categoria: "Contas a receber", titulo: "Contas a receber vencidas", descricao: `Há ${formatarBRL(totalReceberVencidoC)} a receber já vencido.` });
  }
  for (const [id, c] of vencidasPorCliente) {
    if (c.n >= 2) insights.push({ id: `atraso-${id}`, severidade: "atencao", categoria: "Clientes", titulo: `Atraso recorrente — ${c.nome}`, descricao: `${c.n} contas vencidas deste cliente.` });
  }

  // 6) Consumo pior que o esperado (por caminhão)
  for (const cav of cavalos) {
    const esperado = cav.mediaConsumoEsperada != null ? Number(cav.mediaConsumoEsperada) : null;
    if (!esperado || esperado <= 0) continue;
    const abast: AbastecimentoConsumo[] = cav.abastecimentos.map((a) => ({ km: a.km, litros: Number(a.litros), valorTotal: Number(a.valorTotal), tanqueCheio: a.tanqueCheio }));
    const consumo = calcularConsumoDoVeiculo(abast);
    if (consumo.suficiente && consumo.kmPorLitro < esperado * 0.9) {
      insights.push({ id: `consumo-${cav.placa}`, severidade: "atencao", categoria: "Consumo", titulo: `Consumo abaixo do esperado — ${cav.placa}`, descricao: `Real ${formatarNumero(consumo.kmPorLitro, 2)} km/l vs esperado ${formatarNumero(esperado, 2)} km/l.` });
    }
  }

  // 7/8/10) Faturamento, despesas e evolução mensal (competência)
  let fatMes: Centavos = 0, fatMesAnt: Centavos = 0, despMes: Centavos = 0, despMesAnt: Centavos = 0, lucroMes: Centavos = 0;
  const ultimaViagemPorCavalo = new Map<string, Date>();
  for (const v of viagens) {
    const comp = competencia(v);
    if (v.cavaloId && comp) {
      const atual = ultimaViagemPorCavalo.get(v.cavaloId);
      if (!atual || comp.getTime() > atual.getTime()) ultimaViagemPorCavalo.set(v.cavaloId, comp);
    }
    const brutoC = reaisParaCentavos(Number(v.valorBrutoFrete));
    const despC = v.despesas.reduce((s, d) => s + reaisParaCentavos(Number(d.valor)), 0);
    const despResultC = v.despesas.filter((d) => d.categoria !== "comissao_motorista").reduce((s, d) => s + reaisParaCentavos(Number(d.valor)), 0);
    if (noMes(comp, iniMes, fimMes)) {
      fatMes += brutoC;
      despMes += despC;
      const { resultadoDireto } = calcularResultadoDireto({ valorBrutoFrete: brutoC, comissaoTransportadora: reaisParaCentavos(Number(v.comissaoTransportadora)), despesasDiretas: despResultC, percentualComissaoMotorista: Number(v.motorista?.percentualComissao ?? 0), percentualImposto: Number(v.percentualImposto ?? 0) });
      lucroMes += resultadoDireto;
    } else if (noMes(comp, iniMesAnt, iniMes)) {
      fatMesAnt += brutoC;
      despMesAnt += despC;
    }
  }

  if (fatMesAnt > 0 && fatMes < fatMesAnt * 0.85) {
    const queda = ((fatMesAnt - fatMes) / fatMesAnt) * 100;
    insights.push({ id: "queda-fat", severidade: "atencao", categoria: "Faturamento", titulo: "Queda de faturamento", descricao: `Faturamento caiu ${formatarNumero(queda, 0)}% vs mês anterior (${formatarBRL(fatMes)} contra ${formatarBRL(fatMesAnt)}).` });
  }
  if (despMesAnt > 0 && despMes > despMesAnt * 1.2) {
    const alta = ((despMes - despMesAnt) / despMesAnt) * 100;
    insights.push({ id: "alta-desp", severidade: "atencao", categoria: "Despesas", titulo: "Aumento de despesas", descricao: `Despesas subiram ${formatarNumero(alta, 0)}% vs mês anterior (${formatarBRL(despMes)} contra ${formatarBRL(despMesAnt)}).` });
  }
  insights.push({ id: "evolucao", severidade: "info", categoria: "Evolução", titulo: "Resumo do mês", descricao: `Faturamento ${formatarBRL(fatMes)} · lucro ${formatarBRL(lucroMes)} · despesas ${formatarBRL(despMes)} (mês anterior: faturamento ${formatarBRL(fatMesAnt)}).` });

  // 9) Caminhão parado
  for (const cav of cavalos) {
    if (cav.situacao !== "ativo") continue;
    const ultima = ultimaViagemPorCavalo.get(cav.id);
    if (!ultima) {
      insights.push({ id: `parado-${cav.placa}`, severidade: "atencao", categoria: "Operação", titulo: `Caminhão sem viagens — ${cav.placa}`, descricao: `Nenhuma viagem registrada para este caminhão ativo.` });
    } else if (dias(ultima, hoje) > 15) {
      insights.push({ id: `parado-${cav.placa}`, severidade: "atencao", categoria: "Operação", titulo: `Caminhão parado — ${cav.placa}`, descricao: `Sem viagens há ${Math.floor(dias(ultima, hoje))} dias (última em ${formatarData(ultima)}).` });
    }
  }

  insights.sort((a, b) => ORDEM[a.severidade] - ORDEM[b.severidade]);
  return insights;
}
