import type { Metadata } from "next";
import Link from "next/link";
import { exigirGestor } from "@/infrastructure/auth/sessao";
import { formatarBRL } from "@/shared/dinheiro";
import { formatarNumero } from "@/shared/formato";
import { gerarIndicadoresCliente } from "@/application/relatorios/indicadores-cliente";

export const metadata: Metadata = {
  title: "Indicadores por cliente · Sistema Transportadora",
};

export default async function IndicadoresClientesPage() {
  await exigirGestor();
  const linhas = await gerarIndicadoresCliente(new Date());

  const totalFat = linhas.reduce((s, l) => s + l.faturamentoC, 0);
  const totalLucro = linhas.reduce((s, l) => s + l.lucroC, 0);
  const totalReceber = linhas.reduce((s, l) => s + l.aReceberC, 0);

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Indicadores por cliente</h1>
        <Link href="/" className="text-sm text-emerald-700 hover:underline">
          ← Voltar ao início
        </Link>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Faturamento total</p>
          <p className="text-lg font-bold text-slate-800">{formatarBRL(totalFat)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Lucro total (s/ custos fixos)</p>
          <p className="text-lg font-bold text-slate-800">{formatarBRL(totalLucro)}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-xs text-amber-700/70">A receber (em aberto)</p>
          <p className="text-lg font-bold text-amber-800">{formatarBRL(totalReceber)}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-500">
            <tr>
              <th className="px-3 py-3 font-medium">#</th>
              <th className="px-3 py-3 font-medium">Cliente</th>
              <th className="px-3 py-3 font-medium">Viagens</th>
              <th className="px-3 py-3 font-medium">Faturamento</th>
              <th className="px-3 py-3 font-medium">Lucro</th>
              <th className="px-3 py-3 font-medium">Ticket médio</th>
              <th className="px-3 py-3 font-medium">Prazo</th>
              <th className="px-3 py-3 font-medium">A receber</th>
              <th className="px-3 py-3 font-medium">Vencido</th>
              <th className="px-3 py-3 font-medium">Atraso</th>
            </tr>
          </thead>
          <tbody>
            {linhas.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-6 text-center text-slate-400">
                  Nenhum cliente cadastrado.
                </td>
              </tr>
            )}
            {linhas.map((l, i) => (
              <tr key={l.clienteId} className="border-b border-slate-100 last:border-0">
                <td className="px-3 py-2 text-slate-400">{i + 1}º</td>
                <td className="px-3 py-2 font-semibold text-slate-800">{l.nome}</td>
                <td className="px-3 py-2 text-slate-600">{l.nViagens}</td>
                <td className="px-3 py-2 text-slate-700">{formatarBRL(l.faturamentoC)}</td>
                <td className={`px-3 py-2 font-semibold ${l.lucroC >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                  {formatarBRL(l.lucroC)}
                </td>
                <td className="px-3 py-2 text-slate-600">{formatarBRL(l.ticketMedioC)}</td>
                <td className="px-3 py-2 text-slate-600">
                  {l.prazoMedioPagamento != null ? `${l.prazoMedioPagamento} d` : "—"}
                </td>
                <td className="px-3 py-2 text-slate-600">{formatarBRL(l.aReceberC)}</td>
                <td className={`px-3 py-2 ${l.vencidoC > 0 ? "font-semibold text-red-600" : "text-slate-600"}`}>
                  {formatarBRL(l.vencidoC)}
                </td>
                <td className="px-3 py-2 text-slate-600">
                  {l.indiceAtraso != null ? `${formatarNumero(l.indiceAtraso, 0)}%` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-slate-400">
        Ranking por lucro (resultado direto das viagens, antes de custos fixos). O
        índice de atraso é a proporção de contas em aberto que já venceram.
      </p>
    </main>
  );
}
