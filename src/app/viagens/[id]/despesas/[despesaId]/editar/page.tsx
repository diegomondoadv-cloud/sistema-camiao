import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirGestor } from "@/infrastructure/auth/sessao";
import { prisma } from "@/infrastructure/prisma";
import { dataParaInput } from "@/shared/parse";
import { Campo, inputClass } from "@/components/campo";
import { CATEGORIAS_DESPESA, ROTULO_CATEGORIA } from "@/domain/despesas/validacao";
import { editarDespesa } from "../../../despesas-actions";

export const metadata: Metadata = {
  title: "Editar despesa · Sistema Transportadora",
};

function numeroInput(n: number): string {
  return String(n).replace(".", ",");
}

export default async function EditarDespesaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; despesaId: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  await exigirGestor();
  const { id, despesaId } = await params;
  const { erro } = await searchParams;

  const [despesa, fornecedores] = await Promise.all([
    prisma.despesa.findFirst({ where: { id: despesaId, viagemId: id } }),
    prisma.fornecedor.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
  ]);
  if (!despesa) notFound();

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Editar despesa</h1>
        <Link href={`/viagens/${id}`} className="text-sm text-emerald-700 hover:underline">
          ← Voltar à viagem
        </Link>
      </div>

      {despesa.abastecimentoId ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
          <p className="mb-3">
            Esta despesa é de um <strong>abastecimento</strong>. Para manter o
            cálculo correto (litros × R$/L), edite pela abastecida.
          </p>
          <Link
            href={`/abastecimentos/${despesa.abastecimentoId}/editar`}
            className="inline-block rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-700"
          >
            Editar a abastecida →
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {erro === "despesa-invalida" && (
            <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              Verifique os dados da despesa.
            </p>
          )}
          <form action={editarDespesa} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <input type="hidden" name="viagemId" value={id} />
            <input type="hidden" name="despesaId" value={despesa.id} />

            <Campo id="data" label="Data">
              <input id="data" name="data" type="date" defaultValue={dataParaInput(despesa.data)} className={inputClass} />
            </Campo>
            <Campo id="categoria" label="Categoria *">
              <select id="categoria" name="categoria" required defaultValue={despesa.categoria} className={inputClass}>
                {CATEGORIAS_DESPESA.map((c) => (
                  <option key={c} value={c}>{ROTULO_CATEGORIA[c] ?? c}</option>
                ))}
              </select>
            </Campo>
            <Campo id="valor" label="Valor (R$) *">
              <input id="valor" name="valor" inputMode="decimal" required defaultValue={numeroInput(Number(despesa.valor))} className={inputClass} />
            </Campo>
            <Campo id="estabelecimento" label="Estabelecimento">
              <input id="estabelecimento" name="estabelecimento" defaultValue={despesa.estabelecimento ?? ""} className={inputClass} />
            </Campo>
            <Campo id="formaPagamento" label="Forma de pagamento">
              <input id="formaPagamento" name="formaPagamento" defaultValue={despesa.formaPagamento ?? ""} className={inputClass} />
            </Campo>
            <Campo id="fornecedorId" label="Fornecedor">
              <select id="fornecedorId" name="fornecedorId" defaultValue={despesa.fornecedorId ?? ""} className={inputClass}>
                <option value="">— nenhum —</option>
                {fornecedores.map((f) => (
                  <option key={f.id} value={f.id}>{f.nome}</option>
                ))}
              </select>
            </Campo>
            <div className="sm:col-span-2 lg:col-span-3">
              <Campo id="descricao" label="Descrição">
                <input id="descricao" name="descricao" defaultValue={despesa.descricao ?? ""} className={inputClass} />
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
                href={`/viagens/${id}`}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancelar
              </Link>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
