import type { Metadata } from "next";
import Link from "next/link";
import { exigirGestor } from "@/infrastructure/auth/sessao";
import { prisma } from "@/infrastructure/prisma";
import { reaisParaCentavos, formatarBRL, type Centavos } from "@/shared/dinheiro";
import { formatarData } from "@/shared/formato";
import { calcularComissaoMotorista } from "@/domain/financeiro/calculos";
import { alternarComissaoPaga } from "./actions";

export const metadata: Metadata = {
  title: "Comissões de motoristas · Sistema Transportadora",
};

const mensagens: Record<string, { texto: string; tipo: "ok" | "erro" }> = {
  atualizada: { texto: "Comissão atualizada.", tipo: "ok" },
  "nao-encontrada": { texto: "Viagem não encontrada.", tipo: "erro" },
};

type LinhaViagem = {
  id: string;
  data: Date | null;
  rota: string;
  comissaoC: Centavos;
  paga: boolean;
};

type GrupoMotorista = {
  nome: string;
  percentual: number;
  totalC: Centavos;
  pagoC: Centavos;
  abertoC: Centavos;
  viagens: LinhaViagem[];
};

export default async function ComissoesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  await exigirGestor();
  const { ok, erro } = await searchParams;
  const aviso = mensagens[ok ?? ""] ?? mensagens[erro ?? ""];

  const viagens = await prisma.viagem.findMany({
    where: { status: { not: "cancelada" }, motoristaId: { not: null } },
    orderBy: { dataCarregamento: "desc" },
    select: {
      id: true,
      origem: true,
      destino: true,
      dataCarregamento: true,
      dataEntrega: true,
      valorBrutoFrete: true,
      comissaoMotoristaPaga: true,
      motorista: { select: { id: true, nome: true, percentualComissao: true } },
    },
  });

  const grupos = new Map<string, GrupoMotorista>();
  for (const v of viagens) {
    if (!v.motorista) continue;
    const pct = Number(v.motorista.percentualComissao ?? 0);
    const comissaoC = calcularComissaoMotorista(
      reaisParaCentavos(Number(v.valorBrutoFrete)),
      pct,
    );

    const g =
      grupos.get(v.motorista.id) ??
      { nome: v.motorista.nome, percentual: pct, totalC: 0, pagoC: 0, abertoC: 0, viagens: [] };

    g.totalC += comissaoC;
    if (v.comissaoMotoristaPaga) g.pagoC += comissaoC;
    else g.abertoC += comissaoC;
    g.viagens.push({
      id: v.id,
      data: v.dataCarregamento ?? v.dataEntrega,
      rota: [v.origem, v.destino].filter(Boolean).join(" → ") || "—",
      comissaoC,
      paga: v.comissaoMotoristaPaga,
    });
    grupos.set(v.motorista.id, g);
  }

  const lista = [...grupos.values()].sort((a, b) => b.abertoC - a.abertoC);
  const totalAberto = lista.reduce((s, g) => s + g.abertoC, 0);
  const totalPago = lista.reduce((s, g) => s + g.pagoC, 0);

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Comissões de motoristas</h1>
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

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-xs text-amber-700/70">Total a pagar (em aberto)</p>
          <p className="text-xl font-bold text-amber-800">{formatarBRL(totalAberto)}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <p className="text-xs text-emerald-700/70">Total já pago</p>
          <p className="text-xl font-bold text-emerald-800">{formatarBRL(totalPago)}</p>
        </div>
      </div>

      {lista.length === 0 && (
        <p className="text-sm text-slate-400">
          Nenhuma comissão a exibir. Vincule um motorista (com percentual de comissão) às viagens.
        </p>
      )}

      {lista.map((g) => (
        <div key={g.nome} className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">{g.nome}</h2>
              <p className="text-xs text-slate-500">Comissão de {g.percentual.toLocaleString("pt-BR")}% sobre o frete bruto</p>
            </div>
            <div className="flex gap-4 text-right text-sm">
              <div>
                <p className="text-xs text-slate-500">A receber</p>
                <p className="font-bold text-amber-700">{formatarBRL(g.abertoC)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Pago</p>
                <p className="font-bold text-emerald-700">{formatarBRL(g.pagoC)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Total</p>
                <p className="font-bold text-slate-800">{formatarBRL(g.totalC)}</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Data</th>
                  <th className="px-3 py-2 font-medium">Rota</th>
                  <th className="px-3 py-2 font-medium">Comissão</th>
                  <th className="px-3 py-2 font-medium">Situação</th>
                  <th className="px-3 py-2 font-medium">Ação</th>
                </tr>
              </thead>
              <tbody>
                {g.viagens.map((v) => (
                  <tr key={v.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2 text-slate-600">{formatarData(v.data)}</td>
                    <td className="px-3 py-2 text-slate-700">{v.rota}</td>
                    <td className="px-3 py-2 font-medium text-slate-800">{formatarBRL(v.comissaoC)}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          v.paga ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {v.paga ? "Paga" : "Em aberto"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <form action={alternarComissaoPaga}>
                        <input type="hidden" name="viagemId" value={v.id} />
                        <button
                          type="submit"
                          className={`rounded-lg border px-3 py-1 text-xs font-medium transition ${
                            v.paga
                              ? "border-slate-300 text-slate-600 hover:bg-slate-50"
                              : "border-emerald-300 bg-emerald-600 text-white hover:bg-emerald-700"
                          }`}
                        >
                          {v.paga ? "Marcar como aberta" : "Marcar como paga"}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <p className="mt-2 text-xs text-slate-400">
        A comissão é calculada como percentual do frete bruto (definido no cadastro do
        motorista). Marque cada viagem como paga quando repassar a comissão.
      </p>
    </main>
  );
}
