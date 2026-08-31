import type { Metadata } from "next";
import Link from "next/link";
import { exigirGestor } from "@/infrastructure/auth/sessao";
import { formatarBRL } from "@/shared/dinheiro";
import { formatarData } from "@/shared/formato";
import { paraData } from "@/shared/parse";
import { gerarFluxoDeCaixa } from "@/application/relatorios/fluxo-de-caixa";
import { BotaoImprimir } from "../botao-imprimir";

export const metadata: Metadata = {
  title: "Extrato de caixa · Sistema Transportadora",
};

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default async function ExtratoCaixaPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; ano?: string; inicio?: string; fim?: string }>;
}) {
  await exigirGestor();
  const sp = await searchParams;

  const agora = new Date();
  const mes = Math.min(12, Math.max(1, Number(sp.mes) || agora.getMonth() + 1));
  const ano = Number(sp.ano) || agora.getFullYear();

  // Período específico (início/fim) tem prioridade sobre mês/ano.
  const inicioSp = paraData(sp.inicio ?? null);
  const fimSp = paraData(sp.fim ?? null);
  let ini: Date;
  let fimExcl: Date;
  let rotuloPeriodo: string;
  if (inicioSp || fimSp) {
    ini = inicioSp ?? new Date(Date.UTC(1970, 0, 1));
    fimExcl = fimSp ? new Date(fimSp.getTime() + 24 * 60 * 60 * 1000) : new Date(Date.UTC(ano + 50, 0, 1));
    rotuloPeriodo = `${inicioSp ? formatarData(inicioSp) : "início"} até ${fimSp ? formatarData(fimSp) : "hoje"}`;
  } else {
    ini = new Date(Date.UTC(ano, mes - 1, 1));
    fimExcl = new Date(Date.UTC(ano, mes, 1));
    rotuloPeriodo = `${MESES[mes - 1]} de ${ano}`;
  }

  const fluxo = await gerarFluxoDeCaixa(ini, fimExcl);
  const anos = [ano + 1, ano, ano - 1, ano - 2];

  const qs = new URLSearchParams();
  if (sp.inicio) qs.set("inicio", sp.inicio);
  if (sp.fim) qs.set("fim", sp.fim);
  if (!sp.inicio && !sp.fim) {
    qs.set("mes", String(mes));
    qs.set("ano", String(ano));
  }
  const linkCsv = `/relatorios/caixa/export?${qs.toString()}`;

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Extrato de caixa</h1>
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
          <label htmlFor="inicio" className="text-sm font-medium text-slate-700">Início (período)</label>
          <input id="inicio" name="inicio" type="date" defaultValue={sp.inicio ?? ""} className="rounded-lg border border-slate-300 px-3 py-2" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="fim" className="text-sm font-medium text-slate-700">Fim (período)</label>
          <input id="fim" name="fim" type="date" defaultValue={sp.fim ?? ""} className="rounded-lg border border-slate-300 px-3 py-2" />
        </div>
        <button type="submit" className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900">
          Aplicar
        </button>
        <div className="ml-auto flex gap-3">
          <a href={linkCsv} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700">
            Baixar planilha (CSV)
          </a>
          <BotaoImprimir />
        </div>
      </form>

      <p className="mb-4 text-sm text-slate-500">{rotuloPeriodo}</p>

      {/* Resumo */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Saldo inicial</p>
          <p className="text-lg font-bold text-slate-800">{formatarBRL(fluxo.saldoInicialC)}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <p className="text-xs text-emerald-700/80">Entradas</p>
          <p className="text-lg font-bold text-emerald-800">{formatarBRL(fluxo.entradasC)}</p>
        </div>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
          <p className="text-xs text-red-700/80">Saídas</p>
          <p className="text-lg font-bold text-red-800">{formatarBRL(fluxo.saidasC)}</p>
        </div>
        <div className={`rounded-2xl border p-4 shadow-sm ${fluxo.saldoFinalC >= 0 ? "border-emerald-200 bg-white" : "border-red-200 bg-white"}`}>
          <p className="text-xs text-slate-500">Saldo final</p>
          <p className={`text-lg font-bold ${fluxo.saldoFinalC >= 0 ? "text-emerald-700" : "text-red-600"}`}>
            {formatarBRL(fluxo.saldoFinalC)}
          </p>
        </div>
      </div>

      {/* Extrato */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-4 py-3 font-medium">Descrição</th>
              <th className="px-4 py-3 text-right font-medium">Entrada</th>
              <th className="px-4 py-3 text-right font-medium">Saída</th>
              <th className="px-4 py-3 text-right font-medium">Saldo</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100 bg-slate-50 text-slate-500">
              <td className="px-4 py-2" colSpan={4}>Saldo inicial</td>
              <td className="px-4 py-2 text-right font-semibold">{formatarBRL(fluxo.saldoInicialC)}</td>
            </tr>
            {fluxo.linhas.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Nenhum movimento no período.
                </td>
              </tr>
            )}
            {fluxo.linhas.map((l, i) => (
              <tr key={i} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-2 text-slate-600">{formatarData(l.data)}</td>
                <td className="px-4 py-2 text-slate-700">{l.descricao}</td>
                <td className="px-4 py-2 text-right text-emerald-700">
                  {l.valorC >= 0 ? formatarBRL(l.valorC) : ""}
                </td>
                <td className="px-4 py-2 text-right text-red-600">
                  {l.valorC < 0 ? formatarBRL(-l.valorC) : ""}
                </td>
                <td className={`px-4 py-2 text-right font-medium ${l.saldoC >= 0 ? "text-slate-800" : "text-red-600"}`}>
                  {formatarBRL(l.saldoC)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-slate-200 font-semibold text-slate-800">
            <tr>
              <td className="px-4 py-3" colSpan={2}>Saldo final</td>
              <td className="px-4 py-3 text-right text-emerald-700">{formatarBRL(fluxo.entradasC)}</td>
              <td className="px-4 py-3 text-right text-red-600">{formatarBRL(fluxo.saidasC)}</td>
              <td className={`px-4 py-3 text-right ${fluxo.saldoFinalC >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                {formatarBRL(fluxo.saldoFinalC)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="mt-4 text-xs text-slate-400">
        <strong>Entradas:</strong> recebimentos e adiantamentos. <strong>Saídas:</strong>{" "}
        despesas de viagem, manutenção, comissões pagas e contas a pagar já pagas.
        O <strong>saldo inicial</strong> é tudo que entrou/saiu antes do período.
        Comissões pagas usam a data da viagem (não têm data de pagamento própria).
      </p>
    </main>
  );
}
