import type { Metadata } from "next";
import Link from "next/link";
import { exigirGestor } from "@/infrastructure/auth/sessao";
import { prisma } from "@/infrastructure/prisma";
import { Campo, inputClass } from "@/components/campo";
import { criarCliente } from "./actions";

export const metadata: Metadata = {
  title: "Clientes · Sistema Transportadora",
};

const rotuloTipo: Record<string, string> = {
  cliente: "Cliente",
  transportadora: "Transportadora",
};

const corTipo: Record<string, string> = {
  cliente: "bg-emerald-50 text-emerald-700",
  transportadora: "bg-sky-50 text-sky-700",
};

const mensagens: Record<string, { texto: string; tipo: "ok" | "erro" }> = {
  criado: { texto: "Cliente cadastrado com sucesso.", tipo: "ok" },
  editado: { texto: "Cliente atualizado.", tipo: "ok" },
  "dados-invalidos": {
    texto: "Verifique os dados: a razão social/nome é obrigatória.",
    tipo: "erro",
  },
  "nao-encontrado": { texto: "Cliente não encontrado.", tipo: "erro" },
};

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  await exigirGestor();
  const { ok, erro } = await searchParams;
  const aviso = mensagens[ok ?? ""] ?? mensagens[erro ?? ""];

  const clientes = await prisma.cliente.findMany({
    orderBy: { razaoSocial: "asc" },
    select: {
      id: true,
      tipo: true,
      razaoSocial: true,
      cnpjCpf: true,
      telefone: true,
      prazoMedioPagamento: true,
    },
  });

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">
          Clientes e Transportadoras
        </h1>
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

      {/* Lista */}
      <div className="mb-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Razão social / Nome</th>
              <th className="px-4 py-3 font-medium">CNPJ / CPF</th>
              <th className="px-4 py-3 font-medium">Telefone</th>
              <th className="px-4 py-3 font-medium">Prazo (dias)</th>
              <th className="px-4 py-3 font-medium">Ação</th>
            </tr>
          </thead>
          <tbody>
            {clientes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  Nenhum cliente cadastrado ainda.
                </td>
              </tr>
            )}
            {clientes.map((c) => (
              <tr key={c.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      corTipo[c.tipo] ?? "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {rotuloTipo[c.tipo] ?? c.tipo}
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold text-slate-800">
                  {c.razaoSocial}
                </td>
                <td className="px-4 py-3 text-slate-600">{c.cnpjCpf ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{c.telefone ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">
                  {c.prazoMedioPagamento != null ? c.prazoMedioPagamento : "—"}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/clientes/${c.id}`}
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
          Cadastrar novo cliente
        </h2>
        <form action={criarCliente} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Campo id="tipo" label="Tipo *">
            <select id="tipo" name="tipo" required defaultValue="cliente" className={inputClass}>
              <option value="cliente">Cliente</option>
              <option value="transportadora">Transportadora</option>
            </select>
          </Campo>
          <Campo id="razaoSocial" label="Razão social / Nome *">
            <input id="razaoSocial" name="razaoSocial" required placeholder="Transportes Silva Ltda" className={inputClass} />
          </Campo>
          <Campo id="cnpjCpf" label="CNPJ / CPF">
            <input id="cnpjCpf" name="cnpjCpf" placeholder="12.345.678/0001-90" className={inputClass} />
          </Campo>
          <Campo id="telefone" label="Telefone">
            <input id="telefone" name="telefone" placeholder="(11) 3333-4444" className={inputClass} />
          </Campo>
          <Campo id="responsavel" label="Responsável (contato)">
            <input id="responsavel" name="responsavel" placeholder="Maria (financeiro)" className={inputClass} />
          </Campo>
          <Campo id="prazoMedioPagamento" label="Prazo de pagamento (dias)" dica="Ex.: 30">
            <input id="prazoMedioPagamento" name="prazoMedioPagamento" inputMode="numeric" placeholder="30" className={inputClass} />
          </Campo>
          <div className="sm:col-span-2 lg:col-span-3">
            <Campo id="dadosBancarios" label="Dados bancários">
              <input id="dadosBancarios" name="dadosBancarios" placeholder="Banco / agência / conta / PIX" className={inputClass} />
            </Campo>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <Campo id="observacoes" label="Observações">
              <textarea id="observacoes" name="observacoes" rows={2} className={inputClass} />
            </Campo>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <button
              type="submit"
              className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-700"
            >
              Cadastrar cliente
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
