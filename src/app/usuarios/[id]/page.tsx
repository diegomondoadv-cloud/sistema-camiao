import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { exigirAdmin } from "@/infrastructure/auth/sessao";
import { prisma } from "@/infrastructure/prisma";
import { editarUsuario, redefinirSenha } from "../actions";

export const metadata: Metadata = {
  title: "Editar usuário · Sistema Transportadora",
};

const rotuloPapel: Record<string, string> = {
  admin: "Administrador",
  gestor: "Gestor",
  motorista: "Motorista",
};

const mensagens: Record<string, { texto: string; tipo: "ok" | "erro" }> = {
  editado: { texto: "Dados atualizados com sucesso.", tipo: "ok" },
  "editado-nome": {
    texto: "Nome atualizado. (O papel da sua própria conta não é alterável.)",
    tipo: "ok",
  },
  "senha-redefinida": { texto: "Senha redefinida com sucesso.", tipo: "ok" },
  "dados-invalidos": { texto: "Verifique os dados informados.", tipo: "erro" },
  "senha-curta": {
    texto: "A senha deve ter ao menos 8 caracteres.",
    tipo: "erro",
  },
};

const inputClass =
  "rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200";

export default async function EditarUsuarioPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const admin = await exigirAdmin();
  const { id } = await params;
  const { ok, erro } = await searchParams;
  const aviso = mensagens[ok ?? ""] ?? mensagens[erro ?? ""];

  const usuario = await prisma.usuario.findUnique({
    where: { id },
    select: { id: true, nome: true, email: true, papel: true, ativo: true },
  });
  if (!usuario) redirect("/usuarios?erro=nao-encontrado");

  const ehEuMesmo = usuario.id === admin.id;

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Editar usuário</h1>
        <Link href="/usuarios" className="text-sm text-emerald-700 hover:underline">
          ← Voltar aos usuários
        </Link>
      </div>

      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">E-mail</p>
        <p className="font-medium text-slate-800">{usuario.email}</p>
        <p className="mt-2 text-sm text-slate-500">
          Papel atual: {rotuloPapel[usuario.papel] ?? usuario.papel} ·{" "}
          {usuario.ativo ? "Ativo" : "Inativo"}
          {ehEuMesmo && (
            <span className="ml-1 text-slate-400">(sua conta)</span>
          )}
        </p>
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

      {/* Editar dados */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Dados</h2>
        <form action={editarUsuario} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={usuario.id} />
          <div className="flex flex-col gap-1">
            <label htmlFor="nome" className="text-sm font-medium text-slate-700">
              Nome
            </label>
            <input
              id="nome"
              name="nome"
              type="text"
              required
              defaultValue={usuario.nome}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="papel" className="text-sm font-medium text-slate-700">
              Papel
            </label>
            {ehEuMesmo ? (
              <>
                <input
                  type="text"
                  disabled
                  value="Administrador"
                  className={`${inputClass} bg-slate-50 text-slate-400`}
                />
                <span className="text-xs text-slate-400">
                  O papel da sua própria conta não pode ser alterado (proteção
                  contra auto-bloqueio).
                </span>
              </>
            ) : (
              <select
                id="papel"
                name="papel"
                required
                defaultValue={usuario.papel}
                className={inputClass}
              >
                <option value="gestor">Gestor</option>
                <option value="motorista">Motorista</option>
              </select>
            )}
          </div>
          <div>
            <button
              type="submit"
              className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-700"
            >
              Salvar dados
            </button>
          </div>
        </form>
      </div>

      {/* Redefinir senha */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">
          Redefinir senha
        </h2>
        <form action={redefinirSenha} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={usuario.id} />
          <div className="flex flex-col gap-1">
            <label htmlFor="senha" className="text-sm font-medium text-slate-700">
              Nova senha
            </label>
            <input
              id="senha"
              name="senha"
              type="text"
              required
              minLength={8}
              className={inputClass}
            />
            <span className="text-xs text-slate-400">
              Mínimo 8 caracteres. Anote e passe ao usuário.
            </span>
          </div>
          <div>
            <button
              type="submit"
              className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Redefinir senha
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
