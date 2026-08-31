import type { Metadata } from "next";
import Link from "next/link";
import { exigirGestor } from "@/infrastructure/auth/sessao";
import { prisma } from "@/infrastructure/prisma";
import { reaisParaCentavos, formatarBRL, type Centavos } from "@/shared/dinheiro";
import { formatarNumero } from "@/shared/formato";
import { percentualAtingido } from "@/domain/metas/validacao";
import { calcularRealizadoMes } from "@/application/metas/realizado";
import { Campo, inputClass } from "@/components/campo";
import { salvarMeta, removerMeta } from "./actions";

export const metadata: Metadata = {
  title: "Metas · Sistema Transportadora",
};

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const mensagens: Record<string, { texto: string; tipo: "ok" | "erro" }> = {
  salva: { texto: "Meta salva.", tipo: "ok" },
  removida: { texto: "Meta removida.", tipo: "ok" },
  "dados-invalidos": { texto: "Verifique os dados da meta.", tipo: "erro" },
  "veiculo-invalido": { texto: "Veículo não encontrado.", tipo: "erro" },
};

function Progresso({ pct }: { pct: number | null }) {
  if (pct == null) return <span className="text-slate-400">—</span>;
  const cor = pct >= 100 ? "text-emerald-700" : pct >= 70 ? "text-amber-700" : "text-red-600";
  return <span className={`font-semibold ${cor}`}>{formatarNumero(pct, 0)}%</span>;
}

export default async function MetasPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; ano?: string; ok?: string; erro?: string }>;
}) {
  await exigirGestor();
  const sp = await searchParams;
  const agora = new Date();
  const mes = Math.min(12, Math.max(1, Number(sp.mes) || agora.getMonth() + 1));
  const ano = Number(sp.ano) || agora.getFullYear();
  const aviso = mensagens[sp.ok ?? ""] ?? mensagens[sp.erro ?? ""];

  const cavalos = await prisma.cavalo.findMany({
    where: { situacao: { not: "vendido" } },
    orderBy: { placa: "asc" },
    select: { id: true, placa: true, marca: true, modelo: true },
  });

  const metas = await prisma.meta.findMany({
    where: { escopo: "veiculo", ano, mes },
  });
  const metaPorCavalo = new Map(metas.map((m) => [m.cavaloId ?? "", m]));

  const linhas = await Promise.all(
    cavalos.map(async (c) => {
      const meta = metaPorCavalo.get(c.id);
      const real = await calcularRealizadoMes(c.id, ano, mes);
      const metaFatC: Centavos | null =
        meta?.metaFaturamento != null ? reaisParaCentavos(Number(meta.metaFaturamento)) : null;
      const metaLucroC: Centavos | null =
        meta?.metaLucro != null ? reaisParaCentavos(Number(meta.metaLucro)) : null;
      const metaConsumo = meta?.metaConsumo != null ? Number(meta.metaConsumo) : null;
      const metaKm = meta?.metaKm ?? null;
      return { c, meta, real, metaFatC, metaLucroC, metaConsumo, metaKm };
    }),
  );

  const anos = [ano - 1, ano, ano + 1];

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Metas por caminhão</h1>
        <Link href="/" className="text-sm text-emerald-700 hover:underline">
          ← Voltar ao início
        </Link>
      </div>

      {aviso && (
        <p
          role="alert"
          className={`mb-4 rounded-lg px-3 py-2 text-sm ${
            aviso.tipo === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
          }`}
        >
          {aviso.texto}
        </p>
      )}

      {/* Filtro de mês/ano */}
      <form method="get" className="mb-6 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="mes" className="text-sm font-medium text-slate-700">Mês</label>
          <select id="mes" name="mes" defaultValue={String(mes)} className="rounded-lg border border-slate-300 px-3 py-2">
            {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="ano" className="text-sm font-medium text-slate-700">Ano</label>
          <select id="ano" name="ano" defaultValue={String(ano)} className="rounded-lg border border-slate-300 px-3 py-2">
            {anos.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <button type="submit" className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900">
          Ver metas
        </button>
      </form>

      {/* Metas x realizado */}
      <div className="mb-8 space-y-4">
        {linhas.map(({ c, meta, real, metaFatC, metaLucroC, metaConsumo, metaKm }) => (
          <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">{c.placa}</h2>
              {meta && (
                <form action={removerMeta}>
                  <input type="hidden" name="id" value={meta.id} />
                  <input type="hidden" name="mes" value={mes} />
                  <input type="hidden" name="ano" value={ano} />
                  <button type="submit" className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-red-600 transition hover:bg-red-50">
                    Remover meta
                  </button>
                </form>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-100 p-3">
                <p className="text-xs text-slate-500">Faturamento</p>
                <p className="text-sm text-slate-700">
                  {formatarBRL(real.faturamentoC)}{" "}
                  <span className="text-slate-400">/ {metaFatC != null ? formatarBRL(metaFatC) : "—"}</span>
                </p>
                <Progresso pct={percentualAtingido(real.faturamentoC, metaFatC)} />
              </div>
              <div className="rounded-xl border border-slate-100 p-3">
                <p className="text-xs text-slate-500">Lucro</p>
                <p className="text-sm text-slate-700">
                  {formatarBRL(real.lucroC)}{" "}
                  <span className="text-slate-400">/ {metaLucroC != null ? formatarBRL(metaLucroC) : "—"}</span>
                </p>
                <Progresso pct={percentualAtingido(real.lucroC, metaLucroC)} />
              </div>
              <div className="rounded-xl border border-slate-100 p-3">
                <p className="text-xs text-slate-500">Km rodados</p>
                <p className="text-sm text-slate-700">
                  {formatarNumero(real.km, 0)}{" "}
                  <span className="text-slate-400">/ {metaKm != null ? formatarNumero(metaKm, 0) : "—"}</span>
                </p>
                <Progresso pct={percentualAtingido(real.km, metaKm)} />
              </div>
              <div className="rounded-xl border border-slate-100 p-3">
                <p className="text-xs text-slate-500">Consumo (km/l)</p>
                <p className="text-sm text-slate-700">
                  {real.consumoKmL != null ? formatarNumero(real.consumoKmL, 2) : "—"}{" "}
                  <span className="text-slate-400">/ {metaConsumo != null ? formatarNumero(metaConsumo, 2) : "—"}</span>
                </p>
                <Progresso pct={real.consumoKmL != null ? percentualAtingido(real.consumoKmL, metaConsumo) : null} />
              </div>
            </div>

            {/* Definir / atualizar meta */}
            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-emerald-700">Definir / atualizar meta</summary>
              <form action={salvarMeta} className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <input type="hidden" name="cavaloId" value={c.id} />
                <input type="hidden" name="ano" value={ano} />
                <input type="hidden" name="mes" value={mes} />
                <Campo id={`fat-${c.id}`} label="Meta faturamento (R$)">
                  <input id={`fat-${c.id}`} name="metaFaturamento" inputMode="decimal" defaultValue={meta?.metaFaturamento != null ? String(Number(meta.metaFaturamento)) : ""} placeholder="0,00" className={inputClass} />
                </Campo>
                <Campo id={`luc-${c.id}`} label="Meta lucro (R$)">
                  <input id={`luc-${c.id}`} name="metaLucro" inputMode="decimal" defaultValue={meta?.metaLucro != null ? String(Number(meta.metaLucro)) : ""} placeholder="0,00" className={inputClass} />
                </Campo>
                <Campo id={`km-${c.id}`} label="Meta km">
                  <input id={`km-${c.id}`} name="metaKm" inputMode="numeric" defaultValue={meta?.metaKm != null ? String(meta.metaKm) : ""} placeholder="10.000" className={inputClass} />
                </Campo>
                <Campo id={`con-${c.id}`} label="Meta consumo (km/l)">
                  <input id={`con-${c.id}`} name="metaConsumo" inputMode="decimal" defaultValue={meta?.metaConsumo != null ? String(Number(meta.metaConsumo)) : ""} placeholder="2,5" className={inputClass} />
                </Campo>
                <div className="sm:col-span-2 lg:col-span-4">
                  <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700">
                    Salvar meta
                  </button>
                </div>
              </form>
            </details>
          </div>
        ))}
        {linhas.length === 0 && (
          <p className="text-sm text-slate-400">Nenhum caminhão cadastrado.</p>
        )}
      </div>

      <p className="text-xs text-slate-400">
        O percentual compara o realizado do mês (competência) com a meta. Verde ≥ 100%,
        amarelo ≥ 70%, vermelho abaixo de 70%.
      </p>
    </main>
  );
}
