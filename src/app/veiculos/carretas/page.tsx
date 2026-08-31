import type { Metadata } from "next";
import Link from "next/link";
import { exigirGestor } from "@/infrastructure/auth/sessao";
import { prisma } from "@/infrastructure/prisma";
import { Campo, inputClass } from "@/components/campo";
import { criarCarreta } from "./actions";

export const metadata: Metadata = {
  title: "Carretas · Sistema Transportadora",
};

const rotuloSituacao: Record<string, string> = {
  ativo: "Ativo",
  manutencao: "Em manutenção",
  inativo: "Inativo",
  vendido: "Vendido",
};

const corSituacao: Record<string, string> = {
  ativo: "bg-emerald-50 text-emerald-700",
  manutencao: "bg-amber-50 text-amber-700",
  inativo: "bg-slate-100 text-slate-500",
  vendido: "bg-slate-100 text-slate-500",
};

const mensagens: Record<string, { texto: string; tipo: "ok" | "erro" }> = {
  criado: { texto: "Carreta cadastrada com sucesso.", tipo: "ok" },
  editado: { texto: "Carreta atualizada.", tipo: "ok" },
  "placa-existe": { texto: "Já existe um veículo com essa placa.", tipo: "erro" },
  "dados-invalidos": {
    texto: "Verifique os dados: a placa é obrigatória (mínimo 5 caracteres).",
    tipo: "erro",
  },
  "nao-encontrado": { texto: "Carreta não encontrada.", tipo: "erro" },
};

export default async function CarretasPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  await exigirGestor();
  const { ok, erro } = await searchParams;
  const aviso = mensagens[ok ?? ""] ?? mensagens[erro ?? ""];

  const carretas = await prisma.carreta.findMany({
    orderBy: { placa: "asc" },
    select: {
      id: true,
      placa: true,
      tipoCarroceria: true,
      numeroEixos: true,
      situacao: true,
    },
  });

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Carretas (reboques)</h1>
        <Link href="/veiculos" className="text-sm text-emerald-700 hover:underline">
          ← Voltar a Veículos
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
              <th className="px-4 py-3 font-medium">Placa</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Eixos</th>
              <th className="px-4 py-3 font-medium">Situação</th>
              <th className="px-4 py-3 font-medium">Ação</th>
            </tr>
          </thead>
          <tbody>
            {carretas.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Nenhuma carreta cadastrada ainda.
                </td>
              </tr>
            )}
            {carretas.map((c) => (
              <tr key={c.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-semibold text-slate-800">{c.placa}</td>
                <td className="px-4 py-3 text-slate-600">{c.tipoCarroceria ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{c.numeroEixos ?? "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      corSituacao[c.situacao] ?? "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {rotuloSituacao[c.situacao] ?? c.situacao}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/veiculos/carretas/${c.id}`}
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
          Cadastrar nova carreta
        </h2>
        <form action={criarCarreta} className="grid gap-4 sm:grid-cols-2">
          <Campo id="placa" label="Placa *">
            <input id="placa" name="placa" required placeholder="XYZ4E56" className={inputClass} />
          </Campo>
          <Campo id="situacao" label="Situação *">
            <select id="situacao" name="situacao" required defaultValue="ativo" className={inputClass}>
              <option value="ativo">Ativo</option>
              <option value="manutencao">Em manutenção</option>
              <option value="inativo">Inativo</option>
              <option value="vendido">Vendido</option>
            </select>
          </Campo>
          <Campo id="tipoCarroceria" label="Tipo de carroceria">
            <input id="tipoCarroceria" name="tipoCarroceria" placeholder="Sider" className={inputClass} />
          </Campo>
          <Campo id="numeroEixos" label="Número de eixos">
            <input id="numeroEixos" name="numeroEixos" inputMode="numeric" placeholder="3" className={inputClass} />
          </Campo>
          <div className="sm:col-span-2">
            <Campo id="observacoes" label="Observações">
              <textarea id="observacoes" name="observacoes" rows={2} className={inputClass} />
            </Campo>
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-700"
            >
              Cadastrar carreta
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
