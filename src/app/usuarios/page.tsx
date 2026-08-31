import type { Metadata } from "next";
import Link from "next/link";
import { exigirAdmin } from "@/infrastructure/auth/sessao";
import { prisma } from "@/infrastructure/prisma";
import { criarUsuario, alternarAtivo } from "./actions";

export const metadata: Metadata = {
  title: "Usuários · Sistema Transportadora",
};

const rotuloPapel: Record<string, string> = {
  admin: "Administrador",
  gestor: "Gestor",
  motorista: "Motorista",
};

const mensagens: Record<string, { texto: string; tipo: "ok" | "erro" }> = {
  criado: { texto: "Usuário criado com sucesso.", tipo: "ok" },
  ativado: { texto: "Usuário ativado.", tipo: "ok" },
  desativado: { texto: "Usuário desativado.", tipo: "ok" },
  "email-existe": { texto: "Já existe um usuário com esse e-mail.", tipo: "erro" },
  "dados-invalidos": {
    texto: "Verifique os dados: nome, e-mail válido e senha com no mínimo 8 caracteres.",
    tipo: "erro",
  },
  "auto-bloqueio": {
    texto: "Você não pode desativar a sua própria conta.",
    tipo: "erro",
  },
  "nao-encontrado": { texto: "Usuário não encontrado.", tipo: "erro" },
};

const inputClass =
  "rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200";

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const admin = await exigirAdmin();
  const { ok, erro } = await searchParams;
  const aviso = mensagens[ok ?? ""] ?? mensagens[erro ?? ""];

  const usuarios = await prisma.usuario.findMany({
    orderBy: { criadoEm: "asc" },
    select: { id: true, nome: true, email: true, papel: true, ativo: true },
  });

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Usuários</h1>
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

      {/* Lista de usuários */}
      <div className="mb-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">E-mail</th>
              <th className="px-4 py-3 font-medium">Papel</th>
              <th className="px-4 py-3 font-medium">Situação</th>
              <th className="px-4 py-3 font-medium">Ação</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => {
              const euMesmo = u.id === admin.id;
              return (
                <tr key={u.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 text-slate-800">
                    {u.nome}
                    {euMesmo && (
                      <span className="ml-2 text-xs text-slate-400">(você)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {rotuloPapel[u.papel] ?? u.papel}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.ativo
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {u.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/usuarios/${u.id}`}
                        className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        Editar
                      </Link>
                      {!euMesmo && (
                        <form action={alternarAtivo}>
                          <input type="hidden" name="id" value={u.id} />
                          <button
                            type="submit"
                            className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            {u.ativo ? "Desativar" : "Ativar"}
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Criar novo usuário */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">
          Criar novo usuário
        </h2>
        <form action={criarUsuario} className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="nome" className="text-sm font-medium text-slate-700">
              Nome
            </label>
            <input id="nome" name="nome" type="text" required className={inputClass} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm font-medium text-slate-700">
              E-mail
            </label>
            <input id="email" name="email" type="email" required className={inputClass} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="papel" className="text-sm font-medium text-slate-700">
              Papel
            </label>
            <select id="papel" name="papel" required className={inputClass} defaultValue="gestor">
              <option value="gestor">Gestor</option>
              <option value="motorista">Motorista</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="senha" className="text-sm font-medium text-slate-700">
              Senha inicial
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
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-700"
            >
              Criar usuário
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
