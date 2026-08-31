import type { Metadata } from "next";
import Link from "next/link";
import { exigirGestor } from "@/infrastructure/auth/sessao";
import { prisma } from "@/infrastructure/prisma";
import { formatarBRL } from "@/shared/dinheiro";
import { gerarResultadoMensalPorCaminhao } from "@/application/relatorios/resultado-mensal-caminhao";
import { BotaoImprimir } from "../botao-imprimir";

export const metadata: Metadata = {
  title: "Resultado por caminhão · Sistema Transportadora",
};

const MESES_ABREV = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

function corResultado(v: number): string {
  return v > 0 ? "text-emerald-700" : v < 0 ? "text-red-600" : "text-slate-500";
}

export default async function ResultadoPorCaminhaoPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string; cavaloId?: string }>;
}) {
  await exigirGestor();
  const sp = await searchParams;

  const agora = new Date();
  const ano = Number(sp.ano) || agora.getFullYear();
  const cavaloId = sp.cavaloId || null;

  const [cavalos, dados] = await Promise.all([
    prisma.cavalo.findMany({
      where: { situacao: { not: "vendido" } },
      orderBy: { placa: "asc" },
      select: { id: true, placa: true },
    }),
    gerarResultadoMensalPorCaminhao({ ano, cavaloId }),
  ]);

  const anos = [ano + 1, ano, ano - 1, ano - 2];

  const qs = new URLSearchParams({ ano: String(ano) });
  if (cavaloId) qs.set("cavaloId", cavaloId);
  const linkCsv = `/relatorios/por-caminhao/export?${qs.toString()}`;

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">
          Resultado por caminhão
        </h1>
        <Link href="/" className="text-sm text-emerald-700 hover:underline print:hidden">
          ← Voltar ao início
        </Link>
      </div>

      {/* Filtros */}
      <form method="get" className="mb-6 flex flex-wrap items-end gap-3 print:hidden">
        <div className="flex flex-col gap-1">
          <label htmlFor="ano" className="text-sm font-medium text-slate-700">Ano</label>
          <select id="ano" name="ano" defaultValue={String(ano)} className="rounded-lg border border-slate-300 px-3 py-2">
            {anos.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="cavaloId" className="text-sm font-medium text-slate-700">Caminhão</label>
          <select id="cavaloId" name="cavaloId" defaultValue={cavaloId ?? ""} className="rounded-lg border border-slate-300 px-3 py-2">
            <option value="">Todos</option>
            {cavalos.map((c) => (
              <option key={c.id} value={c.id}>{c.placa}</option>
            ))}
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
        Ano <span className="font-semibold">{ano}</span> · resultado líquido real
        (frete − imposto − comissão − despesas − combustível − rateio de custo fixo).
      </p>

      {dados.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-400 shadow-sm">
          Nenhum caminhão cadastrado.
        </div>
      )}

      {dados.map((cav) => (
        <section key={cav.cavaloId} className="mb-8">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold text-slate-800">{cav.placa}</h2>
            <span className={`text-sm font-bold ${corResultado(cav.total.resultadoLiquidoC)}`}>
              Resultado do ano: {formatarBRL(cav.total.resultadoLiquidoC)}
            </span>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Mês</th>
                  <th className="px-3 py-2 text-right font-medium">Viagens</th>
                  <th className="px-3 py-2 text-right font-medium">Faturamento</th>
                  <th className="px-3 py-2 text-right font-medium">Imposto</th>
                  <th className="px-3 py-2 text-right font-medium">Comissão mot.</th>
                  <th className="px-3 py-2 text-right font-medium">Combustível</th>
                  <th className="px-3 py-2 text-right font-medium">Outras desp.</th>
                  <th className="px-3 py-2 text-right font-medium">Manutenção</th>
                  <th className="px-3 py-2 text-right font-medium">Rateio fixo</th>
                  <th className="px-3 py-2 text-right font-medium">Resultado líq.</th>
                </tr>
              </thead>
              <tbody>
                {cav.meses.map((m) => {
                  const vazio = m.nViagens === 0;
                  return (
                    <tr
                      key={m.mes}
                      className={`border-b border-slate-100 last:border-0 ${vazio ? "text-slate-400" : ""}`}
                    >
                      <td className="px-3 py-2 font-medium">{MESES_ABREV[m.mes - 1]}</td>
                      <td className="px-3 py-2 text-right">{m.nViagens || "—"}</td>
                      <td className="px-3 py-2 text-right">{formatarBRL(m.faturamentoC)}</td>
                      <td className="px-3 py-2 text-right">{formatarBRL(m.impostoC)}</td>
                      <td className="px-3 py-2 text-right">{formatarBRL(m.comissaoMotoristaC)}</td>
                      <td className="px-3 py-2 text-right">{formatarBRL(m.combustivelC)}</td>
                      <td className="px-3 py-2 text-right">{formatarBRL(m.outrasDespesasC)}</td>
                      <td className="px-3 py-2 text-right">{formatarBRL(m.manutencaoC)}</td>
                      <td className="px-3 py-2 text-right">{formatarBRL(m.rateioFixoC)}</td>
                      <td className={`px-3 py-2 text-right font-semibold ${corResultado(m.resultadoLiquidoC)}`}>
                        {formatarBRL(m.resultadoLiquidoC)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2 border-slate-200 font-semibold text-slate-800">
                <tr>
                  <td className="px-3 py-2">Total {ano}</td>
                  <td className="px-3 py-2 text-right">{cav.total.nViagens}</td>
                  <td className="px-3 py-2 text-right">{formatarBRL(cav.total.faturamentoC)}</td>
                  <td className="px-3 py-2 text-right">{formatarBRL(cav.total.impostoC)}</td>
                  <td className="px-3 py-2 text-right">{formatarBRL(cav.total.comissaoMotoristaC)}</td>
                  <td className="px-3 py-2 text-right">{formatarBRL(cav.total.combustivelC)}</td>
                  <td className="px-3 py-2 text-right">{formatarBRL(cav.total.outrasDespesasC)}</td>
                  <td className="px-3 py-2 text-right">{formatarBRL(cav.total.manutencaoC)}</td>
                  <td className="px-3 py-2 text-right">{formatarBRL(cav.total.rateioFixoC)}</td>
                  <td className={`px-3 py-2 text-right font-bold ${corResultado(cav.total.resultadoLiquidoC)}`}>
                    {formatarBRL(cav.total.resultadoLiquidoC)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      ))}

      <div className="mt-4 space-y-1 text-xs text-slate-400">
        <p>
          <strong>Resultado líquido real</strong> = faturamento − imposto −
          comissão do motorista − comissão da transportadora − combustível −
          outras despesas − manutenção − rateio de custo fixo.
        </p>
        <p>
          A viagem entra no mês da <strong>data de competência</strong> (entrega,
          ou carregamento se não houver entrega). O <strong>rateio de custo
          fixo</strong> é aplicado a todos os meses, pois o custo fixo existe todo
          mês independentemente de haver viagem.
        </p>
      </div>
    </main>
  );
}
