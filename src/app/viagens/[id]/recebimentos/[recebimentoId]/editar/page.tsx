import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirGestor } from "@/infrastructure/auth/sessao";
import { prisma } from "@/infrastructure/prisma";
import { dataParaInput } from "@/shared/parse";
import { Campo, inputClass } from "@/components/campo";
import { editarRecebimento } from "../../../recebimentos-actions";

export const metadata: Metadata = {
  title: "Editar recebimento · Sistema Transportadora",
};

function numeroInput(n: number): string {
  return String(n).replace(".", ",");
}

export default async function EditarRecebimentoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; recebimentoId: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  await exigirGestor();
  const { id, recebimentoId } = await params;
  const { erro } = await searchParams;

  const recebimento = await prisma.recebimento.findFirst({
    where: { id: recebimentoId, viagemId: id },
  });
  if (!recebimento) notFound();

  return (
    <main className="mx-auto max-w-xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Editar recebimento</h1>
        <Link href={`/viagens/${id}`} className="text-sm text-emerald-700 hover:underline">
          ← Voltar à viagem
        </Link>
      </div>

      {erro === "recebimento-invalido" && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Verifique o recebimento: o valor é obrigatório.
        </p>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <form action={editarRecebimento} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="viagemId" value={id} />
          <input type="hidden" name="recebimentoId" value={recebimento.id} />

          <Campo id="valor" label="Valor recebido (R$) *">
            <input id="valor" name="valor" inputMode="decimal" required defaultValue={numeroInput(Number(recebimento.valor))} className={inputClass} />
          </Campo>
          <Campo id="data" label="Data do recebimento">
            <input id="data" name="data" type="date" defaultValue={dataParaInput(recebimento.dataEfetiva)} className={inputClass} />
          </Campo>
          <div className="sm:col-span-2">
            <Campo id="formaPagamento" label="Forma de pagamento">
              <input id="formaPagamento" name="formaPagamento" defaultValue={recebimento.formaPagamento ?? ""} className={inputClass} />
            </Campo>
          </div>
          <div className="flex items-center gap-3 sm:col-span-2">
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
    </main>
  );
}
