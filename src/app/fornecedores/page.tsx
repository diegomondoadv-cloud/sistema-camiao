import type { Metadata } from "next";
import Link from "next/link";
import { exigirGestor } from "@/infrastructure/auth/sessao";
import { prisma } from "@/infrastructure/prisma";
import { reaisParaCentavos, formatarBRL } from "@/shared/dinheiro";
import { Campo, inputClass } from "@/components/campo";
import {
  CATEGORIAS_FORNECEDOR,
  ROTULO_CATEGORIA_FORNECEDOR,
} from "@/domain/fornecedores/validacao";
import { criarFornecedor, alternarAtivoFornecedor } from "./actions";

export const metadata: Metadata = {
  title: "Fornecedores · Sistema Transportadora",
};

const mensagens: Record<string, { texto: string; tipo: "ok" | "erro" }> = {
  criado: { texto: "Fornecedor cadastrado.", tipo: "ok" },
  editado: { texto: "Fornecedor atualizado.", tipo: "ok" },
  atualizado: { texto: "Fornecedor atualizado.", tipo: "ok" },
  "dados-invalidos": { texto: "Verifique os dados: o nome é obrigatório.", tipo: "erro" },
  "nao-encontrado": { texto: "Fornecedor não encontrado.", tipo: "erro" },
};

export default async function FornecedoresPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  await exigirGestor();
  const { ok, erro } = await searchParams;
  const aviso = mensagens[ok ?? ""] ?? mensagens[erro ?? ""];

  const [fornecedores, gastos] = await Promise.all([
    prisma.fornecedor.findMany({ orderBy: { nome: "asc" } }),
    prisma.despesa.groupBy({
      by: ["fornecedorId"],
      where: { fornecedorId: { not: null } },
      _sum: { valor: true },
      _count: { _all: true },
    }),
  ]);

  const gastoPorId = new Map<string, { totalC: number; n: number }>();
  for (const g of gastos) {
    if (g.fornecedorId) {
      gastoPorId.set(g.fornecedorId, {
        totalC: reaisParaCentavos(Number(g._sum.valor ?? 0)),
        n: g._count._all,
      });
    }
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Fornecedores</h1>
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

      {/* Lista */}
      <div className="mb-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Fornecedor</th>
              <th className="px-4 py-3 font-medium">Categoria</th>
              <th className="px-4 py-3 font-medium">Cidade</th>
              <th className="px-4 py-3 font-medium">Despesas</th>
              <th className="px-4 py-3 font-medium">Total gasto</th>
              <th className="px-4 py-3 font-medium">Situação</th>
              <th className="px-4 py-3 font-medium">Ação</th>
            </tr>
          </thead>
          <tbody>
            {fornecedores.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                  Nenhum fornecedor cadastrado ainda.
                </td>
              </tr>
            )}
            {fornecedores.map((f) => {
              const g = gastoPorId.get(f.id);
              return (
                <tr key={f.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-semibold text-slate-800">{f.nome}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {f.categoria ? (ROTULO_CATEGORIA_FORNECEDOR[f.categoria] ?? f.categoria) : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{f.cidade ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{g?.n ?? 0}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {formatarBRL(g?.totalC ?? 0)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        f.ativo ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {f.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link
                        href={`/fornecedores/${f.id}`}
                        className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        Editar
                      </Link>
                      <form action={alternarAtivoFornecedor}>
                        <input type="hidden" name="id" value={f.id} />
                        <button
                          type="submit"
                          className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                        >
                          {f.ativo ? "Desativar" : "Ativar"}
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Cadastrar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">
          Cadastrar novo fornecedor
        </h2>
        <form action={criarFornecedor} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Campo id="nome" label="Nome *">
            <input id="nome" name="nome" required placeholder="Posto Rota Araranguá" className={inputClass} />
          </Campo>
          <Campo id="categoria" label="Categoria">
            <select id="categoria" name="categoria" defaultValue="" className={inputClass}>
              <option value="">— nenhuma —</option>
              {CATEGORIAS_FORNECEDOR.map((k) => (
                <option key={k} value={k}>{ROTULO_CATEGORIA_FORNECEDOR[k]}</option>
              ))}
            </select>
          </Campo>
          <Campo id="cnpjCpf" label="CNPJ / CPF">
            <input id="cnpjCpf" name="cnpjCpf" placeholder="12.345.678/0001-90" className={inputClass} />
          </Campo>
          <Campo id="telefone" label="Telefone">
            <input id="telefone" name="telefone" placeholder="(48) 3333-4444" className={inputClass} />
          </Campo>
          <Campo id="cidade" label="Cidade">
            <input id="cidade" name="cidade" placeholder="Araranguá/SC" className={inputClass} />
          </Campo>
          <div className="sm:col-span-2 lg:col-span-3">
            <Campo id="observacoes" label="Observações">
              <input id="observacoes" name="observacoes" className={inputClass} />
            </Campo>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <button
              type="submit"
              className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-700"
            >
              Cadastrar fornecedor
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
