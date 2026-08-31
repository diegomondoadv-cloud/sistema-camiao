import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirGestor } from "@/infrastructure/auth/sessao";
import { prisma } from "@/infrastructure/prisma";
import { dataParaInput } from "@/shared/parse";
import { Campo, inputClass } from "@/components/campo";
import {
  CATEGORIAS_CONTA_PAGAR,
  ROTULO_CATEGORIA_PAGAR,
} from "@/domain/contas-pagar/validacao";
import { editarContaPagar } from "../../actions";

export const metadata: Metadata = {
  title: "Editar conta a pagar · Sistema Transportadora",
};

function numeroInput(n: number | null | undefined): string {
  if (n == null) return "";
  return String(n).replace(".", ",");
}

const mensagens: Record<string, string> = {
  "dados-invalidos": "Verifique os dados: descrição e valor são obrigatórios.",
  "nao-encontrada": "Conta não encontrada.",
};

export default async function EditarContaPagarPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  await exigirGestor();
  const { id } = await params;
  const { erro } = await searchParams;

  const [conta, fornecedores, cavalos] = await Promise.all([
    prisma.contaPagar.findUnique({ where: { id } }),
    prisma.fornecedor.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    prisma.cavalo.findMany({ orderBy: { placa: "asc" }, select: { id: true, placa: true } }),
  ]);

  if (!conta) notFound();

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Editar conta a pagar</h1>
        <Link href="/contas-pagar" className="text-sm text-emerald-700 hover:underline">
          ← Voltar às contas a pagar
        </Link>
      </div>

      {erro && mensagens[erro] && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {mensagens[erro]}
        </p>
      )}

      {conta.origem === "custo_fixo" && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Esta conta foi gerada de um custo fixo. Você pode ajustá-la aqui, mas a
          fonte continua sendo o custo fixo cadastrado.
        </p>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <form action={editarContaPagar} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <input type="hidden" name="id" value={conta.id} />

          <div className="sm:col-span-2 lg:col-span-3">
            <Campo id="descricao" label="Descrição *">
              <input id="descricao" name="descricao" required defaultValue={conta.descricao} className={inputClass} />
            </Campo>
          </div>
          <Campo id="categoria" label="Categoria">
            <select id="categoria" name="categoria" defaultValue={conta.categoria ?? ""} className={inputClass}>
              <option value="">— sem categoria —</option>
              {CATEGORIAS_CONTA_PAGAR.map((c) => (
                <option key={c} value={c}>{ROTULO_CATEGORIA_PAGAR[c] ?? c}</option>
              ))}
            </select>
          </Campo>
          <Campo id="valor" label="Valor (R$) *">
            <input id="valor" name="valor" inputMode="decimal" required defaultValue={numeroInput(Number(conta.valor))} className={inputClass} />
          </Campo>
          <Campo id="dataVencimento" label="Vencimento">
            <input id="dataVencimento" name="dataVencimento" type="date" defaultValue={conta.dataVencimento ? dataParaInput(conta.dataVencimento) : ""} className={inputClass} />
          </Campo>
          <Campo id="fornecedorId" label="Fornecedor">
            <select id="fornecedorId" name="fornecedorId" defaultValue={conta.fornecedorId ?? ""} className={inputClass}>
              <option value="">— nenhum —</option>
              {fornecedores.map((f) => (
                <option key={f.id} value={f.id}>{f.nome}</option>
              ))}
            </select>
          </Campo>
          <Campo id="cavaloId" label="Veículo (opcional)">
            <select id="cavaloId" name="cavaloId" defaultValue={conta.cavaloId ?? ""} className={inputClass}>
              <option value="">— nenhum —</option>
              {cavalos.map((c) => (
                <option key={c.id} value={c.id}>{c.placa}</option>
              ))}
            </select>
          </Campo>
          <Campo id="formaPagamento" label="Forma de pagamento">
            <input id="formaPagamento" name="formaPagamento" defaultValue={conta.formaPagamento ?? ""} className={inputClass} />
          </Campo>
          <div className="sm:col-span-2 lg:col-span-3">
            <Campo id="observacoes" label="Observações">
              <input id="observacoes" name="observacoes" defaultValue={conta.observacoes ?? ""} className={inputClass} />
            </Campo>
          </div>
          <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-3">
            <button
              type="submit"
              className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-700"
            >
              Salvar alterações
            </button>
            <Link
              href="/contas-pagar"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
