/**
 * Calcula o realizado de um caminhão em um mês (para comparar com as metas):
 * faturamento, lucro (resultado direto), km rodados e consumo médio (km/l).
 */
import { prisma } from "@/infrastructure/prisma";
import { reaisParaCentavos, type Centavos } from "@/shared/dinheiro";
import { calcularResultadoDireto } from "@/domain/financeiro/calculos";
import {
  calcularConsumoDoVeiculo,
  type AbastecimentoConsumo,
} from "@/domain/abastecimentos/consumo";

export interface RealizadoMes {
  faturamentoC: Centavos;
  lucroC: Centavos;
  km: number;
  consumoKmL: number | null;
}

function noMes(d: Date | null | undefined, ini: Date, fim: Date): boolean {
  if (!d) return false;
  const t = d.getTime();
  return t >= ini.getTime() && t < fim.getTime();
}

export async function calcularRealizadoMes(
  cavaloId: string,
  ano: number,
  mes: number,
): Promise<RealizadoMes> {
  const ini = new Date(Date.UTC(ano, mes - 1, 1));
  const fim = new Date(Date.UTC(ano, mes, 1));

  const [viagens, abastecimentos] = await Promise.all([
    prisma.viagem.findMany({
      where: { cavaloId, status: { not: "cancelada" } },
      select: {
        valorBrutoFrete: true,
        comissaoTransportadora: true,
        percentualImposto: true,
        kmInicial: true,
        kmFinal: true,
        dataEntrega: true,
        dataCarregamento: true,
        motorista: { select: { percentualComissao: true } },
        despesas: { select: { categoria: true, valor: true } },
      },
    }),
    prisma.abastecimento.findMany({
      where: { cavaloId, data: { gte: ini, lt: fim } },
      select: { km: true, litros: true, valorTotal: true, tanqueCheio: true },
    }),
  ]);

  let faturamentoC = 0;
  let lucroC = 0;
  let km = 0;

  for (const v of viagens) {
    const comp = v.dataEntrega ?? v.dataCarregamento;
    if (!noMes(comp, ini, fim)) continue;

    const brutoC = reaisParaCentavos(Number(v.valorBrutoFrete));
    const comissaoTranspC = reaisParaCentavos(Number(v.comissaoTransportadora));
    const despesasC = v.despesas
      .filter((d) => d.categoria !== "comissao_motorista")
      .reduce((s, d) => s + reaisParaCentavos(Number(d.valor)), 0);
    const { resultadoDireto } = calcularResultadoDireto({
      valorBrutoFrete: brutoC,
      comissaoTransportadora: comissaoTranspC,
      despesasDiretas: despesasC,
      percentualComissaoMotorista: Number(v.motorista?.percentualComissao ?? 0),
      percentualImposto: Number(v.percentualImposto ?? 0),
    });

    faturamentoC += brutoC;
    lucroC += resultadoDireto;
    if (v.kmInicial != null && v.kmFinal != null && v.kmFinal > v.kmInicial) {
      km += v.kmFinal - v.kmInicial;
    }
  }

  const abast: AbastecimentoConsumo[] = abastecimentos.map((a) => ({
    km: a.km,
    litros: Number(a.litros),
    valorTotal: Number(a.valorTotal),
    tanqueCheio: a.tanqueCheio,
  }));
  const consumo = calcularConsumoDoVeiculo(abast);

  return {
    faturamentoC,
    lucroC,
    km,
    consumoKmL: consumo.suficiente ? consumo.kmPorLitro : null,
  };
}
