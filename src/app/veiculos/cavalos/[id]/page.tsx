import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { exigirGestor } from "@/infrastructure/auth/sessao";
import { prisma } from "@/infrastructure/prisma";
import { Campo, inputClass } from "@/components/campo";
import { editarCavalo } from "../actions";

export const metadata: Metadata = {
  title: "Editar cavalo · Sistema Transportadora",
};

const mensagens: Record<string, { texto: string; tipo: "ok" | "erro" }> = {
  editado: { texto: "Cavalo atualizado com sucesso.", tipo: "ok" },
  "placa-existe": { texto: "Já existe um veículo com essa placa.", tipo: "erro" },
  "dados-invalidos": { texto: "Verifique os dados informados.", tipo: "erro" },
};

function txt(v: unknown): string {
  return v == null ? "" : String(v);
}

export default async function EditarCavaloPage({
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

  const c = await prisma.cavalo.findUnique({ where: { id } });
  if (!c) redirect("/veiculos/cavalos?erro=nao-encontrado");

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">
          Editar cavalo · {c.placa}
        </h1>
        <Link
          href="/veiculos/cavalos"
          className="text-sm text-emerald-700 hover:underline"
        >
          ← Voltar aos cavalos
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
        <form
          action={editarCavalo}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
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
          <Campo id="marca" label="Marca">
            <input id="marca" name="marca" defaultValue={txt(c.marca)} className={inputClass} />
          </Campo>
          <Campo id="modelo" label="Modelo">
            <input id="modelo" name="modelo" defaultValue={txt(c.modelo)} className={inputClass} />
          </Campo>
          <Campo id="ano" label="Ano">
            <input id="ano" name="ano" inputMode="numeric" defaultValue={txt(c.ano)} className={inputClass} />
          </Campo>
          <Campo id="kmAtual" label="KM atual">
            <input id="kmAtual" name="kmAtual" inputMode="numeric" defaultValue={txt(c.kmAtual)} className={inputClass} />
          </Campo>
          <Campo id="mediaConsumoEsperada" label="Consumo esperado (km/l)" dica="Ex.: 2,5">
            <input id="mediaConsumoEsperada" name="mediaConsumoEsperada" inputMode="decimal" defaultValue={txt(c.mediaConsumoEsperada)} className={inputClass} />
          </Campo>
          <Campo id="capacidade" label="Capacidade">
            <input id="capacidade" name="capacidade" defaultValue={txt(c.capacidade)} className={inputClass} />
          </Campo>
          <Campo id="valorParcela" label="Valor da parcela (R$)" dica="Ex.: 8.500,00">
            <input id="valorParcela" name="valorParcela" inputMode="decimal" defaultValue={txt(c.valorParcela)} className={inputClass} />
          </Campo>
          <Campo id="vencimentoParcela" label="Dia de vencimento" dica="1 a 31">
            <input id="vencimentoParcela" name="vencimentoParcela" inputMode="numeric" defaultValue={txt(c.vencimentoParcela)} className={inputClass} />
          </Campo>
          <Campo id="seguro" label="Seguro">
            <input id="seguro" name="seguro" defaultValue={txt(c.seguro)} className={inputClass} />
          </Campo>
          <Campo id="rastreador" label="Rastreador">
            <input id="rastreador" name="rastreador" defaultValue={txt(c.rastreador)} className={inputClass} />
          </Campo>
          <div className="sm:col-span-2 lg:col-span-3">
            <Campo id="observacoes" label="Observações">
              <textarea id="observacoes" name="observacoes" rows={2} defaultValue={txt(c.observacoes)} className={inputClass} />
            </Campo>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
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
