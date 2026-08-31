import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { exigirGestor } from "@/infrastructure/auth/sessao";
import { prisma } from "@/infrastructure/prisma";
import { Campo, inputClass } from "@/components/campo";
import {
  CATEGORIAS_FORNECEDOR,
  ROTULO_CATEGORIA_FORNECEDOR,
} from "@/domain/fornecedores/validacao";
import { editarFornecedor } from "../actions";

export const metadata: Metadata = {
  title: "Editar fornecedor · Sistema Transportadora",
};

const mensagens: Record<string, { texto: string; tipo: "ok" | "erro" }> = {
  editado: { texto: "Fornecedor atualizado.", tipo: "ok" },
  "dados-invalidos": { texto: "Verifique os dados: o nome é obrigatório.", tipo: "erro" },
};

export default async function EditarFornecedorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  await exigirGestor();
  const { id } = await params;
  const { ok, erro } = await searchParams;
  const aviso = mensagens[ok ?? ""] ?? mensagens[erro ?? ""];

  const f = await prisma.fornecedor.findUnique({ where: { id } });
  if (!f) redirect("/fornecedores?erro=nao-encontrado");

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Editar fornecedor</h1>
        <Link href="/fornecedores" className="text-sm text-emerald-700 hover:underline">
          ← Voltar aos fornecedores
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

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <form action={editarFornecedor} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={f.id} />
          <Campo id="nome" label="Nome *">
            <input id="nome" name="nome" required defaultValue={f.nome} className={inputClass} />
          </Campo>
          <Campo id="categoria" label="Categoria">
            <select id="categoria" name="categoria" defaultValue={f.categoria ?? ""} className={inputClass}>
              <option value="">— nenhuma —</option>
              {CATEGORIAS_FORNECEDOR.map((k) => (
                <option key={k} value={k}>{ROTULO_CATEGORIA_FORNECEDOR[k]}</option>
              ))}
            </select>
          </Campo>
          <Campo id="cnpjCpf" label="CNPJ / CPF">
            <input id="cnpjCpf" name="cnpjCpf" defaultValue={f.cnpjCpf ?? ""} className={inputClass} />
          </Campo>
          <Campo id="telefone" label="Telefone">
            <input id="telefone" name="telefone" defaultValue={f.telefone ?? ""} className={inputClass} />
          </Campo>
          <Campo id="cidade" label="Cidade">
            <input id="cidade" name="cidade" defaultValue={f.cidade ?? ""} className={inputClass} />
          </Campo>
          <div className="sm:col-span-2">
            <Campo id="observacoes" label="Observações">
              <input id="observacoes" name="observacoes" defaultValue={f.observacoes ?? ""} className={inputClass} />
            </Campo>
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-700"
            >
              Salvar alterações
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
