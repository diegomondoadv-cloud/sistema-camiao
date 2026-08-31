import type { Metadata } from "next";
import Link from "next/link";
import { exigirGestor } from "@/infrastructure/auth/sessao";
import { prisma } from "@/infrastructure/prisma";
import { formatarNumero } from "@/shared/formato";
import { Campo, inputClass } from "@/components/campo";
import { criarCavalo } from "./actions";

export const metadata: Metadata = {
  title: "Cavalos · Sistema Transportadora",
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
  criado: { texto: "Cavalo cadastrado com sucesso.", tipo: "ok" },
  editado: { texto: "Cavalo atualizado.", tipo: "ok" },
  "placa-existe": { texto: "Já existe um veículo com essa placa.", tipo: "erro" },
  "dados-invalidos": {
    texto: "Verifique os dados: a placa é obrigatória (mínimo 5 caracteres).",
    tipo: "erro",
  },
  "nao-encontrado": { texto: "Cavalo não encontrado.", tipo: "erro" },
};

export default async function CavalosPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  await exigirGestor();
  const { ok, erro } = await searchParams;
  const aviso = mensagens[ok ?? ""] ?? mensagens[erro ?? ""];

  const cavalos = await prisma.cavalo.findMany({
    orderBy: { placa: "asc" },
    select: {
      id: true,
      placa: true,
      marca: true,
      modelo: true,
      ano: true,
      kmAtual: true,
      situacao: true,
    },
  });

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Cavalos (caminhões)</h1>
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
              <th className="px-4 py-3 font-medium">Marca / Modelo</th>
              <th className="px-4 py-3 font-medium">Ano</th>
              <th className="px-4 py-3 font-medium">KM atual</th>
              <th className="px-4 py-3 font-medium">Situação</th>
              <th className="px-4 py-3 font-medium">Ação</th>
            </tr>
          </thead>
          <tbody>
            {cavalos.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  Nenhum cavalo cadastrado ainda.
                </td>
              </tr>
            )}
            {cavalos.map((c) => (
              <tr key={c.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-semibold text-slate-800">{c.placa}</td>
                <td className="px-4 py-3 text-slate-600">
                  {[c.marca, c.modelo].filter(Boolean).join(" ") || "—"}
                </td>
                <td className="px-4 py-3 text-slate-600">{c.ano ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">
                  {c.kmAtual != null ? formatarNumero(c.kmAtual, 0) : "—"}
                </td>
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
                  <div className="flex gap-2">
                    <Link
                      href={`/veiculos/cavalos/${c.id}/ficha`}
                      className="rounded-lg bg-slate-800 px-3 py-1 text-xs font-medium text-white transition hover:bg-slate-900"
                    >
                      Ficha
                    </Link>
                    <Link
                      href={`/veiculos/cavalos/${c.id}`}
                      className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      Editar
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cadastrar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">
          Cadastrar novo cavalo
        </h2>
        <form action={criarCavalo} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Campo id="placa" label="Placa *">
            <input id="placa" name="placa" required placeholder="ABC1D23" className={inputClass} />
          </Campo>
          <Campo id="situacao" label="Situação *">
            <select id="situacao" name="situacao" required defaultValue="ativo" className={inputClass}>
              <option value="ativo">Ativo</option>
              <option value="manutencao">Em manutenção</option>
              <option value="inativo">Inativo</option>
              <option value="vendido">Vendido</option>
            </select>
          </Campo>
          <Campo id="marca" label="Marca">
            <input id="marca" name="marca" placeholder="Scania" className={inputClass} />
          </Campo>
          <Campo id="modelo" label="Modelo">
            <input id="modelo" name="modelo" placeholder="R450" className={inputClass} />
          </Campo>
          <Campo id="ano" label="Ano">
            <input id="ano" name="ano" inputMode="numeric" placeholder="2020" className={inputClass} />
          </Campo>
          <Campo id="kmAtual" label="KM atual">
            <input id="kmAtual" name="kmAtual" inputMode="numeric" placeholder="480000" className={inputClass} />
          </Campo>
          <Campo id="mediaConsumoEsperada" label="Consumo esperado (km/l)" dica="Ex.: 2,5">
            <input id="mediaConsumoEsperada" name="mediaConsumoEsperada" inputMode="decimal" placeholder="2,5" className={inputClass} />
          </Campo>
          <Campo id="capacidade" label="Capacidade">
            <input id="capacidade" name="capacidade" placeholder="ex.: 30t" className={inputClass} />
          </Campo>
          <Campo id="valorParcela" label="Valor da parcela (R$)" dica="Financiamento. Ex.: 8.500,00">
            <input id="valorParcela" name="valorParcela" inputMode="decimal" placeholder="8.500,00" className={inputClass} />
          </Campo>
          <Campo id="vencimentoParcela" label="Dia de vencimento" dica="Dia do mês (1 a 31)">
            <input id="vencimentoParcela" name="vencimentoParcela" inputMode="numeric" placeholder="10" className={inputClass} />
          </Campo>
          <Campo id="seguro" label="Seguro">
            <input id="seguro" name="seguro" placeholder="Seguradora / apólice" className={inputClass} />
          </Campo>
          <Campo id="rastreador" label="Rastreador">
            <input id="rastreador" name="rastreador" placeholder="Empresa / nº" className={inputClass} />
          </Campo>
          <div className="sm:col-span-2 lg:col-span-3">
            <Campo id="observacoes" label="Observações">
              <textarea id="observacoes" name="observacoes" rows={2} className={inputClass} />
            </Campo>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <button
              type="submit"
              className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-700"
            >
              Cadastrar cavalo
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
