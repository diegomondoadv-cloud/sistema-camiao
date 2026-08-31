import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { exigirGestor } from "@/infrastructure/auth/sessao";
import { prisma } from "@/infrastructure/prisma";
import { Campo, inputClass } from "@/components/campo";
import { editarCliente } from "../actions";

export const metadata: Metadata = {
  title: "Editar cliente · Sistema Transportadora",
};

const mensagens: Record<string, { texto: string; tipo: "ok" | "erro" }> = {
  editado: { texto: "Cliente atualizado com sucesso.", tipo: "ok" },
  "dados-invalidos": { texto: "Verifique os dados informados.", tipo: "erro" },
};

function txt(v: unknown): string {
  return v == null ? "" : String(v);
}

export default async function EditarClientePage({
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

  const c = await prisma.cliente.findUnique({ where: { id } });
  if (!c) redirect("/clientes?erro=nao-encontrado");

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">
          Editar · {c.razaoSocial}
        </h1>
        <Link href="/clientes" className="text-sm text-emerald-700 hover:underline">
          ← Voltar aos clientes
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

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <form action={editarCliente} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <input type="hidden" name="id" value={c.id} />
          <Campo id="tipo" label="Tipo *">
            <select id="tipo" name="tipo" required defaultValue={c.tipo} className={inputClass}>
              <option value="cliente">Cliente</option>
              <option value="transportadora">Transportadora</option>
            </select>
          </Campo>
          <Campo id="razaoSocial" label="Razão social / Nome *">
            <input id="razaoSocial" name="razaoSocial" required defaultValue={c.razaoSocial} className={inputClass} />
          </Campo>
          <Campo id="cnpjCpf" label="CNPJ / CPF">
            <input id="cnpjCpf" name="cnpjCpf" defaultValue={txt(c.cnpjCpf)} className={inputClass} />
          </Campo>
          <Campo id="telefone" label="Telefone">
            <input id="telefone" name="telefone" defaultValue={txt(c.telefone)} className={inputClass} />
          </Campo>
          <Campo id="responsavel" label="Responsável (contato)">
            <input id="responsavel" name="responsavel" defaultValue={txt(c.responsavel)} className={inputClass} />
          </Campo>
          <Campo id="prazoMedioPagamento" label="Prazo de pagamento (dias)" dica="Ex.: 30">
            <input id="prazoMedioPagamento" name="prazoMedioPagamento" inputMode="numeric" defaultValue={txt(c.prazoMedioPagamento)} className={inputClass} />
          </Campo>
          <div className="sm:col-span-2 lg:col-span-3">
            <Campo id="dadosBancarios" label="Dados bancários">
              <input id="dadosBancarios" name="dadosBancarios" defaultValue={txt(c.dadosBancarios)} className={inputClass} />
            </Campo>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <Campo id="observacoes" label="Observações">
              <textarea id="observacoes" name="observacoes" rows={2} defaultValue={txt(c.observacoes)} className={inputClass} />
            </Campo>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
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
