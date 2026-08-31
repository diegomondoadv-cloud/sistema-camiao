import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirGestor } from "@/infrastructure/auth/sessao";
import { prisma } from "@/infrastructure/prisma";
import { dataParaInput } from "@/shared/parse";
import { Campo, inputClass } from "@/components/campo";
import { editarManutencao } from "../../actions";

export const metadata: Metadata = {
  title: "Editar manutenção · Sistema Transportadora",
};

/** Número em pt-BR para o input (ponto → vírgula), sem separador de milhar. */
function numeroInput(n: number | null | undefined): string {
  if (n == null) return "";
  return String(n).replace(".", ",");
}

const mensagens: Record<string, string> = {
  "dados-invalidos": "Verifique os dados: veículo e valor (ou peças/mão de obra) são obrigatórios.",
  "veiculo-invalido": "Veículo não encontrado.",
};

export default async function EditarManutencaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  await exigirGestor();
  const { id } = await params;
  const { erro } = await searchParams;

  const [m, cavalos] = await Promise.all([
    prisma.manutencao.findUnique({ where: { id } }),
    prisma.cavalo.findMany({
      orderBy: { placa: "asc" },
      select: { id: true, placa: true, marca: true, modelo: true },
    }),
  ]);

  if (!m) notFound();

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Editar manutenção</h1>
        <Link href="/manutencoes" className="text-sm text-emerald-700 hover:underline">
          ← Voltar às manutenções
        </Link>
      </div>

      {erro && mensagens[erro] && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {mensagens[erro]}
        </p>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <form action={editarManutencao} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <input type="hidden" name="id" value={m.id} />

          <Campo id="cavaloId" label="Veículo *">
            <select id="cavaloId" name="cavaloId" required defaultValue={m.cavaloId} className={inputClass}>
              {cavalos.map((c) => (
                <option key={c.id} value={c.id}>
                  {[c.placa, c.marca, c.modelo].filter(Boolean).join(" ")}
                </option>
              ))}
            </select>
          </Campo>
          <Campo id="data" label="Data">
            <input id="data" name="data" type="date" defaultValue={dataParaInput(m.data)} className={inputClass} />
          </Campo>
          <Campo id="km" label="Quilometragem" dica="Hodômetro na manutenção">
            <input id="km" name="km" inputMode="numeric" defaultValue={m.km ?? ""} className={inputClass} />
          </Campo>
          <Campo id="oficina" label="Oficina">
            <input id="oficina" name="oficina" defaultValue={m.oficina ?? ""} className={inputClass} />
          </Campo>
          <Campo id="tipoServico" label="Tipo de serviço">
            <input id="tipoServico" name="tipoServico" defaultValue={m.tipoServico ?? ""} className={inputClass} />
          </Campo>
          <Campo id="pecas" label="Peças (R$)">
            <input id="pecas" name="pecas" inputMode="decimal" defaultValue={numeroInput(m.pecas == null ? null : Number(m.pecas))} className={inputClass} />
          </Campo>
          <Campo id="maoDeObra" label="Mão de obra (R$)">
            <input id="maoDeObra" name="maoDeObra" inputMode="decimal" defaultValue={numeroInput(m.maoDeObra == null ? null : Number(m.maoDeObra))} className={inputClass} />
          </Campo>
          <Campo id="valor" label="Valor total (R$)" dica="Se vazio, soma peças + mão de obra">
            <input id="valor" name="valor" inputMode="decimal" defaultValue={numeroInput(Number(m.valor))} className={inputClass} />
          </Campo>
          <Campo id="proximaData" label="Próxima manutenção (data)">
            <input id="proximaData" name="proximaData" type="date" defaultValue={m.proximaData ? dataParaInput(m.proximaData) : ""} className={inputClass} />
          </Campo>
          <Campo id="proximoKm" label="Próxima manutenção (km)">
            <input id="proximoKm" name="proximoKm" inputMode="numeric" defaultValue={m.proximoKm ?? ""} className={inputClass} />
          </Campo>
          <div className="sm:col-span-2 lg:col-span-3">
            <Campo id="observacoes" label="Observações">
              <input id="observacoes" name="observacoes" defaultValue={m.observacoes ?? ""} className={inputClass} />
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
              href="/manutencoes"
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
