/**
 * Indicadores por cliente (camada de aplicação). Agrega, por cliente, o
 * faturamento, o lucro (resultado direto), nº de viagens, ticket médio,
 * prazo médio de pagamento e o índice de atraso das contas a receber.
 */
import { prisma } from "@/infrastructure/prisma";
import { reaisParaCentavos, aplicarPercentual, type Centavos } from "@/shared/dinheiro";
import { calcularResultadoDireto, calcularSaldoAReceber } from "@/domain/financeiro/calculos";
import { situacaoConta } from "@/domain/recebimentos/validacao";

export interface IndicadorCliente {
  clienteId: string;
  nome: string;
  nViagens: number;
  faturamentoC: Centavos;
  lucroC: Centavos;
  ticketMedioC: Centavos;
  prazoMedioPagamento: number | null;
  aReceberC: Centavos;
  vencidoC: Centavos;
  nContas: number; // contas a receber em aberto
  nVencidas: number;
  indiceAtraso: number | null; // % de contas em aberto que estão vencidas
}

function somarDias(base: Date, dias: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + dias);
  return d;
}

export async function gerarIndicadoresCliente(hoje: Date): Promise<IndicadorCliente[]> {
  const clientes = await prisma.cliente.findMany({
    orderBy: { razaoSocial: "asc" },
    select: {
      id: true,
      razaoSocial: true,
      prazoMedioPagamento: true,
      viagens: {
        where: { status: { not: "cancelada" } },
        select: {
          valorBrutoFrete: true,
          adiantamento: true,
          comissaoTransportadora: true,
          percentualImposto: true,
          dataEntrega: true,
          dataCarregamento: true,
          motorista: { select: { percentualComissao: true } },
          despesas: { select: { categoria: true, valor: true } },
          recebimentos: { select: { valor: true } },
        },
      },
    },
  });

  const indicadores = clientes.map((c) => {
    let faturamentoC = 0;
    let lucroC = 0;
    let aReceberC = 0;
    let vencidoC = 0;
    let nContas = 0;
    let nVencidas = 0;

    for (const v of c.viagens) {
      const brutoC = reaisParaCentavos(Number(v.valorBrutoFrete));
      const adiantC = reaisParaCentavos(Number(v.adiantamento));
      const comissaoTranspC = reaisParaCentavos(Number(v.comissaoTransportadora));
      const despesasC = v.despesas
        .filter((d) => d.categoria !== "comissao_motorista")
        .reduce((s, d) => s + reaisParaCentavos(Number(d.valor)), 0);
      const recsC = v.recebimentos.map((r) => reaisParaCentavos(Number(r.valor)));

      const { resultadoDireto } = calcularResultadoDireto({
        valorBrutoFrete: brutoC,
        comissaoTransportadora: comissaoTranspC,
        despesasDiretas: despesasC,
        percentualComissaoMotorista: Number(v.motorista?.percentualComissao ?? 0),
        percentualImposto: Number(v.percentualImposto ?? 0),
      });

      faturamentoC += brutoC;
      lucroC += resultadoDireto;

      const impostoC = aplicarPercentual(brutoC, Number(v.percentualImposto ?? 0));
      const saldo = calcularSaldoAReceber(brutoC, adiantC, recsC, impostoC);
      if (saldo > 0) {
        aReceberC += saldo;
        nContas += 1;
        const base = v.dataEntrega ?? v.dataCarregamento;
        const previsao =
          base && c.prazoMedioPagamento != null
            ? somarDias(base, c.prazoMedioPagamento)
            : null;
        const sit = situacaoConta({
          saldo,
          jaRecebido: adiantC + recsC.reduce((s, x) => s + x, 0),
          previsaoPagamento: previsao,
          hoje,
        });
        if (sit === "vencida") {
          vencidoC += saldo;
          nVencidas += 1;
        }
      }
    }

    const nViagens = c.viagens.length;
    return {
      clienteId: c.id,
      nome: c.razaoSocial,
      nViagens,
      faturamentoC,
      lucroC,
      ticketMedioC: nViagens > 0 ? Math.round(faturamentoC / nViagens) : 0,
      prazoMedioPagamento: c.prazoMedioPagamento,
      aReceberC,
      vencidoC,
      nContas,
      nVencidas,
      indiceAtraso: nContas > 0 ? (nVencidas / nContas) * 100 : null,
    };
  });

  // Ranking: maior lucro primeiro
  indicadores.sort((a, b) => b.lucroC - a.lucroC);
  return indicadores;
}
