import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { exigirGestor } from "@/infrastructure/auth/sessao";
import { prisma } from "@/infrastructure/prisma";
import { PneuForm } from "../pneu-form";
import { editarPneu } from "../actions";

export const metadata: Metadata = {
  title: "Editar pneu · Sistema Transportadora",
};

const mensagens: Record<string, { texto: string; tipo: "ok" | "erro" }> = {
  editado: { texto: "Pneu atualizado.", tipo: "ok" },
  "dados-invalidos": { texto: "Verifique os dados informados.", tipo: "erro" },
  "numero-existe": { texto: "Já existe um pneu com esse número.", tipo: "erro" },
};

export default async function EditarPneuPage({
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

  const [pneu, cavalos] = await Promise.all([
    prisma.pneu.findUnique({ where: { id } }),
    prisma.cavalo.findMany({
      orderBy: { placa: "asc" },
      select: { id: true, placa: true, marca: true, modelo: true },
    }),
  ]);
  if (!pneu) redirect("/pneus?erro=nao-encontrado");

  const opcoesCavalo = cavalos.map((c) => ({
    id: c.id,
    rotulo: [c.placa, c.marca, c.modelo].filter(Boolean).join(" "),
  }));

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Editar pneu</h1>
        <Link href="/pneus" className="text-sm text-emerald-700 hover:underline">
          ← Voltar aos pneus
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
        <PneuForm
          action={editarPneu}
          cavalos={opcoesCavalo}
          pneu={{
            id: pneu.id,
            numeroIdentificacao: pneu.numeroIdentificacao,
            marca: pneu.marca,
            modelo: pneu.modelo,
            medida: pneu.medida,
            dataCompra: pneu.dataCompra,
            valor: pneu.valor != null ? Number(pneu.valor) : "",
            cavaloId: pneu.cavaloId,
            posicao: pneu.posicao,
            kmInstalacao: pneu.kmInstalacao,
            kmAtual: pneu.kmAtual,
            situacao: pneu.situacao,
          }}
          submitLabel="Salvar alterações"
        />
      </div>
    </main>
  );
}
