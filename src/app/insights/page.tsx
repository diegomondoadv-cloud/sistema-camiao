import type { Metadata } from "next";
import Link from "next/link";
import { exigirGestor } from "@/infrastructure/auth/sessao";
import { gerarInsights, type Severidade } from "@/application/insights/gerar";

export const metadata: Metadata = {
  title: "Insights · Sistema Transportadora",
};

const estilo: Record<Severidade, { card: string; selo: string; rotulo: string }> = {
  critico: { card: "border-red-200 bg-red-50", selo: "bg-red-100 text-red-700", rotulo: "Crítico" },
  atencao: { card: "border-amber-200 bg-amber-50", selo: "bg-amber-100 text-amber-700", rotulo: "Atenção" },
  info: { card: "border-slate-200 bg-white", selo: "bg-slate-100 text-slate-600", rotulo: "Informação" },
};

export default async function InsightsPage() {
  await exigirGestor();
  const insights = await gerarInsights(new Date());

  const nCritico = insights.filter((i) => i.severidade === "critico").length;
  const nAtencao = insights.filter((i) => i.severidade === "atencao").length;

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Insights</h1>
          <p className="text-sm text-slate-500">Alertas automáticos com base nos seus dados.</p>
        </div>
        <Link href="/" className="text-sm text-emerald-700 hover:underline">
          ← Voltar ao início
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 text-sm">
        <span className="rounded-full bg-red-100 px-3 py-1 font-medium text-red-700">{nCritico} crítico(s)</span>
        <span className="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-700">{nAtencao} atenção</span>
      </div>

      {insights.length === 0 && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center text-emerald-800 shadow-sm">
          Tudo em ordem — nenhum alerta no momento. ✓
        </div>
      )}

      <div className="space-y-3">
        {insights.map((i) => {
          const e = estilo[i.severidade];
          return (
            <div key={i.id} className={`rounded-2xl border p-4 shadow-sm ${e.card}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${e.selo}`}>{e.rotulo}</span>
                <span className="text-xs text-slate-500">{i.categoria}</span>
              </div>
              <p className="mt-1 font-semibold text-slate-800">{i.titulo}</p>
              <p className="text-sm text-slate-600">{i.descricao}</p>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-slate-400">
        Os alertas são gerados por regras sobre os dados cadastrados (sem inteligência
        artificial). Futuramente este módulo poderá usar IA.
      </p>
    </main>
  );
}
