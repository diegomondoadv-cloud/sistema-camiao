import type { Metadata } from "next";
import Link from "next/link";
import { exigirGestor } from "@/infrastructure/auth/sessao";
import { prisma } from "@/infrastructure/prisma";

export const metadata: Metadata = {
  title: "Veículos · Sistema Transportadora",
};

export default async function VeiculosPage() {
  await exigirGestor();
  const [cavalos, carretas] = await Promise.all([
    prisma.cavalo.count(),
    prisma.carreta.count(),
  ]);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Veículos</h1>
        <Link href="/" className="text-sm text-emerald-700 hover:underline">
          ← Voltar ao início
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/veiculos/cavalos"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-emerald-300 hover:shadow"
        >
          <div className="text-3xl">🚛</div>
          <h2 className="mt-2 text-lg font-semibold text-slate-800">Cavalos</h2>
          <p className="text-sm text-slate-500">Caminhões (unidades tratoras)</p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{cavalos}</p>
        </Link>

        <Link
          href="/veiculos/carretas"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-emerald-300 hover:shadow"
        >
          <div className="text-3xl">🚚</div>
          <h2 className="mt-2 text-lg font-semibold text-slate-800">Carretas</h2>
          <p className="text-sm text-slate-500">Reboques (sider, etc.)</p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{carretas}</p>
        </Link>
      </div>
    </main>
  );
}
