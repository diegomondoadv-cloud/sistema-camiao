import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirGestor } from "@/infrastructure/auth/sessao";
import { prisma } from "@/infrastructure/prisma";
import { dataParaInput } from "@/shared/parse";
import { Campo, inputClass } from "@/components/campo";
import { editarVale } from "../../actions";

export const metadata: Metadata = {
  title: "Editar vale · Sistema Transportadora",
};

function numeroInput(n: number): string {
  return String(n).replace(".", ",");
}

const mensagens: Record<string, string> = {
  "dados-invalidos": "Verifique os dados: motorista e valor são obrigatórios.",
};

export default async function EditarValePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  await exigirGestor();
  const { id } = await params;
  const { erro } = await searchParams;

  const [vale, motoristas] = await Promise.all([
    prisma.valeMotorista.findUnique({ where: { id } }),
    prisma.motorista.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
  ]);
  if (!vale) notFound();

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Editar vale</h1>
        <Link href="/vales" className="text-sm text-emerald-700 hover:underline">
          ← Voltar aos vales
        </Link>
      </div>

      {erro && mensagens[erro] && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {mensagens[erro]}
        </p>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <form action={editarVale} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <input type="hidden" name="id" value={vale.id} />

          <Campo id="motoristaId" label="Motorista *">
            <select id="motoristaId" name="motoristaId" required defaultValue={vale.motoristaId} className={inputClass}>
              {motoristas.map((m) => (
                <option key={m.id} value={m.id}>{m.nome}</option>
              ))}
            </select>
          </Campo>
          <Campo id="valor" label="Valor (R$) *">
            <input id="valor" name="valor" inputMode="decimal" required defaultValue={numeroInput(Number(vale.valor))} className={inputClass} />
          </Campo>
          <Campo id="data" label="Data do vale">
            <input id="data" name="data" type="date" defaultValue={dataParaInput(vale.data)} className={inputClass} />
          </Campo>
          <Campo id="dataVencimento" label="Vencimento (opcional)">
            <input id="dataVencimento" name="dataVencimento" type="date" defaultValue={vale.dataVencimento ? dataParaInput(vale.dataVencimento) : ""} className={inputClass} />
          </Campo>
          <div className="sm:col-span-2 lg:col-span-3">
            <Campo id="observacoes" label="Observação">
              <input id="observacoes" name="observacoes" defaultValue={vale.observacoes ?? ""} className={inputClass} />
            </Campo>
          </div>
          <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-3">
            <button
              type="submit"
              className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-700"
            >
              Salvar alterações
            </button>
            <Link href="/vales" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
