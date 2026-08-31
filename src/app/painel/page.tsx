import type { Metadata } from "next";
import Link from "next/link";
import { exigirGestor } from "@/infrastructure/auth/sessao";
import { prisma } from "@/infrastructure/prisma";
import { reaisParaCentavos, formatarBRL, aplicarPercentual, type Centavos } from "@/shared/dinheiro";
import {
  calcularResultadoDireto,
  calcularSaldoAReceber,
  rateioCustoFixoCaminhao,
} from "@/domain/financeiro/calculos";
import { custoMensalizado } from "@/domain/custos-fixos/validacao";

export const metadata: Metadata = {
  title: "Painel mensal · Sistema Transportadora",
};

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function noMes(d: Date | null | undefined, ini: Date, fim: Date): boolean {
  if (!d) return false;
  const t = d.getTime();
  return t >= ini.getTime() && t < fim.getTime();
}

function Kpi({ titulo, valor, cor }: { titulo: string; valor: string; cor?: string }) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${cor ?? "border-slate-200 bg-white"}`}>
      <p className="text-xs opacity-70">{titulo}</p>
      <p className="text-lg font-bold">{valor}</p>
    </div>
  );
}

export default async function PainelPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; ano?: string; regime?: string }>;
}) {
  await exigirGestor();
  const sp = await searchParams;

  const agora = new Date();
  const mes = Math.min(12, Math.max(1, Number(sp.mes) || agora.getMonth() + 1));
  const ano = Number(sp.ano) || agora.getFullYear();
  const regime = sp.regime === "caixa" ? "caixa" : "competencia";

  const ini = new Date(Date.UTC(ano, mes - 1, 1));
  const fim = new Date(Date.UTC(ano, mes, 1));

  const [caminhoes, custos, manutencoes, viagens] = await Promise.all([
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
        dataEntrega: true,
        dataCarregamento: true,
        motorista: { select: { percentualComissao: true } },
        despesas: { select: { categoria: true, valor: true } },
        recebimentos: { select: { valor: true, dataEfetiva: true } },
      },
    }),
  ]);

  const numeroCaminhoes = caminhoes.length;

  // Custos fixos mensalizados (empresa e por veículo)
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

  // Manutenções do mês (pela data), somadas por caminhão.
  const manutencaoMesPorCavalo = new Map<string, Centavos>();
  for (const m of manutencoes) {
    if (!noMes(m.data, ini, fim)) continue;
    manutencaoMesPorCavalo.set(
      m.cavaloId,
      (manutencaoMesPorCavalo.get(m.cavaloId) ?? 0) + reaisParaCentavos(Number(m.valor)),
    );
  }

  const competencia = (v: (typeof viagens)[number]) =>
    v.dataEntrega ?? v.dataCarregamento;

  // Agrega por caminhão
  const linhas = caminhoes.map((cav) => {
    const doCavalo = viagens.filter((v) => v.cavaloId === cav.id);

    // Competência: viagens cuja data de competência cai no mês
    let faturamentoCompC = 0;
    let custosOperacionaisC = 0; // comissão transp + despesas + comissão motorista + imposto
    for (const v of doCavalo) {
      if (!noMes(competencia(v), ini, fim)) continue;
      const brutoC = reaisParaCentavos(Number(v.valorBrutoFrete));
      const comissaoTranspC = reaisParaCentavos(Number(v.comissaoTransportadora));
      const despesasResultC = v.despesas
        .filter((d) => d.categoria !== "comissao_motorista")
        .reduce((s, d) => s + reaisParaCentavos(Number(d.valor)), 0);
      const { comissaoMotorista, imposto } = calcularResultadoDireto({
        valorBrutoFrete: brutoC,
        comissaoTransportadora: comissaoTranspC,
        despesasDiretas: despesasResultC,
        percentualComissaoMotorista: Number(v.motorista?.percentualComissao ?? 0),
        percentualImposto: Number(v.percentualImposto ?? 0),
      });
      faturamentoCompC += brutoC;
      custosOperacionaisC += comissaoTranspC + despesasResultC + comissaoMotorista + imposto;
    }

    // Caixa: dinheiro recebido no mês (recebimentos + adiantamentos do mês)
    let recebidoCaixaC = 0;
    for (const v of doCavalo) {
      for (const r of v.recebimentos) {
        if (noMes(r.dataEfetiva, ini, fim)) recebidoCaixaC += reaisParaCentavos(Number(r.valor));
      }
      if (noMes(v.dataCarregamento, ini, fim)) {
        recebidoCaixaC += reaisParaCentavos(Number(v.adiantamento));
      }
    }

    const manutencaoC = manutencaoMesPorCavalo.get(cav.id) ?? 0;
    const receitaC = regime === "caixa" ? recebidoCaixaC : faturamentoCompC;
    const resultadoSemFixosC = receitaC - custosOperacionaisC - manutencaoC;
    const rateioC = rateioCustoFixoCaminhao(
      custosEmpresaMensalC,
      numeroCaminhoes,
      custosVeiculoMensalC.get(cav.id) ?? 0,
    );
    const resultadoComFixosC = resultadoSemFixosC - rateioC;

    return {
      cav,
      receitaC,
      custosOperacionaisC,
      manutencaoC,
      resultadoSemFixosC,
      rateioC,
      resultadoComFixosC,
    };
  });

  // KPIs globais
  const faturadoMesC = viagens
    .filter((v) => noMes(competencia(v), ini, fim))
    .reduce((s, v) => s + reaisParaCentavos(Number(v.valorBrutoFrete)), 0);
  let recebidoMesC = 0;
  for (const v of viagens) {
    for (const r of v.recebimentos) {
      if (noMes(r.dataEfetiva, ini, fim)) recebidoMesC += reaisParaCentavos(Number(r.valor));
    }
    if (noMes(v.dataCarregamento, ini, fim)) recebidoMesC += reaisParaCentavos(Number(v.adiantamento));
  }
  const aReceberAbertoC = viagens.reduce((s, v) => {
    const brutoC = reaisParaCentavos(Number(v.valorBrutoFrete));
    const adiantC = reaisParaCentavos(Number(v.adiantamento));
    const recs = v.recebimentos.map((r) => reaisParaCentavos(Number(r.valor)));
    const impostoC = aplicarPercentual(brutoC, Number(v.percentualImposto ?? 0));
    const saldo = calcularSaldoAReceber(brutoC, adiantC, recs, impostoC);
    return s + (saldo > 0 ? saldo : 0);
  }, 0);

  const totalReceita = linhas.reduce((s, l) => s + l.receitaC, 0);
  const totalCustosOp = linhas.reduce((s, l) => s + l.custosOperacionaisC, 0);
  const totalManutencao = linhas.reduce((s, l) => s + l.manutencaoC, 0);
  const totalSemFixos = linhas.reduce((s, l) => s + l.resultadoSemFixosC, 0);
  const totalFixos = linhas.reduce((s, l) => s + l.rateioC, 0);
  const totalComFixos = linhas.reduce((s, l) => s + l.resultadoComFixosC, 0);

  const anos = [ano - 1, ano, ano + 1];
  const labelReceita = regime === "caixa" ? "Recebido (caixa)" : "Faturamento (competência)";

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Painel mensal</h1>
        <Link href="/" className="text-sm text-emerald-700 hover:underline">
          ← Voltar ao início
        </Link>
      </div>

      {/* Filtros */}
      <form method="get" className="mb-6 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="mes" className="text-sm font-medium text-slate-700">Mês</label>
          <select id="mes" name="mes" defaultValue={String(mes)} className="rounded-lg border border-slate-300 px-3 py-2">
            {MESES.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="ano" className="text-sm font-medium text-slate-700">Ano</label>
          <select id="ano" name="ano" defaultValue={String(ano)} className="rounded-lg border border-slate-300 px-3 py-2">
            {anos.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="regime" className="text-sm font-medium text-slate-700">Regime</label>
          <select id="regime" name="regime" defaultValue={regime} className="rounded-lg border border-slate-300 px-3 py-2">
            <option value="competencia">Competência (data do frete)</option>
            <option value="caixa">Caixa (data do recebimento)</option>
          </select>
        </div>
        <button
          type="submit"
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900"
        >
          Aplicar
        </button>
      </form>

      <p className="mb-4 text-sm text-slate-500">
        {MESES[mes - 1]} de {ano} · regime de{" "}
        <span className="font-semibold">
          {regime === "caixa" ? "caixa" : "competência"}
        </span>
      </p>

      {/* KPIs */}
      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi titulo="Faturado no mês (competência)" valor={formatarBRL(faturadoMesC)} />
        <Kpi titulo="Recebido no mês (caixa)" valor={formatarBRL(recebidoMesC)} />
        <Kpi titulo="A receber (em aberto)" valor={formatarBRL(aReceberAbertoC)} cor="border-amber-200 bg-amber-50 text-amber-800" />
        <Kpi
          titulo="Resultado do mês (com custos fixos)"
          valor={formatarBRL(totalComFixos)}
          cor={totalComFixos >= 0 ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}
        />
      </div>

      {/* Tabela por caminhão */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Caminhão</th>
              <th className="px-4 py-3 font-medium">{labelReceita}</th>
              <th className="px-4 py-3 font-medium">Custos operacionais</th>
              <th className="px-4 py-3 font-medium">Manutenção</th>
              <th className="px-4 py-3 font-medium">Resultado s/ fixos</th>
              <th className="px-4 py-3 font-medium">Custos fixos (rateio)</th>
              <th className="px-4 py-3 font-medium">Resultado c/ fixos</th>
            </tr>
          </thead>
          <tbody>
            {linhas.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                  Nenhum caminhão cadastrado.
                </td>
              </tr>
            )}
            {linhas.map((l) => (
              <tr key={l.cav.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-semibold text-slate-800">{l.cav.placa}</td>
                <td className="px-4 py-3 text-slate-700">{formatarBRL(l.receitaC)}</td>
                <td className="px-4 py-3 text-slate-600">{formatarBRL(l.custosOperacionaisC)}</td>
                <td className="px-4 py-3 text-slate-600">{formatarBRL(l.manutencaoC)}</td>
                <td className="px-4 py-3 text-slate-700">{formatarBRL(l.resultadoSemFixosC)}</td>
                <td className="px-4 py-3 text-slate-600">{formatarBRL(l.rateioC)}</td>
                <td
                  className={`px-4 py-3 font-bold ${
                    l.resultadoComFixosC >= 0 ? "text-emerald-700" : "text-red-600"
                  }`}
                >
                  {formatarBRL(l.resultadoComFixosC)}
                </td>
              </tr>
            ))}
          </tbody>
          {linhas.length > 0 && (
            <tfoot className="border-t-2 border-slate-200 font-semibold text-slate-800">
              <tr>
                <td className="px-4 py-3">Total</td>
                <td className="px-4 py-3">{formatarBRL(totalReceita)}</td>
                <td className="px-4 py-3">{formatarBRL(totalCustosOp)}</td>
                <td className="px-4 py-3">{formatarBRL(totalManutencao)}</td>
                <td className="px-4 py-3">{formatarBRL(totalSemFixos)}</td>
                <td className="px-4 py-3">{formatarBRL(totalFixos)}</td>
                <td
                  className={`px-4 py-3 font-bold ${
                    totalComFixos >= 0 ? "text-emerald-700" : "text-red-600"
                  }`}
                >
                  {formatarBRL(totalComFixos)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="mt-4 space-y-1 text-xs text-slate-400">
        <p>
          <strong>Competência:</strong> receita reconhecida pela data do frete
          (entrega, ou carregamento se não houver entrega).{" "}
          <strong>Caixa:</strong> dinheiro efetivamente recebido no mês
          (recebimentos + adiantamentos).
        </p>
        <p>
          <strong>Custos operacionais</strong> = comissão da transportadora +
          despesas da viagem + comissão do motorista + imposto.
          <strong> Manutenção</strong> = manutenções lançadas no mês (pela data).
          <strong> Custos fixos</strong> mensalizados e rateados por caminhão
          (valor fixo por caminhão).
        </p>
      </div>
    </main>
  );
}
