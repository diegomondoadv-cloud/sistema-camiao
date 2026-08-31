import type { Metadata } from "next";
import Link from "next/link";
import { exigirGestor } from "@/infrastructure/auth/sessao";
import { formatarData } from "@/shared/formato";
import {
  gerarEventosCalendario,
  type StatusEvento,
} from "@/application/calendario/eventos";

export const metadata: Metadata = {
  title: "Calendário operacional · Sistema Transportadora",
};

const corStatus: Record<StatusEvento, string> = {
  vencido: "bg-red-50 text-red-700",
  proximo: "bg-amber-50 text-amber-700",
  futuro: "bg-slate-100 text-slate-600",
};
const rotuloStatus: Record<StatusEvento, string> = {
  vencido: "Vencido",
  proximo: "Próximo",
  futuro: "Futuro",
};

const corTipo: Record<string, string> = {
  cnh: "bg-sky-50 text-sky-700",
  toxicologico: "bg-sky-50 text-sky-700",
  documento: "bg-violet-50 text-violet-700",
  manutencao: "bg-orange-50 text-orange-700",
  parcela: "bg-slate-100 text-slate-700",
  recebimento: "bg-emerald-50 text-emerald-700",
};

const HORIZONTES = [
  { valor: 30, rotulo: "30 dias" },
  { valor: 60, rotulo: "60 dias" },
  { valor: 90, rotulo: "90 dias" },
  { valor: 180, rotulo: "6 meses" },
  { valor: 365, rotulo: "1 ano" },
];

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ horizonte?: string }>;
}) {
  await exigirGestor();
  const sp = await searchParams;
  const horizonte = Number(sp.horizonte) || 90;
  const hoje = new Date();

  const eventos = await gerarEventosCalendario(hoje, horizonte);
  const nVencidos = eventos.filter((e) => e.status === "vencido").length;
  const nProximos = eventos.filter((e) => e.status === "proximo").length;

  // Agrupa por mês/ano para exibição
  const grupos = new Map<string, { titulo: string; eventos: typeof eventos }>();
  for (const e of eventos) {
    const chave = `${e.data.getUTCFullYear()}-${e.data.getUTCMonth()}`;
    const titulo = `${MESES[e.data.getUTCMonth()]} de ${e.data.getUTCFullYear()}`;
    const g = grupos.get(chave) ?? { titulo, eventos: [] };
    g.eventos.push(e);
    grupos.set(chave, g);
  }

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Calendário operacional</h1>
        <Link href="/" className="text-sm text-emerald-700 hover:underline">
          ← Voltar ao início
        </Link>
      </div>

      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="horizonte" className="text-sm font-medium text-slate-700">Período</label>
          <select id="horizonte" name="horizonte" defaultValue={String(horizonte)} className="rounded-lg border border-slate-300 px-3 py-2">
            {HORIZONTES.map((h) => (
              <option key={h.valor} value={h.valor}>Próximos {h.rotulo}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900">
          Aplicar
        </button>
        <div className="ml-auto flex gap-2 text-sm">
          {nVencidos > 0 && (
            <span className="rounded-full bg-red-50 px-3 py-1 font-medium text-red-700">{nVencidos} vencido(s)</span>
          )}
          {nProximos > 0 && (
            <span className="rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-700">{nProximos} próximo(s)</span>
          )}
        </div>
      </form>

      {eventos.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-400 shadow-sm">
          Nenhum evento no período selecionado.
        </div>
      )}

      {[...grupos.values()].map((g) => (
        <div key={g.titulo} className="mb-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            {g.titulo}
          </h2>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {g.eventos.map((e, i) => (
              <div
                key={i}
                className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-0"
              >
                <span className="w-16 shrink-0 text-sm font-semibold text-slate-700">
                  {formatarData(e.data)}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${corTipo[e.tipo] ?? "bg-slate-100 text-slate-600"}`}>
                  {e.rotuloTipo}
                </span>
                <span className="flex-1 text-sm text-slate-800">
                  {e.titulo}
                  {e.detalhe && <span className="text-slate-400"> · {e.detalhe}</span>}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${corStatus[e.status]}`}>
                  {rotuloStatus[e.status]}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      <p className="mt-2 text-xs text-slate-400">
        Reúne vencimentos de CNH e exame toxicológico, documentos com vencimento,
        parcelas dos caminhões, próximas manutenções e contas a receber previstas.
      </p>
    </main>
  );
}
