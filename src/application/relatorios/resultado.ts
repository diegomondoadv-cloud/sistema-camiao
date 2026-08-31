/**
 * Serviço de relatório de resultado (camada de aplicação).
 * Reutilizado pela tela de relatórios e pela exportação (CSV).
 *
 * Regra de período: a viagem é atribuída pela sua DATA DE COMPETÊNCIA
 * (dataEntrega, ou dataCarregamento se não houver entrega).
 */
import { prisma } from "@/infrastructure/prisma";
import { reaisParaCentavos, type Centavos } from "@/shared/dinheiro";
import { calcularResultadoDireto } from "@/domain/financeiro/calculos";

export interface FiltroRelatorio {
  inicio: Date | null;
  fim: Date | null;
  cavaloId: string | null;
  clienteId: string | null;
}

export interface LinhaViagem {
  id: string;
  data: Date | null;
  rota: string;
  caminhao: string;
  cliente: string;
  brutoC: Centavos;
  despesasC: Centavos; // exclui a comissão do motorista (que é calculada)
  comissaoTranspC: Centavos;
  comissaoMotoristaC: Centavos;
  impostoC: Centavos;
  resultadoC: Centavos;
}

export interface ResumoCaminhao {
  cavaloId: string;
  placa: string;
  nViagens: number;
  faturamentoC: Centavos;
  custosC: Centavos; // bruto − resultado (tudo que foi deduzido)
  resultadoC: Centavos;
}

export interface RelatorioResultado {
  viagens: LinhaViagem[];
  porCaminhao: ResumoCaminhao[];
  totais: { faturamentoC: Centavos; custosC: Centavos; resultadoC: Centavos };
}

function competencia(v: { dataEntrega: Date | null; dataCarregamento: Date | null }) {
  return v.dataEntrega ?? v.dataCarregamento;
}

export async function gerarRelatorioResultado(
  f: FiltroRelatorio,
): Promise<RelatorioResultado> {
  const viagensDb = await prisma.viagem.findMany({
    where: {
      status: { not: "cancelada" },
      ...(f.cavaloId ? { cavaloId: f.cavaloId } : {}),
      ...(f.clienteId ? { clienteId: f.clienteId } : {}),
    },
    select: {
      id: true,
      origem: true,
      destino: true,
      dataEntrega: true,
      dataCarregamento: true,
      valorBrutoFrete: true,
      comissaoTransportadora: true,
      percentualImposto: true,
      cavalo: { select: { id: true, placa: true } },
      cliente: { select: { razaoSocial: true } },
      motorista: { select: { percentualComissao: true } },
      despesas: { select: { categoria: true, valor: true } },
    },
  });

  // Fim inclusivo: considera o dia inteiro do "fim".
  const fimExcl = f.fim ? new Date(f.fim.getTime() + 24 * 60 * 60 * 1000) : null;

  const viagens: LinhaViagem[] = [];
  for (const v of viagensDb) {
    const comp = competencia(v);
    if (f.inicio && (!comp || comp.getTime() < f.inicio.getTime())) continue;
    if (fimExcl && (!comp || comp.getTime() >= fimExcl.getTime())) continue;

    const brutoC = reaisParaCentavos(Number(v.valorBrutoFrete));
    const comissaoTranspC = reaisParaCentavos(Number(v.comissaoTransportadora));
    const despesasC = v.despesas
      .filter((d) => d.categoria !== "comissao_motorista")
      .reduce((s, d) => s + reaisParaCentavos(Number(d.valor)), 0);
    const { comissaoMotorista, imposto, resultadoDireto } = calcularResultadoDireto({
      valorBrutoFrete: brutoC,
      comissaoTransportadora: comissaoTranspC,
      despesasDiretas: despesasC,
      percentualComissaoMotorista: Number(v.motorista?.percentualComissao ?? 0),
      percentualImposto: Number(v.percentualImposto ?? 0),
    });

    viagens.push({
      id: v.id,
      data: comp,
      rota: [v.origem, v.destino].filter(Boolean).join(" → ") || "—",
      caminhao: v.cavalo.placa,
      cliente: v.cliente?.razaoSocial ?? "—",
      brutoC,
      despesasC,
      comissaoTranspC,
      comissaoMotoristaC: comissaoMotorista,
      impostoC: imposto,
      resultadoC: resultadoDireto,
    });
  }

  // Ordena por data (mais recente primeiro)
  viagens.sort((a, b) => (b.data?.getTime() ?? 0) - (a.data?.getTime() ?? 0));

  // Agrupa por caminhão
  const mapa = new Map<string, ResumoCaminhao>();
  for (const l of viagens) {
    const chave = l.caminhao;
    const atual =
      mapa.get(chave) ??
      { cavaloId: chave, placa: l.caminhao, nViagens: 0, faturamentoC: 0, custosC: 0, resultadoC: 0 };
    atual.nViagens += 1;
    atual.faturamentoC += l.brutoC;
    atual.resultadoC += l.resultadoC;
    atual.custosC += l.brutoC - l.resultadoC;
    mapa.set(chave, atual);
  }
  const porCaminhao = [...mapa.values()].sort((a, b) => a.placa.localeCompare(b.placa));

  const totais = {
    faturamentoC: viagens.reduce((s, l) => s + l.brutoC, 0),
    custosC: viagens.reduce((s, l) => s + (l.brutoC - l.resultadoC), 0),
    resultadoC: viagens.reduce((s, l) => s + l.resultadoC, 0),
  };

  return { viagens, porCaminhao, totais };
}
