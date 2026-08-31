/**
 * Extrato / Fluxo de caixa (camada de aplicação).
 *
 * Lista, em ordem cronológica, todo o dinheiro que ENTROU e SAIU, com saldo
 * acumulado — como um extrato bancário. Usa a mesma base do "Caixa" do sistema:
 *
 *   Entradas: recebimentos (data efetiva) + adiantamentos (data de carregamento)
 *   Saídas:   despesas de viagem (data) + manutenção (data)
 *             + comissões de motorista já pagas + contas a pagar já pagas (data de pagamento)
 *
 * Observação: comissões pagas não têm data de pagamento própria, então usam a
 * data de competência da viagem (entrega, ou carregamento) como referência.
 */
import { prisma } from "@/infrastructure/prisma";
import { reaisParaCentavos, type Centavos } from "@/shared/dinheiro";
import { calcularComissaoMotorista } from "@/domain/financeiro/calculos";
import { ROTULO_CATEGORIA } from "@/domain/despesas/validacao";

export interface MovimentoCaixa {
  data: Date;
  descricao: string;
  categoria: string;
  /** Positivo = entrada; negativo = saída. */
  valorC: Centavos;
}

export interface LinhaExtrato extends MovimentoCaixa {
  saldoC: Centavos; // saldo acumulado após este movimento
}

export interface FluxoDeCaixa {
  saldoInicialC: Centavos;
  entradasC: Centavos;
  saidasC: Centavos; // valor positivo (total que saiu)
  saldoFinalC: Centavos;
  linhas: LinhaExtrato[]; // dentro do período, em ordem cronológica
}

function rota(o: string | null, d: string | null): string {
  return [o, d].filter(Boolean).join(" → ") || "sem rota";
}

export async function gerarFluxoDeCaixa(
  inicio: Date,
  fimExclusivo: Date,
): Promise<FluxoDeCaixa> {
  const [viagens, manutencoes, contasPagas] = await Promise.all([
    prisma.viagem.findMany({
      where: { status: { not: "cancelada" } },
      select: {
        origem: true,
        destino: true,
        adiantamento: true,
        valorBrutoFrete: true,
        comissaoMotoristaPaga: true,
        dataCarregamento: true,
        dataEntrega: true,
        motorista: { select: { percentualComissao: true } },
        despesas: { select: { categoria: true, valor: true, data: true } },
        recebimentos: { select: { valor: true, dataEfetiva: true } },
      },
    }),
    prisma.manutencao.findMany({ select: { data: true, valor: true, tipoServico: true, cavalo: { select: { placa: true } } } }),
    prisma.contaPagar.findMany({
      where: { paga: true },
      select: { descricao: true, valor: true, dataPagamento: true },
    }),
  ]);

  const movimentos: MovimentoCaixa[] = [];

  for (const v of viagens) {
    const r = rota(v.origem, v.destino);
    if (v.dataCarregamento) {
      const adiantC = reaisParaCentavos(Number(v.adiantamento));
      if (adiantC > 0) {
        movimentos.push({ data: v.dataCarregamento, descricao: `Adiantamento — ${r}`, categoria: "Adiantamento", valorC: adiantC });
      }
    }
    for (const rec of v.recebimentos) {
      if (!rec.dataEfetiva) continue;
      movimentos.push({ data: rec.dataEfetiva, descricao: `Recebimento — ${r}`, categoria: "Recebimento", valorC: reaisParaCentavos(Number(rec.valor)) });
    }
    for (const d of v.despesas) {
      if (!d.data) continue;
      movimentos.push({
        data: d.data,
        descricao: `${ROTULO_CATEGORIA[d.categoria] ?? d.categoria} — ${r}`,
        categoria: ROTULO_CATEGORIA[d.categoria] ?? d.categoria,
        valorC: -reaisParaCentavos(Number(d.valor)),
      });
    }
    if (v.comissaoMotoristaPaga) {
      const comp = v.dataEntrega ?? v.dataCarregamento;
      const comissaoC = calcularComissaoMotorista(
        reaisParaCentavos(Number(v.valorBrutoFrete)),
        Number(v.motorista?.percentualComissao ?? 0),
      );
      if (comp && comissaoC > 0) {
        movimentos.push({ data: comp, descricao: `Comissão motorista (paga) — ${r}`, categoria: "Comissão motorista", valorC: -comissaoC });
      }
    }
  }

  for (const m of manutencoes) {
    if (!m.data) continue;
    const nome = [m.tipoServico ?? "Manutenção", m.cavalo?.placa].filter(Boolean).join(" — ");
    movimentos.push({ data: m.data, descricao: nome, categoria: "Manutenção", valorC: -reaisParaCentavos(Number(m.valor)) });
  }

  for (const c of contasPagas) {
    if (!c.dataPagamento) continue;
    movimentos.push({ data: c.dataPagamento, descricao: c.descricao, categoria: "Conta paga", valorC: -reaisParaCentavos(Number(c.valor)) });
  }

  // Saldo inicial = soma de tudo ANTES do início do período.
  let saldoInicialC = 0;
  for (const mv of movimentos) {
    if (mv.data.getTime() < inicio.getTime()) saldoInicialC += mv.valorC;
  }

  // Movimentos DENTRO do período, ordenados por data (empate: entradas antes).
  const doPeriodo = movimentos
    .filter((mv) => mv.data.getTime() >= inicio.getTime() && mv.data.getTime() < fimExclusivo.getTime())
    .sort((a, b) => a.data.getTime() - b.data.getTime() || b.valorC - a.valorC);

  let saldo = saldoInicialC;
  let entradasC = 0;
  let saidasC = 0;
  const linhas: LinhaExtrato[] = doPeriodo.map((mv) => {
    saldo += mv.valorC;
    if (mv.valorC >= 0) entradasC += mv.valorC;
    else saidasC += -mv.valorC;
    return { ...mv, saldoC: saldo };
  });

  return {
    saldoInicialC,
    entradasC,
    saidasC,
    saldoFinalC: saldo,
    linhas,
  };
}
