import type { Metadata } from "next";
import Link from "next/link";
import { exigirGestor } from "@/infrastructure/auth/sessao";
import { prisma } from "@/infrastructure/prisma";
import { reaisParaCentavos, formatarBRL } from "@/shared/dinheiro";
import { formatarNumero } from "@/shared/formato";
import {
  ROTULO_SITUACAO_PNEU,
  COR_SITUACAO_PNEU,
  custoPorKmPneu,
} from "@/domain/pneus/validacao";
import { PneuForm } from "./pneu-form";
import { criarPneu } from "./actions";

export const metadata: Metadata = {
  title: "Pneus · Sistema Transportadora",
};

const mensagens: Record<string, { texto: string; tipo: "ok" | "erro" }> = {
  criado: { texto: "Pneu cadastrado.", tipo: "ok" },
  editado: { texto: "Pneu atualizado.", tipo: "ok" },
  "dados-invalidos": { texto: "Verifique os dados: o número de identificação é obrigatório.", tipo: "erro" },
  "numero-existe": { texto: "Já existe um pneu com esse número de identificação.", tipo: "erro" },
  "nao-encontrado": { texto: "Pneu não encontrado.", tipo: "erro" },
};

export default async function PneusPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  await exigirGestor();
  const { ok, erro } = await searchParams;
  const aviso = mensagens[ok ?? ""] ?? mensagens[erro ?? ""];

  const [pneus, cavalos] = await Promise.all([
    prisma.pneu.findMany({
      orderBy: [{ situacao: "asc" }, { numeroIdentificacao: "asc" }],
      include: { cavalo: { select: { placa: true } } },
    }),
    prisma.cavalo.findMany({
      orderBy: { placa: "asc" },
      select: { id: true, placa: true, marca: true, modelo: true },
    }),
  ]);

  const opcoesCavalo = cavalos.map((c) => ({
    id: c.id,
    rotulo: [c.placa, c.marca, c.modelo].filter(Boolean).join(" "),
  }));

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Pneus</h1>
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

      <div className="mb-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Nº / Marca</th>
              <th className="px-4 py-3 font-medium">Medida</th>
              <th className="px-4 py-3 font-medium">Veículo / Posição</th>
              <th className="px-4 py-3 font-medium">Valor</th>
              <th className="px-4 py-3 font-medium">Km rodados</th>
              <th className="px-4 py-3 font-medium">Custo/km</th>
              <th className="px-4 py-3 font-medium">Situação</th>
              <th className="px-4 py-3 font-medium">Ação</th>
            </tr>
          </thead>
          <tbody>
            {pneus.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                  Nenhum pneu cadastrado ainda.
                </td>
              </tr>
            )}
            {pneus.map((p) => {
              const valor = p.valor != null ? Number(p.valor) : null;
              const rodados =
                p.kmInstalacao != null && p.kmAtual != null && p.kmAtual > p.kmInstalacao
                  ? p.kmAtual - p.kmInstalacao
                  : null;
              const custoKm = custoPorKmPneu(valor, p.kmInstalacao, p.kmAtual);
              return (
                <tr key={p.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    <span className="font-semibold text-slate-800">{p.numeroIdentificacao}</span>
                    <span className="block text-xs text-slate-400">{p.marca ?? "—"}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.medida ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {p.cavalo?.placa ?? "estoque"}
                    {p.posicao && <span className="block text-xs text-slate-400">{p.posicao}</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {valor != null ? formatarBRL(reaisParaCentavos(valor)) : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {rodados != null ? formatarNumero(rodados, 0) : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {custoKm != null ? formatarBRL(reaisParaCentavos(custoKm)) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${COR_SITUACAO_PNEU[p.situacao] ?? "bg-slate-100 text-slate-500"}`}>
                      {ROTULO_SITUACAO_PNEU[p.situacao] ?? p.situacao}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/pneus/${p.id}`} className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50">
                      Editar
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Cadastrar novo pneu</h2>
        <PneuForm action={criarPneu} cavalos={opcoesCavalo} submitLabel="Cadastrar pneu" />
      </div>
    </main>
  );
}
