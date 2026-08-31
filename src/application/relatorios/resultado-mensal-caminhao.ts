/**
 * Relatório: resultado mensal por caminhão (camada de aplicação).
 *
 * Para um ANO escolhido, devolve — por caminhão e por mês — a quebra completa:
 *   faturamento (frete bruto), imposto, comissão do motorista,
 *   combustível (abastecimentos), outras despesas, rateio de custo fixo,
 *   e o RESULTADO LÍQUIDO real (já descontando tudo, inclusive custo fixo).
 *
 * Reaproveita os cálculos puros do domínio (já testados):
 *   calcularResultadoDireto, rateioCustoFixoCaminhao, custoMensalizado.
 *
 * Regra de competência: a viagem é atribuída ao mês da sua data de
 * competência (dataEntrega, ou dataCarregamento se não houver entrega).
 * O rateio de custo fixo é aplicado a TODOS os 12 meses (o custo fixo
 * existe todo mês, independentemente de haver viagem).
 */
import { prisma } from "@/infrastructure/prisma";
import { reaisParaCentavos, type Centavos } from "@/shared/dinheiro";
import {
  calcularComissaoMotorista,
  calcularImposto,
  rateioCustoFixoCaminhao,
} from "@/domain/financeiro/calculos";
import { custoMensalizado } from "@/domain/custos-fixos/validacao";

export interface LinhaMes {
  mes: number; // 1..12
  nViagens: number;
  faturamentoC: Centavos;
  impostoC: Centavos;
  comissaoMotoristaC: Centavos;
  comissaoTranspC: Centavos;
  combustivelC: Centavos;
  outrasDespesasC: Centavos;
  manutencaoC: Centavos;
  rateioFixoC: Centavos;
  /** Resultado sem custo fixo (direto da operação). */
  resultadoSemFixoC: Centavos;
  /** Resultado líquido real, já descontado o rateio de custo fixo. */
  resultadoLiquidoC: Centavos;
}

export interface ResultadoCaminhaoAno {
  cavaloId: string;
  placa: string;
  meses: LinhaMes[]; // sempre 12 (Jan..Dez)
  total: Omit<LinhaMes, "mes">;
}

export interface FiltroResultadoMensal {
  ano: number;
  cavaloId: string | null; // null = todos
}

function zeraLinha(mes: number): LinhaMes {
  return {
    mes,
    nViagens: 0,
    faturamentoC: 0,
    impostoC: 0,
    comissaoMotoristaC: 0,
    comissaoTranspC: 0,
    combustivelC: 0,
    outrasDespesasC: 0,
    manutencaoC: 0,
    rateioFixoC: 0,
    resultadoSemFixoC: 0,
    resultadoLiquidoC: 0,
  };
}

export async function gerarResultadoMensalPorCaminhao(
  f: FiltroResultadoMensal,
): Promise<ResultadoCaminhaoAno[]> {
  const [caminhoes, custos, viagens, manutencoes] = await Promise.all([
    prisma.cavalo.findMany({
      where: {
        situacao: { not: "vendido" },
        ...(f.cavaloId ? { id: f.cavaloId } : {}),
      },
      orderBy: { placa: "asc" },
      select: { id: true, placa: true },
    }),
    prisma.custoFixo.findMany({
      select: { escopo: true, cavaloId: true, valor: true, periodicidade: true },
    }),
    prisma.viagem.findMany({
      where: {
        status: { not: "cancelada" },
        ...(f.cavaloId ? { cavaloId: f.cavaloId } : {}),
      },
      select: {
        cavaloId: true,
        valorBrutoFrete: true,
        comissaoTransportadora: true,
        percentualImposto: true,
        dataEntrega: true,
        dataCarregamento: true,
        motorista: { select: { percentualComissao: true } },
        despesas: { select: { categoria: true, valor: true } },
      },
    }),
    prisma.manutencao.findMany({
      where: { ...(f.cavaloId ? { cavaloId: f.cavaloId } : {}) },
      select: { cavaloId: true, data: true, valor: true },
    }),
  ]);

  // Rateio de custo fixo depende da FROTA TOTAL (não do filtro), para que a
  // fração da empresa por caminhão não mude ao filtrar um único veículo.
  const frota = await prisma.cavalo.count({ where: { situacao: { not: "vendido" } } });

  // Custos fixos mensalizados (empresa e por veículo).
  let custosEmpresaMensalC = 0;
  const custosVeiculoMensalC = new Map<string, Centavos>();
  for (const c of custos) {
    const mensal = custoMensalizado(reaisParaCentavos(Number(c.valor)), c.periodicidade);
    if (c.escopo === "veiculo" && c.cavaloId) {
      custosVeiculoMensalC.set(
        c.cavaloId,
        (custosVeiculoMensalC.get(c.cavaloId) ?? 0) + mensal,
      );
    } else {
      custosEmpresaMensalC += mensal;
    }
  }

  const competencia = (v: (typeof viagens)[number]) =>
    v.dataEntrega ?? v.dataCarregamento;

  const resultado: ResultadoCaminhaoAno[] = [];

  for (const cav of caminhoes) {
    const meses = Array.from({ length: 12 }, (_, i) => zeraLinha(i + 1));
    const rateioMensalC = rateioCustoFixoCaminhao(
      custosEmpresaMensalC,
      frota,
      custosVeiculoMensalC.get(cav.id) ?? 0,
    );

    // Aplica o rateio de custo fixo a todos os meses.
    for (const m of meses) {
      m.rateioFixoC = rateioMensalC;
      m.resultadoLiquidoC = 0 - rateioMensalC; // "0 −" evita zero negativo (-0)
    }

    const doCavalo = viagens.filter((v) => v.cavaloId === cav.id);
    for (const v of doCavalo) {
      const comp = competencia(v);
      if (!comp || comp.getUTCFullYear() !== f.ano) continue;
      const idx = comp.getUTCMonth(); // 0..11
      const linha = meses[idx];
      if (!linha) continue;

      const brutoC = reaisParaCentavos(Number(v.valorBrutoFrete));
      const comissaoTranspC = reaisParaCentavos(Number(v.comissaoTransportadora));
      const combustivelC = v.despesas
        .filter((d) => d.categoria === "combustivel")
        .reduce((s, d) => s + reaisParaCentavos(Number(d.valor)), 0);
      const outrasDespesasC = v.despesas
        .filter(
          (d) =>
            d.categoria !== "combustivel" && d.categoria !== "comissao_motorista",
        )
        .reduce((s, d) => s + reaisParaCentavos(Number(d.valor)), 0);
      const comissaoMotoristaC = calcularComissaoMotorista(
        brutoC,
        Number(v.motorista?.percentualComissao ?? 0),
      );
      const impostoC = calcularImposto(brutoC, Number(v.percentualImposto ?? 0));

      const custosViagemC =
        comissaoTranspC +
        combustivelC +
        outrasDespesasC +
        comissaoMotoristaC +
        impostoC;
      const resultadoSemFixoViagemC = brutoC - custosViagemC;

      linha.nViagens += 1;
      linha.faturamentoC += brutoC;
      linha.impostoC += impostoC;
      linha.comissaoMotoristaC += comissaoMotoristaC;
      linha.comissaoTranspC += comissaoTranspC;
      linha.combustivelC += combustivelC;
      linha.outrasDespesasC += outrasDespesasC;
      linha.resultadoSemFixoC += resultadoSemFixoViagemC;
      linha.resultadoLiquidoC += resultadoSemFixoViagemC;
    }

    // Manutenções do caminhão no ano, atribuídas ao mês da data, abatendo do
    // resultado (é dinheiro que saiu com o veículo).
    const manutencaoDoCavalo = manutencoes.filter((m) => m.cavaloId === cav.id);
    for (const man of manutencaoDoCavalo) {
      if (!man.data || man.data.getUTCFullYear() !== f.ano) continue;
      const linha = meses[man.data.getUTCMonth()];
      if (!linha) continue;
      const valorC = reaisParaCentavos(Number(man.valor));
      linha.manutencaoC += valorC;
      linha.resultadoSemFixoC -= valorC;
      linha.resultadoLiquidoC -= valorC;
    }

    const total = meses.reduce(
      (acc, m) => {
        acc.nViagens += m.nViagens;
        acc.faturamentoC += m.faturamentoC;
        acc.impostoC += m.impostoC;
        acc.comissaoMotoristaC += m.comissaoMotoristaC;
        acc.comissaoTranspC += m.comissaoTranspC;
        acc.combustivelC += m.combustivelC;
        acc.outrasDespesasC += m.outrasDespesasC;
        acc.manutencaoC += m.manutencaoC;
        acc.rateioFixoC += m.rateioFixoC;
        acc.resultadoSemFixoC += m.resultadoSemFixoC;
        acc.resultadoLiquidoC += m.resultadoLiquidoC;
        return acc;
      },
      {
        nViagens: 0,
        faturamentoC: 0,
        impostoC: 0,
        comissaoMotoristaC: 0,
        comissaoTranspC: 0,
        combustivelC: 0,
        outrasDespesasC: 0,
        manutencaoC: 0,
        rateioFixoC: 0,
        resultadoSemFixoC: 0,
        resultadoLiquidoC: 0,
      },
    );

    resultado.push({ cavaloId: cav.id, placa: cav.placa, meses, total });
  }

  return resultado;
}
