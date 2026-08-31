import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { exigirGestor } from "@/infrastructure/auth/sessao";
import { prisma } from "@/infrastructure/prisma";
import { CustoFixoForm } from "../custo-form";
import { editarCustoFixo, removerCustoFixo } from "../actions";

export const metadata: Metadata = {
  title: "Editar custo fixo · Sistema Transportadora",
};

const mensagens: Record<string, { texto: string; tipo: "ok" | "erro" }> = {
  editado: { texto: "Custo fixo atualizado.", tipo: "ok" },
  "dados-invalidos": {
    texto: "Verifique os dados informados.",
    tipo: "erro",
  },
};

export default async function EditarCustoFixoPage({
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

  const [custo, cavalos] = await Promise.all([
    prisma.custoFixo.findUnique({ where: { id } }),
    prisma.cavalo.findMany({
      orderBy: { placa: "asc" },
      select: { id: true, placa: true, marca: true, modelo: true },
    }),
  ]);
  if (!custo) redirect("/custos-fixos?erro=nao-encontrado");

  const opcoesCavalo = cavalos.map((c) => ({
    id: c.id,
    rotulo: [c.placa, c.marca, c.modelo].filter(Boolean).join(" "),
  }));

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Editar custo fixo</h1>
        <Link href="/custos-fixos" className="text-sm text-emerald-700 hover:underline">
          ← Voltar aos custos fixos
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

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <CustoFixoForm
          action={editarCustoFixo}
          cavalos={opcoesCavalo}
          custo={{
            id: custo.id,
            escopo: custo.escopo,
            cavaloId: custo.cavaloId,
            categoria: custo.categoria,
            valor: Number(custo.valor),
            periodicidade: custo.periodicidade,
            vigenciaInicio: custo.vigenciaInicio,
            vigenciaFim: custo.vigenciaFim,
          }}
          submitLabel="Salvar alterações"
        />
      </div>

      <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
        <form action={removerCustoFixo}>
          <input type="hidden" name="id" value={custo.id} />
          <button
            type="submit"
            className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100"
          >
            Remover este custo fixo
          </button>
        </form>
      </div>
    </main>
  );
}
