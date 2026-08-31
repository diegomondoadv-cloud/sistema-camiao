import type { Metadata } from "next";
import Link from "next/link";
import { exigirGestor } from "@/infrastructure/auth/sessao";
import { prisma } from "@/infrastructure/prisma";
import { formatarBRL } from "@/shared/dinheiro";
import { formatarData } from "@/shared/formato";
import { paraData } from "@/shared/parse";
import { gerarRelatorioResultado } from "@/application/relatorios/resultado";
import { BotaoImprimir } from "./botao-imprimir";

export const metadata: Metadata = {
  title: "Relatórios · Sistema Transportadora",
};

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{
    inicio?: string;
    fim?: string;
    cavaloId?: string;
    clienteId?: string;
  }>;
}) {
  await exigirGestor();
  const sp = await searchParams;

  const filtro = {
    inicio: paraData(sp.inicio ?? null),
    fim: paraData(sp.fim ?? null),
    cavaloId: sp.cavaloId || null,
    clienteId: sp.clienteId || null,
  };

  const [cavalos, clientes, rel] = await Promise.all([
    prisma.cavalo.findMany({ orderBy: { placa: "asc" }, select: { id: true, placa: true } }),
    prisma.cliente.findMany({ orderBy: { razaoSocial: "asc" }, select: { id: true, razaoSocial: true } }),
    gerarRelatorioResultado(filtro),
  ]);

  const qs = new URLSearchParams();
  if (sp.inicio) qs.set("inicio", sp.inicio);
  if (sp.fim) qs.set("fim", sp.fim);
  if (sp.cavaloId) qs.set("cavaloId", sp.cavaloId);
  if (sp.clienteId) qs.set("clienteId", sp.clienteId);
  const linkCsv = `/relatorios/export${qs.toString() ? `?${qs.toString()}` : ""}`;

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">
          Relatório de resultado
        </h1>
        <Link href="/" className="text-sm text-emerald-700 hover:underline print:hidden">
          ← Voltar ao início
        </Link>
      </div>

      {/* Filtros */}
      <form method="get" className="mb-6 flex flex-wrap items-end gap-3 print:hidden">
        <div className="flex flex-col gap-1">
          <label htmlFor="inicio" className="text-sm font-medium text-slate-700">Início</label>
          <input id="inicio" name="inicio" type="date" defaultValue={sp.inicio ?? ""} className="rounded-lg border border-slate-300 px-3 py-2" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="fim" className="text-sm font-medium text-slate-700">Fim</label>
          <input id="fim" name="fim" type="date" defaultValue={sp.fim ?? ""} className="rounded-lg border border-slate-300 px-3 py-2" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="cavaloId" className="text-sm font-medium text-slate-700">Caminhão</label>
          <select id="cavaloId" name="cavaloId" defaultValue={sp.cavaloId ?? ""} className="rounded-lg border border-slate-300 px-3 py-2">
            <option value="">Todos</option>
            {cavalos.map((c) => (
              <option key={c.id} value={c.id}>{c.placa}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="clienteId" className="text-sm font-medium text-slate-700">Cliente</label>
          <select id="clienteId" name="clienteId" defaultValue={sp.clienteId ?? ""} className="rounded-lg border border-slate-300 px-3 py-2">
            <option value="">Todos</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>{c.razaoSocial}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900">
          Filtrar
        </button>
      </form>

      {/* Ações */}
      <div className="mb-6 flex flex-wrap gap-3 print:hidden">
        <a
          href={linkCsv}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          Baixar planilha (CSV)
        </a>
        <BotaoImprimir />
      </div>

      {/* Resumo por caminhão */}
      <h2 className="mb-3 text-lg font-semibold text-slate-800">
        Resultado por caminhão
      </h2>
      <div className="mb-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Caminhão</th>
              <th className="px-4 py-3 font-medium">Nº viagens</th>
              <th className="px-4 py-3 font-medium">Faturamento</th>
              <th className="px-4 py-3 font-medium">Custos</th>
              <th className="px-4 py-3 font-medium">Resultado</th>
            </tr>
          </thead>
          <tbody>
            {rel.porCaminhao.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Nenhuma viagem no período/filtro selecionado.
                </td>
              </tr>
            )}
            {rel.porCaminhao.map((c) => (
              <tr key={c.cavaloId} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-semibold text-slate-800">{c.placa}</td>
                <td className="px-4 py-3 text-slate-600">{c.nViagens}</td>
                <td className="px-4 py-3 text-slate-700">{formatarBRL(c.faturamentoC)}</td>
                <td className="px-4 py-3 text-slate-600">{formatarBRL(c.custosC)}</td>
                <td className={`px-4 py-3 font-bold ${c.resultadoC >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                  {formatarBRL(c.resultadoC)}
                </td>
              </tr>
            ))}
          </tbody>
          {rel.porCaminhao.length > 0 && (
            <tfoot className="border-t-2 border-slate-200 font-semibold text-slate-800">
              <tr>
                <td className="px-4 py-3">Total</td>
                <td className="px-4 py-3">{rel.viagens.length}</td>
                <td className="px-4 py-3">{formatarBRL(rel.totais.faturamentoC)}</td>
                <td className="px-4 py-3">{formatarBRL(rel.totais.custosC)}</td>
                <td className={`px-4 py-3 font-bold ${rel.totais.resultadoC >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                  {formatarBRL(rel.totais.resultadoC)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Detalhe por viagem */}
      <h2 className="mb-3 text-lg font-semibold text-slate-800">
        Resultado por viagem
      </h2>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-500">
            <tr>
              <th className="px-3 py-3 font-medium">Data</th>
              <th className="px-3 py-3 font-medium">Rota</th>
              <th className="px-3 py-3 font-medium">Caminhão</th>
              <th className="px-3 py-3 font-medium">Cliente</th>
              <th className="px-3 py-3 font-medium">Frete</th>
              <th className="px-3 py-3 font-medium">Despesas</th>
              <th className="px-3 py-3 font-medium">Com. mot.</th>
              <th className="px-3 py-3 font-medium">Imposto</th>
              <th className="px-3 py-3 font-medium">Resultado</th>
            </tr>
          </thead>
          <tbody>
            {rel.viagens.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-slate-400">
                  Nenhuma viagem no período/filtro selecionado.
                </td>
              </tr>
            )}
            {rel.viagens.map((v) => (
              <tr key={v.id} className="border-b border-slate-100 last:border-0">
                <td className="px-3 py-2 text-slate-600">{formatarData(v.data)}</td>
                <td className="px-3 py-2 text-slate-700">{v.rota}</td>
                <td className="px-3 py-2 text-slate-600">{v.caminhao}</td>
                <td className="px-3 py-2 text-slate-600">{v.cliente}</td>
                <td className="px-3 py-2 text-slate-700">{formatarBRL(v.brutoC)}</td>
                <td className="px-3 py-2 text-slate-600">{formatarBRL(v.despesasC)}</td>
                <td className="px-3 py-2 text-slate-600">{formatarBRL(v.comissaoMotoristaC)}</td>
                <td className="px-3 py-2 text-slate-600">{formatarBRL(v.impostoC)}</td>
                <td className={`px-3 py-2 font-semibold ${v.resultadoC >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                  {formatarBRL(v.resultadoC)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
