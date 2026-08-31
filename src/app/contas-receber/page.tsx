import type { Metadata } from "next";
import Link from "next/link";
import { exigirGestor } from "@/infrastructure/auth/sessao";
import { prisma } from "@/infrastructure/prisma";
import { reaisParaCentavos, formatarBRL, aplicarPercentual } from "@/shared/dinheiro";
import { formatarData } from "@/shared/formato";
import { paraData } from "@/shared/parse";
import { calcularSaldoAReceber } from "@/domain/financeiro/calculos";
import {
  situacaoConta,
  ROTULO_SITUACAO_CONTA,
  COR_SITUACAO_CONTA,
} from "@/domain/recebimentos/validacao";

export const metadata: Metadata = {
  title: "Contas a receber · Sistema Transportadora",
};

function somarDias(base: Date, dias: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + dias);
  return d;
}

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default async function ContasReceberPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; ano?: string; inicio?: string; fim?: string }>;
}) {
  await exigirGestor();
  const sp = await searchParams;
  const hoje = new Date();
  const anoAtual = hoje.getFullYear();

  // Filtro por previsão de pagamento (mês/ano ou período específico).
  const mesSel = Number(sp.mes) || 0;
  const anoSel = Number(sp.ano) || 0;
  const inicio = paraData(sp.inicio ?? null);
  const fim = paraData(sp.fim ?? null);
  let rangeIni: Date | null = null;
  let rangeFim: Date | null = null; // exclusivo
  if (inicio || fim) {
    rangeIni = inicio;
    rangeFim = fim ? new Date(fim.getTime() + 24 * 60 * 60 * 1000) : null;
  } else if (anoSel > 0) {
    if (mesSel > 0) {
      rangeIni = new Date(Date.UTC(anoSel, mesSel - 1, 1));
      rangeFim = new Date(Date.UTC(anoSel, mesSel, 1));
    } else {
      rangeIni = new Date(Date.UTC(anoSel, 0, 1));
      rangeFim = new Date(Date.UTC(anoSel + 1, 0, 1));
    }
  }
  const temFiltroData = rangeIni != null || rangeFim != null;
  const noPeriodo = (d: Date | null) => {
    if (!temFiltroData) return true;
    if (!d) return false;
    if (rangeIni && d.getTime() < rangeIni.getTime()) return false;
    if (rangeFim && d.getTime() >= rangeFim.getTime()) return false;
    return true;
  };

  const viagens = await prisma.viagem.findMany({
    where: { status: { not: "cancelada" } },
    orderBy: { dataCarregamento: "desc" },
    select: {
      id: true,
      origem: true,
      destino: true,
      dataCarregamento: true,
      previsaoEntrega: true,
      dataEntrega: true,
      valorBrutoFrete: true,
      adiantamento: true,
      percentualImposto: true,
      cavalo: { select: { placa: true } },
      cliente: { select: { razaoSocial: true, prazoMedioPagamento: true } },
      recebimentos: { select: { valor: true } },
    },
  });

  const linhas = viagens
    .map((v) => {
      const brutoC = reaisParaCentavos(Number(v.valorBrutoFrete));
      const adiantC = reaisParaCentavos(Number(v.adiantamento));
      const recebimentosC = v.recebimentos.map((r) =>
        reaisParaCentavos(Number(r.valor)),
      );
      const jaRecebidoC = adiantC + recebimentosC.reduce((s, x) => s + x, 0);
      const impostoC = aplicarPercentual(brutoC, Number(v.percentualImposto ?? 0));
      const saldo = calcularSaldoAReceber(brutoC, adiantC, recebimentosC, impostoC);
      const base = v.dataEntrega ?? v.previsaoEntrega ?? v.dataCarregamento;
      const prazo = v.cliente?.prazoMedioPagamento ?? null;
      const previsaoPagamento =
        base && prazo != null ? somarDias(base, prazo) : null;
      const situacao = situacaoConta({
        saldo,
        jaRecebido: jaRecebidoC,
        previsaoPagamento,
        hoje,
      });
      return { v, brutoC, jaRecebidoC, saldo, previsaoPagamento, situacao };
    })
    .filter((l) => l.saldo > 0)
    .filter((l) => noPeriodo(l.previsaoPagamento))
    .sort((a, b) => {
      const ta = a.previsaoPagamento?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const tb = b.previsaoPagamento?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return ta - tb;
    });

  const totalAReceber = linhas.reduce((s, l) => s + l.saldo, 0);
  const totalVencido = linhas
    .filter((l) => l.situacao === "vencida")
    .reduce((s, l) => s + l.saldo, 0);

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Contas a receber</h1>
        <Link href="/" className="text-sm text-emerald-700 hover:underline">
          ← Voltar ao início
        </Link>
      </div>

      {/* Filtro por previsão de pagamento */}
      <form
        method="get"
        className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="flex flex-col">
          <label className="mb-1 text-xs text-slate-500">Mês</label>
          <select
            name="mes"
            defaultValue={mesSel || ""}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          >
            <option value="">Todos</option>
            {MESES.map((m, i) => (
              <option key={i} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="mb-1 text-xs text-slate-500">Ano</label>
          <select
            name="ano"
            defaultValue={anoSel || ""}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          >
            <option value="">Todos</option>
            {Array.from({ length: 6 }, (_, i) => anoAtual + 1 - i).map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="mb-1 text-xs text-slate-500">Início (período)</label>
          <input
            type="date"
            name="inicio"
            defaultValue={sp.inicio ?? ""}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-col">
          <label className="mb-1 text-xs text-slate-500">Fim (período)</label>
          <input
            type="date"
            name="fim"
            defaultValue={sp.fim ?? ""}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-700"
        >
          Filtrar
        </button>
        {(mesSel > 0 || anoSel > 0 || sp.inicio || sp.fim) && (
          <Link
            href="/contas-receber"
            className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Limpar
          </Link>
        )}
        <p className="w-full text-xs text-slate-400">
          O período específico (início/fim) tem prioridade sobre mês/ano. O filtro
          usa a previsão de pagamento.
        </p>
      </form>

      {/* Totais */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Total a receber</p>
          <p className="text-lg font-bold text-slate-800">
            {formatarBRL(totalAReceber)}
          </p>
        </div>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
          <p className="text-xs text-red-700/70">Total vencido</p>
          <p className="text-lg font-bold text-red-700">
            {formatarBRL(totalVencido)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Contas em aberto</p>
          <p className="text-lg font-bold text-slate-800">{linhas.length}</p>
        </div>
      </div>

      {/* Lista */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Rota / Cliente</th>
              <th className="px-4 py-3 font-medium">Caminhão</th>
              <th className="px-4 py-3 font-medium">Previsão</th>
              <th className="px-4 py-3 font-medium">Bruto</th>
              <th className="px-4 py-3 font-medium">Recebido</th>
              <th className="px-4 py-3 font-medium">Saldo</th>
              <th className="px-4 py-3 font-medium">Situação</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {linhas.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                  Nenhuma conta a receber em aberto.
                </td>
              </tr>
            )}
            {linhas.map((l) => (
              <tr key={l.v.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3">
                  <span className="font-medium text-slate-800">
                    {[l.v.origem, l.v.destino].filter(Boolean).join(" → ") || "—"}
                  </span>
                  <span className="block text-xs text-slate-400">
                    {l.v.cliente?.razaoSocial ?? "sem cliente"}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">{l.v.cavalo.placa}</td>
                <td className="px-4 py-3 text-slate-600">
                  {formatarData(l.previsaoPagamento)}
                </td>
                <td className="px-4 py-3 text-slate-600">{formatarBRL(l.brutoC)}</td>
                <td className="px-4 py-3 text-slate-600">
                  {formatarBRL(l.jaRecebidoC)}
                </td>
                <td className="px-4 py-3 font-semibold text-slate-800">
                  {formatarBRL(l.saldo)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      COR_SITUACAO_CONTA[l.situacao] ?? "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {ROTULO_SITUACAO_CONTA[l.situacao]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/viagens/${l.v.id}`}
                    className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Abrir
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-slate-400">
        A previsão de pagamento é estimada pela data de entrega/carregamento mais o
        prazo médio do cliente. Ajuste o prazo no cadastro do cliente.
      </p>
    </main>
  );
}
