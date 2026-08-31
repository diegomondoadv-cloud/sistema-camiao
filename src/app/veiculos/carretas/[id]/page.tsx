import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { exigirGestor } from "@/infrastructure/auth/sessao";
import { prisma } from "@/infrastructure/prisma";
import { Campo, inputClass } from "@/components/campo";
import { editarCarreta } from "../actions";

export const metadata: Metadata = {
  title: "Editar carreta · Sistema Transportadora",
};

const mensagens: Record<string, { texto: string; tipo: "ok" | "erro" }> = {
  editado: { texto: "Carreta atualizada com sucesso.", tipo: "ok" },
  "placa-existe": { texto: "Já existe um veículo com essa placa.", tipo: "erro" },
  "dados-invalidos": { texto: "Verifique os dados informados.", tipo: "erro" },
};

function txt(v: unknown): string {
  return v == null ? "" : String(v);
}

export default async function EditarCarretaPage({
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

  const c = await prisma.carreta.findUnique({ where: { id } });
  if (!c) redirect("/veiculos/carretas?erro=nao-encontrado");

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">
          Editar carreta · {c.placa}
        </h1>
        <Link
          href="/veiculos/carretas"
          className="text-sm text-emerald-700 hover:underline"
        >
          ← Voltar às carretas
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
        <form action={editarCarreta} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={c.id} />
          <Campo id="placa" label="Placa *">
            <input id="placa" name="placa" required defaultValue={c.placa} className={inputClass} />
          </Campo>
          <Campo id="situacao" label="Situação *">
            <select id="situacao" name="situacao" required defaultValue={c.situacao} className={inputClass}>
              <option value="ativo">Ativo</option>
              <option value="manutencao">Em manutenção</option>
              <option value="inativo">Inativo</option>
              <option value="vendido">Vendido</option>
            </select>
          </Campo>
          <Campo id="tipoCarroceria" label="Tipo de carroceria">
            <input id="tipoCarroceria" name="tipoCarroceria" defaultValue={txt(c.tipoCarroceria)} className={inputClass} />
          </Campo>
          <Campo id="numeroEixos" label="Número de eixos">
            <input id="numeroEixos" name="numeroEixos" inputMode="numeric" defaultValue={txt(c.numeroEixos)} className={inputClass} />
          </Campo>
          <div className="sm:col-span-2">
            <Campo id="observacoes" label="Observações">
              <textarea id="observacoes" name="observacoes" rows={2} defaultValue={txt(c.observacoes)} className={inputClass} />
            </Campo>
          </div>
          <div className="sm:col-span-2">
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
