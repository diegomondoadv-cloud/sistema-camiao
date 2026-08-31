import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirGestor } from "@/infrastructure/auth/sessao";
import { prisma } from "@/infrastructure/prisma";
import { dataParaInput } from "@/shared/parse";
import { Campo, inputClass } from "@/components/campo";
import { editarAbastecimento } from "../../actions";

export const metadata: Metadata = {
  title: "Editar abastecimento · Sistema Transportadora",
};

/** Número em pt-BR para o input (ponto → vírgula), sem separador de milhar. */
function numeroInput(n: number): string {
  return String(n).replace(".", ",");
}

function rotaViagem(v: { origem: string | null; destino: string | null }) {
  return [v.origem, v.destino].filter(Boolean).join(" → ");
}

const mensagens: Record<string, string> = {
  "dados-invalidos": "Verifique os dados: veículo, litros e valor por litro são obrigatórios.",
  "veiculo-invalido": "Veículo não encontrado.",
};

export default async function EditarAbastecimentoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  await exigirGestor();
  const { id } = await params;
  const { erro } = await searchParams;

  const [abastecimento, cavalos, viagens] = await Promise.all([
    prisma.abastecimento.findUnique({
      where: { id },
      include: { despesa: { select: { id: true } } },
    }),
    prisma.cavalo.findMany({
      orderBy: { placa: "asc" },
      select: { id: true, placa: true, marca: true, modelo: true },
    }),
    prisma.viagem.findMany({
      orderBy: { dataCarregamento: "desc" },
      take: 100,
      select: { id: true, origem: true, destino: true },
    }),
  ]);

  if (!abastecimento) notFound();

  const a = abastecimento;

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Editar abastecimento</h1>
        <Link href="/abastecimentos" className="text-sm text-emerald-700 hover:underline">
          ← Voltar aos abastecimentos
        </Link>
      </div>

      {erro && mensagens[erro] && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {mensagens[erro]}
        </p>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <form action={editarAbastecimento} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <input type="hidden" name="id" value={a.id} />

          <Campo id="cavaloId" label="Veículo *">
            <select id="cavaloId" name="cavaloId" required defaultValue={a.cavaloId} className={inputClass}>
              {cavalos.map((c) => (
                <option key={c.id} value={c.id}>
                  {[c.placa, c.marca, c.modelo].filter(Boolean).join(" ")}
                </option>
              ))}
            </select>
          </Campo>

          <Campo id="viagemId" label="Viagem (opcional)">
            <select id="viagemId" name="viagemId" defaultValue={a.viagemId ?? ""} className={inputClass}>
              <option value="">— sem viagem —</option>
              {viagens.map((v) => (
                <option key={v.id} value={v.id}>
                  {rotaViagem(v) || `Viagem ${v.id.slice(0, 6)}`}
                </option>
              ))}
            </select>
          </Campo>

          <Campo id="data" label="Data">
            <input id="data" name="data" type="date" defaultValue={dataParaInput(a.data)} className={inputClass} />
          </Campo>

          <Campo id="km" label="Quilometragem" dica="Hodômetro no momento">
            <input id="km" name="km" inputMode="numeric" defaultValue={a.km ?? ""} className={inputClass} />
          </Campo>

          <Campo id="litros" label="Litros *" dica="Ex.: 250,5">
            <input id="litros" name="litros" inputMode="decimal" required defaultValue={numeroInput(Number(a.litros))} className={inputClass} />
          </Campo>

          <Campo id="valorLitro" label="Valor por litro (R$) *" dica="Ex.: 6,29">
            <input id="valorLitro" name="valorLitro" inputMode="decimal" required defaultValue={numeroInput(Number(a.valorLitro))} className={inputClass} />
          </Campo>

          <Campo id="posto" label="Posto">
            <input id="posto" name="posto" defaultValue={a.posto ?? ""} className={inputClass} />
          </Campo>

          <Campo id="cidade" label="Cidade">
            <input id="cidade" name="cidade" defaultValue={a.cidade ?? ""} className={inputClass} />
          </Campo>

          <Campo id="tipoCombustivel" label="Tipo de combustível">
            <input id="tipoCombustivel" name="tipoCombustivel" defaultValue={a.tipoCombustivel ?? ""} className={inputClass} />
          </Campo>

          <div className="flex items-center gap-2 pt-6">
            <input
              id="tanqueCheio"
              name="tanqueCheio"
              type="checkbox"
              value="true"
              defaultChecked={a.tanqueCheio}
              className="h-4 w-4 rounded border-slate-300"
            />
            <label htmlFor="tanqueCheio" className="text-sm font-medium text-slate-700">
              Tanque cheio (necessário para calcular consumo)
            </label>
          </div>

          <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-3">
            <button
              type="submit"
              className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-700"
            >
              Salvar alterações
            </button>
            <Link
              href="/abastecimentos"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancelar
            </Link>
          </div>
        </form>

        {a.despesa && (
          <p className="mt-4 text-xs text-slate-400">
            Este abastecimento foi lançado pela viagem — ao salvar, o custo da
            despesa de combustível da viagem é atualizado junto.
          </p>
        )}
      </div>
    </main>
  );
}
