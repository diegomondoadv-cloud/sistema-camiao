/**
 * Dashboard Executivo (server component) — visão geral para admin/gestor,
 * exibido na tela inicial. Mês corrente em regime de competência para os
 * indicadores do mês; contas a receber/vencidas e caixa são acumulados.
 * Reutiliza as regras de cálculo já testadas no domínio.
 */
import Link from "next/link";
import { prisma } from "@/infrastructure/prisma";
import { reaisParaCentavos, formatarBRL, aplicarPercentual, type Centavos } from "@/shared/dinheiro";
import { formatarNumero } from "@/shared/formato";
import {
  calcularResultadoDireto,
  calcularSaldoAReceber,
  rateioCustoFixoCaminhao,
  calcularComissaoMotorista,
} from "@/domain/financeiro/calculos";
import { custoMensalizado } from "@/domain/custos-fixos/validacao";
import { situacaoConta } from "@/domain/recebimentos/validacao";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function noMes(d: Date | null | undefined, ini: Date, fim: Date): boolean {
  if (!d) return false;
  const t = d.getTime();
  return t >= ini.getTime() && t < fim.getTime();
}

function somarDias(base: Date, dias: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + dias);
  return d;
}

function Kpi({
  titulo,
  valor,
  cor,
}: {
  titulo: string;
  valor: string;
  cor?: string;
}) {
  return (
    <div className={`rounded-2xl border p-4 text-left shadow-sm ${cor ?? "border-slate-200 bg-white text-slate-800"}`}>
      <p className="text-xs opacity-70">{titulo}</p>
      <p className="mt-1 text-xl font-bold">{valor}</p>
    </div>
  );
}

export async function DashboardExecutivo() {
  const agora = new Date();
  const mes = agora.getMonth() + 1;
  const ano = agora.getFullYear();
  const ini = new Date(Date.UTC(ano, mes - 1, 1));
  const fim = new Date(Date.UTC(ano, mes, 1));

  const [caminhoes, custos, manutencoes, viagens, contasPagarPagas] = await Promise.all([
    prisma.cavalo.findMany({
      where: { situacao: { not: "vendido" } },
      orderBy: { placa: "asc" },
      select: { id: true, placa: true },
    }),
    prisma.custoFixo.findMany({
      select: { escopo: true, cavaloId: true, valor: true, periodicidade: true },
    }),
    prisma.manutencao.findMany({
      select: { cavaloId: true, data: true, valor: true },
    }),
    prisma.viagem.findMany({
      where: { status: { not: "cancelada" } },
      select: {
        cavaloId: true,
        valorBrutoFrete: true,
        adiantamento: true,
        comissaoTransportadora: true,
        percentualImposto: true,
        comissaoMotoristaPaga: true,
        kmCarregado: true,
        kmVazio: true,
        dataEntrega: true,
        dataCarregamento: true,
        motorista: { select: { percentualComissao: true } },
        cliente: { select: { prazoMedioPagamento: true } },
        despesas: { select: { categoria: true, valor: true } },
        recebimentos: { select: { valor: true, dataEfetiva: true } },
      },
    }),
    // Total de contas a pagar já PAGAS (saem do caixa).
    prisma.contaPagar.aggregate({ where: { paga: true }, _sum: { valor: true } }),
  ]);

  const numeroCaminhoes = caminhoes.length;

  // Custos fixos mensalizados
  let custosEmpresaMensalC = 0;
  const custosVeiculoMensalC = new Map<string, Centavos>();
  for (const c of custos) {
    const m = custoMensalizado(reaisParaCentavos(Number(c.valor)), c.periodicidade);
    if (c.escopo === "veiculo" && c.cavaloId) {
      custosVeiculoMensalC.set(c.cavaloId, (custosVeiculoMensalC.get(c.cavaloId) ?? 0) + m);
    } else {
      custosEmpresaMensalC += m;
    }
  }

  // Manutenções: do mês (abate do resultado) e total (abate do caixa).
  let manutencaoMesC = 0;
  let manutencaoTotalC = 0;
  const manutencaoMesPorCavalo = new Map<string, Centavos>();
  for (const m of manutencoes) {
    const valorC = reaisParaCentavos(Number(m.valor));
    manutencaoTotalC += valorC;
    if (noMes(m.data, ini, fim)) {
      manutencaoMesC += valorC;
      manutencaoMesPorCavalo.set(
        m.cavaloId,
        (manutencaoMesPorCavalo.get(m.cavaloId) ?? 0) + valorC,
      );
    }
  }

  const competencia = (v: (typeof viagens)[number]) =>
    v.dataEntrega ?? v.dataCarregamento;

  // Acumuladores do mês
  let faturamentoMesC = 0;
  let resultadoOperacionalC = 0; // Σ resultado direto (sem custos fixos)
  let nViagensMes = 0;
  let kmCarregadoMes = 0;
  let kmVazioMes = 0;
  const receitaPorCavalo = new Map<string, Centavos>();
  const resultadoPorCavalo = new Map<string, Centavos>();

  // Acumuladores gerais (contas / caixa)
  let aReceberC = 0;
  let vencidoC = 0;
  let entradasC = 0; // recebimentos + adiantamentos
  let saidasC = 0; // despesas de viagem
  let comissoesPagasC = 0; // comissões de motorista já pagas

  for (const v of viagens) {
    const brutoC = reaisParaCentavos(Number(v.valorBrutoFrete));
    const adiantC = reaisParaCentavos(Number(v.adiantamento));
    const comissaoTranspC = reaisParaCentavos(Number(v.comissaoTransportadora));
    const despesasResultC = v.despesas
      .filter((d) => d.categoria !== "comissao_motorista")
      .reduce((s, d) => s + reaisParaCentavos(Number(d.valor)), 0);
    const despesasTotaisC = v.despesas.reduce(
      (s, d) => s + reaisParaCentavos(Number(d.valor)),
      0,
    );
    const recsC = v.recebimentos.map((r) => reaisParaCentavos(Number(r.valor)));

    const { resultadoDireto } = calcularResultadoDireto({
      valorBrutoFrete: brutoC,
      comissaoTransportadora: comissaoTranspC,
      despesasDiretas: despesasResultC,
      percentualComissaoMotorista: Number(v.motorista?.percentualComissao ?? 0),
      percentualImposto: Number(v.percentualImposto ?? 0),
    });

    // --- Indicadores do mês (competência) ---
    if (noMes(competencia(v), ini, fim)) {
      faturamentoMesC += brutoC;
      resultadoOperacionalC += resultadoDireto;
      nViagensMes += 1;
      kmCarregadoMes += v.kmCarregado ?? 0;
      kmVazioMes += v.kmVazio ?? 0;
      if (v.cavaloId) {
        receitaPorCavalo.set(v.cavaloId, (receitaPorCavalo.get(v.cavaloId) ?? 0) + brutoC);
        resultadoPorCavalo.set(v.cavaloId, (resultadoPorCavalo.get(v.cavaloId) ?? 0) + resultadoDireto);
      }
    }

    // --- Contas a receber (acumulado, em aberto, líquido de imposto) ---
    const impostoC = aplicarPercentual(brutoC, Number(v.percentualImposto ?? 0));
    const saldo = calcularSaldoAReceber(brutoC, adiantC, recsC, impostoC);
    if (saldo > 0) {
      aReceberC += saldo;
      const base = v.dataEntrega ?? v.dataCarregamento;
      const prazo = v.cliente?.prazoMedioPagamento ?? null;
      const previsao = base && prazo != null ? somarDias(base, prazo) : null;
      const sit = situacaoConta({
        saldo,
        jaRecebido: adiantC + recsC.reduce((s, x) => s + x, 0),
        previsaoPagamento: previsao,
        hoje: agora,
      });
      if (sit === "vencida") vencidoC += saldo;
    }

    // --- Caixa aproximado (acumulado) ---
    entradasC += adiantC + recsC.reduce((s, x) => s + x, 0);
    saidasC += despesasTotaisC;
    // Comissão do motorista sai do caixa quando marcada como paga.
    if (v.comissaoMotoristaPaga) {
      comissoesPagasC += calcularComissaoMotorista(
        brutoC,
        Number(v.motorista?.percentualComissao ?? 0),
      );
    }
  }

  // Manutenção do mês abate o resultado operacional (e o de cada caminhão).
  resultadoOperacionalC -= manutencaoMesC;
  for (const [cavId, valorC] of manutencaoMesPorCavalo) {
    resultadoPorCavalo.set(cavId, (resultadoPorCavalo.get(cavId) ?? 0) - valorC);
  }

  // Lucro líquido do mês = resultado operacional − rateio de custos fixos de todos os caminhões
  let rateioTotalC = 0;
  for (const cav of caminhoes) {
    rateioTotalC += rateioCustoFixoCaminhao(
      custosEmpresaMensalC,
      numeroCaminhoes,
      custosVeiculoMensalC.get(cav.id) ?? 0,
    );
  }
  const lucroLiquidoC = resultadoOperacionalC - rateioTotalC;

  const contasPagarPagasC = reaisParaCentavos(Number(contasPagarPagas._sum.valor ?? 0));
  const caixaAproxC =
    entradasC - saidasC - comissoesPagasC - contasPagarPagasC - manutencaoTotalC;
  const ticketMedioC = nViagensMes > 0 ? Math.round(faturamentoMesC / nViagensMes) : 0;
  const totalKm = kmCarregadoMes + kmVazioMes;
  const pctVazio = totalKm > 0 ? (kmVazioMes / totalKm) * 100 : null;

  const placaPorId = new Map(caminhoes.map((c) => [c.id, c.placa]));

  return (
    <div className="mt-6 text-left">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">
          Painel executivo · {MESES[mes - 1]} de {ano}
        </h2>
        <Link href="/painel" className="text-sm text-emerald-700 hover:underline">
          Ver painel detalhado →
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi titulo="Caixa (aproximado)" valor={formatarBRL(caixaAproxC)} />
        <Kpi
          titulo="Contas a receber"
          valor={formatarBRL(aReceberC)}
          cor="border-amber-200 bg-amber-50 text-amber-800"
        />
        <Kpi
          titulo="Contas vencidas"
          valor={formatarBRL(vencidoC)}
          cor={vencidoC > 0 ? "border-red-200 bg-red-50 text-red-800" : undefined}
        />
        <Kpi titulo="Faturamento do mês" valor={formatarBRL(faturamentoMesC)} />

        <Kpi titulo="Resultado operacional (mês)" valor={formatarBRL(resultadoOperacionalC)} />
        <Kpi
          titulo="Lucro líquido (mês, c/ custos fixos)"
          valor={formatarBRL(lucroLiquidoC)}
          cor={lucroLiquidoC >= 0 ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}
        />
        <Kpi titulo="Nº de viagens (mês)" valor={String(nViagensMes)} />
        <Kpi titulo="Ticket médio dos fretes" valor={formatarBRL(ticketMedioC)} />

        <Kpi
          titulo="% de km vazios (mês)"
          valor={pctVazio != null ? `${formatarNumero(pctVazio, 1)}%` : "—"}
        />
      </div>

      {/* Por caminhão (mês) */}
      <h3 className="mb-2 mt-6 text-sm font-semibold text-slate-700">
        Por caminhão (mês)
      </h3>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Caminhão</th>
              <th className="px-4 py-2 font-medium">Receita</th>
              <th className="px-4 py-2 font-medium">Lucro (s/ fixos)</th>
            </tr>
          </thead>
          <tbody>
            {caminhoes.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-4 text-center text-slate-400">
                  Nenhum caminhão cadastrado.
                </td>
              </tr>
            )}
            {caminhoes.map((c) => {
              const rec = receitaPorCavalo.get(c.id) ?? 0;
              const res = resultadoPorCavalo.get(c.id) ?? 0;
              return (
                <tr key={c.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2 font-semibold text-slate-800">
                    {placaPorId.get(c.id) ?? c.placa}
                  </td>
                  <td className="px-4 py-2 text-slate-700">{formatarBRL(rec)}</td>
                  <td className={`px-4 py-2 font-semibold ${res >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                    {formatarBRL(res)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-slate-400">
        &ldquo;Caixa (aproximado)&rdquo; = recebimentos + adiantamentos − despesas de viagem −
        manutenções − contas a pagar já pagas − comissões já pagas (não é saldo bancário;
        contas/comissões em aberto ainda não descontam). Indicadores do mês em regime de
        competência (o resultado do mês já desconta a manutenção do mês).
      </p>
    </div>
  );
}
