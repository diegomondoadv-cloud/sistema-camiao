import type { Metadata } from "next";
import Link from "next/link";
import { exigirGestor } from "@/infrastructure/auth/sessao";
import { formatarBRL } from "@/shared/dinheiro";
import {
  gerarRelatorioCategorias,
  type RegimeRelatorio,
} from "@/application/relatorios/receitas-despesas-categoria";
import { BotaoImprimir } from "../botao-imprimir";

export const metadata: Metadata = {
  title: "Receitas e despesas por categoria · Sistema Transportadora",
};

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default async function RelatorioCategoriasPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; ano?: string; regime?: string }>;
}) {
  await exigirGestor();
  const sp = await searchParams;

  const agora = new Date();
  const mes = Math.min(12, Math.max(1, Number(sp.mes) || agora.getMonth() + 1));
  const ano = Number(sp.ano) || agora.getFullYear();
  const regime: RegimeRelatorio = sp.regime === "caixa" ? "caixa" : "competencia";
  const ehCaixa = regime === "caixa";

  const rel = await gerarRelatorioCategorias(mes, ano, regime);
  const anos = [ano + 1, ano, ano - 1, ano - 2];

  const qs = new URLSearchParams({ mes: String(mes), ano: String(ano), regime });
  const linkCsv = `/relatorios/categorias/export?${qs.toString()}`;

  const pct = (v: number) =>
    rel.totalDespesasC > 0 ? ((v / rel.totalDespesasC) * 100).toFixed(1) : "0,0";

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">
          Receitas e despesas por categoria
        </h1>
        <Link href="/" className="text-sm text-emerald-700 hover:underline print:hidden">
          ← Voltar ao início
        </Link>
      </div>

      {/* Filtro */}
      <form method="get" className="mb-6 flex flex-wrap items-end gap-3 print:hidden">
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
            <option value="competencia">Competência (data do fato)</option>
            <option value="caixa">Caixa (dinheiro no mês)</option>
          </select>
        </div>
        <button type="submit" className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900">
          Aplicar
        </button>
        <div className="ml-auto flex gap-3">
          <a
            href={linkCsv}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Baixar planilha (CSV)
          </a>
          <BotaoImprimir />
        </div>
      </form>

      <p className="mb-4 text-sm text-slate-500">
        {MESES[mes - 1]} de {ano} · regime de{" "}
        <span className="font-semibold">{ehCaixa ? "caixa" : "competência"}</span>
      </p>

      {/* Resumo */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <p className="text-xs text-emerald-700/80">
            {ehCaixa ? "Entradas (caixa)" : "Receitas (fretes)"}
          </p>
          <p className="text-lg font-bold text-emerald-800">{formatarBRL(rel.receitaBrutaC)}</p>
        </div>
        {!ehCaixa && (
          <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">Receita líquida (− imposto)</p>
            <p className="text-lg font-bold text-emerald-700">{formatarBRL(rel.receitaLiquidaC)}</p>
          </div>
        )}
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
          <p className="text-xs text-red-700/80">{ehCaixa ? "Saídas (caixa)" : "Despesas totais"}</p>
          <p className="text-lg font-bold text-red-800">{formatarBRL(rel.totalDespesasC)}</p>
        </div>
        <div className={`rounded-2xl border p-4 shadow-sm ${rel.resultadoC >= 0 ? "border-emerald-200 bg-white" : "border-red-200 bg-white"}`}>
          <p className="text-xs text-slate-500">{ehCaixa ? "Resultado de caixa" : "Resultado do mês"}</p>
          <p className={`text-lg font-bold ${rel.resultadoC >= 0 ? "text-emerald-700" : "text-red-600"}`}>
            {formatarBRL(rel.resultadoC)}
          </p>
        </div>
      </div>

      {/* Despesas por categoria */}
      <h2 className="mb-3 text-lg font-semibold text-slate-800">Despesas por categoria</h2>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Categoria</th>
              <th className="px-4 py-3 font-medium">Grupo</th>
              <th className="px-4 py-3 text-right font-medium">Valor</th>
              <th className="px-4 py-3 text-right font-medium">% das despesas</th>
            </tr>
          </thead>
          <tbody>
            {rel.despesas.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  Nenhuma despesa no mês selecionado.
                </td>
              </tr>
            )}
            {rel.despesas.map((l, i) => (
              <tr key={`${l.grupo}-${l.rotulo}-${i}`} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-2 font-medium text-slate-800">{l.rotulo}</td>
                <td className="px-4 py-2 text-slate-500">{l.grupo}</td>
                <td className="px-4 py-2 text-right text-slate-700">{formatarBRL(l.valorC)}</td>
                <td className="px-4 py-2 text-right text-slate-500">{pct(l.valorC)}%</td>
              </tr>
            ))}
          </tbody>
          {rel.despesas.length > 0 && (
            <tfoot className="border-t-2 border-slate-200 font-semibold text-slate-800">
              <tr>
                <td className="px-4 py-3">Total de despesas</td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3 text-right">{formatarBRL(rel.totalDespesasC)}</td>
                <td className="px-4 py-3 text-right">100%</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <p className="mt-4 text-xs text-slate-400">
        {ehCaixa ? (
          <>
            <strong>Caixa:</strong> dinheiro que entrou (recebimentos +
            adiantamentos) e saiu (despesas de viagem, manutenção e contas a pagar
            já pagas) no mês, pela data efetiva. Contas/despesas ainda não pagas
            não aparecem aqui.
          </>
        ) : (
          <>
            <strong>Competência:</strong> receita = fretes do mês; as despesas
            incluem imposto, comissões, despesas de viagem (por categoria),
            manutenção do mês e custos fixos mensalizados. O{" "}
            <strong>Resultado do mês</strong> reconcilia com o Painel mensal
            (resultado com custos fixos).
          </>
        )}
      </p>
    </main>
  );
}
