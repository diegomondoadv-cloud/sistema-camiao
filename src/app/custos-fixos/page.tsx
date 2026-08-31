import type { Metadata } from "next";
import Link from "next/link";
import { exigirGestor } from "@/infrastructure/auth/sessao";
import { prisma } from "@/infrastructure/prisma";
import { reaisParaCentavos, formatarBRL } from "@/shared/dinheiro";
import { formatarData } from "@/shared/formato";
import {
  ROTULO_CATEGORIA_CUSTO,
  ROTULO_PERIODICIDADE,
  custoMensalizado,
} from "@/domain/custos-fixos/validacao";
import { CustoFixoForm } from "./custo-form";
import { criarCustoFixo } from "./actions";

export const metadata: Metadata = {
  title: "Custos fixos · Sistema Transportadora",
};

const mensagens: Record<string, { texto: string; tipo: "ok" | "erro" }> = {
  criado: { texto: "Custo fixo cadastrado.", tipo: "ok" },
  editado: { texto: "Custo fixo atualizado.", tipo: "ok" },
  removido: { texto: "Custo fixo removido.", tipo: "ok" },
  "dados-invalidos": {
    texto: "Verifique os dados: valor e (para custo por veículo) o veículo são obrigatórios.",
    tipo: "erro",
  },
  "nao-encontrado": { texto: "Custo fixo não encontrado.", tipo: "erro" },
};

export default async function CustosFixosPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  await exigirGestor();
  const { ok, erro } = await searchParams;
  const aviso = mensagens[ok ?? ""] ?? mensagens[erro ?? ""];

  const [custos, cavalos] = await Promise.all([
    prisma.custoFixo.findMany({
      orderBy: [{ escopo: "asc" }, { categoria: "asc" }],
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

  const totalMensalC = custos.reduce(
    (s, c) => s + custoMensalizado(reaisParaCentavos(Number(c.valor)), c.periodicidade),
    0,
  );

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Custos fixos</h1>
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

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs text-slate-500">Total mensalizado (mensal + anual/12)</p>
        <p className="text-lg font-bold text-slate-800">{formatarBRL(totalMensalC)}</p>
        <p className="mt-1 text-xs text-slate-400">
          Custos únicos não entram no mensalizado. O rateio por caminhão é aplicado
          no painel mensal.
        </p>
      </div>

      {/* Lista */}
      <div className="mb-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Categoria</th>
              <th className="px-4 py-3 font-medium">Escopo</th>
              <th className="px-4 py-3 font-medium">Valor</th>
              <th className="px-4 py-3 font-medium">Periodicidade</th>
              <th className="px-4 py-3 font-medium">Mensalizado</th>
              <th className="px-4 py-3 font-medium">Vigência</th>
              <th className="px-4 py-3 font-medium">Ação</th>
            </tr>
          </thead>
          <tbody>
            {custos.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                  Nenhum custo fixo cadastrado ainda.
                </td>
              </tr>
            )}
            {custos.map((c) => (
              <tr key={c.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-medium text-slate-800">
                  {ROTULO_CATEGORIA_CUSTO[c.categoria] ?? c.categoria}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {c.escopo === "veiculo"
                    ? `Veículo ${c.cavalo?.placa ?? "—"}`
                    : "Empresa"}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {formatarBRL(reaisParaCentavos(Number(c.valor)))}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {ROTULO_PERIODICIDADE[c.periodicidade] ?? c.periodicidade}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {formatarBRL(
                    custoMensalizado(reaisParaCentavos(Number(c.valor)), c.periodicidade),
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {c.vigenciaInicio || c.vigenciaFim
                    ? `${formatarData(c.vigenciaInicio)} → ${formatarData(c.vigenciaFim)}`
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/custos-fixos/${c.id}`}
                    className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cadastrar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">
          Cadastrar novo custo fixo
        </h2>
        <CustoFixoForm
          action={criarCustoFixo}
          cavalos={opcoesCavalo}
          submitLabel="Cadastrar custo fixo"
        />
      </div>
    </main>
  );
}
