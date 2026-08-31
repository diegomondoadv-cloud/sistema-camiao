import type { Metadata } from "next";
import Link from "next/link";
import { exigirGestor } from "@/infrastructure/auth/sessao";
import { prisma } from "@/infrastructure/prisma";
import { reaisParaCentavos, formatarBRL, aplicarPercentual } from "@/shared/dinheiro";
import { calcularSaldoAReceber } from "@/domain/financeiro/calculos";
import { ROTULO_STATUS, COR_STATUS } from "@/domain/viagens/validacao";
import { criarViagem } from "./actions";
import { carregarOpcoes } from "./opcoes";
import { ViagemForm } from "./viagem-form";

export const metadata: Metadata = {
  title: "Viagens · Sistema Transportadora",
};

const mensagens: Record<string, { texto: string; tipo: "ok" | "erro" }> = {
  criada: { texto: "Viagem cadastrada com sucesso.", tipo: "ok" },
  editada: { texto: "Viagem atualizada.", tipo: "ok" },
  "dados-invalidos": {
    texto: "Verifique os dados: selecione o caminhão e um status válido.",
    tipo: "erro",
  },
  "nao-encontrada": { texto: "Viagem não encontrada.", tipo: "erro" },
};

export default async function ViagensPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  await exigirGestor();
  const { ok, erro } = await searchParams;
  const aviso = mensagens[ok ?? ""] ?? mensagens[erro ?? ""];

  const [viagens, opcoes] = await Promise.all([
    prisma.viagem.findMany({
      orderBy: { criadoEm: "desc" },
      select: {
        id: true,
        origem: true,
        destino: true,
        status: true,
        valorBrutoFrete: true,
        adiantamento: true,
        percentualImposto: true,
        cavalo: { select: { placa: true } },
        motorista: { select: { nome: true } },
        cliente: { select: { razaoSocial: true } },
        recebimentos: { select: { valor: true } },
      },
    }),
    carregarOpcoes(),
  ]);

  const semCadastros = opcoes.cavalos.length === 0;

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Viagens / Fretes</h1>
        <Link href="/" className="text-sm text-emerald-700 hover:underline">
          ← Voltar ao início
        </Link>
      </div>

      {aviso && (
        <p
          role="alert"
          className={`mb-4 rounded-lg px-3 py-2 text-sm ${
            aviso.tipo === "ok"
              ? "bg-emerald-50 text-emerald-800"
              : "bg-red-50 text-red-700"
          }`}
        >
          {aviso.texto}
        </p>
      )}

      {semCadastros && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Para cadastrar uma viagem, primeiro cadastre ao menos um{" "}
          <Link href="/veiculos/cavalos" className="font-semibold underline">
            caminhão
          </Link>
          .
        </p>
      )}

      {/* Lista */}
      <div className="mb-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Rota</th>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Caminhão</th>
              <th className="px-4 py-3 font-medium">Motorista</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Frete</th>
              <th className="px-4 py-3 font-medium">Saldo</th>
              <th className="px-4 py-3 font-medium">Ação</th>
            </tr>
          </thead>
          <tbody>
            {viagens.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                  Nenhuma viagem cadastrada ainda.
                </td>
              </tr>
            )}
            {viagens.map((v) => {
              const bruto = reaisParaCentavos(Number(v.valorBrutoFrete));
              const adiant = reaisParaCentavos(Number(v.adiantamento));
              const impostoC = aplicarPercentual(bruto, Number(v.percentualImposto ?? 0));
              const recs = v.recebimentos.map((r) => reaisParaCentavos(Number(r.valor)));
              const saldo = calcularSaldoAReceber(bruto, adiant, recs, impostoC);
              return (
                <tr key={v.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {[v.origem, v.destino].filter(Boolean).join(" → ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {v.cliente?.razaoSocial ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{v.cavalo.placa}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {v.motorista?.nome ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        COR_STATUS[v.status] ?? "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {ROTULO_STATUS[v.status] ?? v.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatarBRL(bruto)}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">
                    {formatarBRL(saldo)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/viagens/${v.id}`}
                      className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      Abrir
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Cadastrar */}
      {!semCadastros && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">
            Cadastrar nova viagem
          </h2>
          <ViagemForm action={criarViagem} opcoes={opcoes} submitLabel="Cadastrar viagem" />
        </div>
      )}
    </main>
  );
}
