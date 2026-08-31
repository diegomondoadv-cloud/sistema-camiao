import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { exigirGestor } from "@/infrastructure/auth/sessao";
import { prisma } from "@/infrastructure/prisma";
import { dataParaInput } from "@/shared/parse";
import { Campo, inputClass } from "@/components/campo";
import { editarMotorista } from "../actions";

export const metadata: Metadata = {
  title: "Editar motorista · Sistema Transportadora",
};

const mensagens: Record<string, { texto: string; tipo: "ok" | "erro" }> = {
  editado: { texto: "Motorista atualizado com sucesso.", tipo: "ok" },
  "dados-invalidos": { texto: "Verifique os dados informados.", tipo: "erro" },
};

function txt(v: unknown): string {
  return v == null ? "" : String(v);
}

export default async function EditarMotoristaPage({
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

  const m = await prisma.motorista.findUnique({ where: { id } });
  if (!m) redirect("/motoristas?erro=nao-encontrado");

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">
          Editar motorista · {m.nome}
        </h1>
        <Link href="/motoristas" className="text-sm text-emerald-700 hover:underline">
          ← Voltar aos motoristas
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
        <form action={editarMotorista} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <input type="hidden" name="id" value={m.id} />
          <Campo id="nome" label="Nome *">
            <input id="nome" name="nome" required defaultValue={m.nome} className={inputClass} />
          </Campo>
          <Campo id="telefone" label="Telefone">
            <input id="telefone" name="telefone" defaultValue={txt(m.telefone)} className={inputClass} />
          </Campo>
          <Campo id="cpf" label="CPF">
            <input id="cpf" name="cpf" defaultValue={txt(m.cpf)} className={inputClass} />
          </Campo>
          <Campo id="cnh" label="CNH (número)">
            <input id="cnh" name="cnh" defaultValue={txt(m.cnh)} className={inputClass} />
          </Campo>
          <Campo id="categoriaCnh" label="Categoria CNH">
            <input id="categoriaCnh" name="categoriaCnh" defaultValue={txt(m.categoriaCnh)} className={inputClass} />
          </Campo>
          <Campo id="vencCnh" label="Vencimento da CNH">
            <input id="vencCnh" name="vencCnh" type="date" defaultValue={dataParaInput(m.vencCnh)} className={inputClass} />
          </Campo>
          <Campo id="vencToxicologico" label="Vencimento do toxicológico">
            <input id="vencToxicologico" name="vencToxicologico" type="date" defaultValue={dataParaInput(m.vencToxicologico)} className={inputClass} />
          </Campo>
          <Campo id="formaRemuneracao" label="Forma de remuneração">
            <select id="formaRemuneracao" name="formaRemuneracao" defaultValue={m.formaRemuneracao} className={inputClass}>
              <option value="salario">Salário</option>
              <option value="comissao">Comissão</option>
              <option value="misto">Misto</option>
            </select>
          </Campo>
          <Campo id="salario" label="Salário (R$)" dica="Ex.: 2.500,00">
            <input id="salario" name="salario" inputMode="decimal" defaultValue={txt(m.salario)} className={inputClass} />
          </Campo>
          <Campo id="percentualComissao" label="% de comissão" dica="Ex.: 12">
            <input id="percentualComissao" name="percentualComissao" inputMode="decimal" defaultValue={txt(m.percentualComissao)} className={inputClass} />
          </Campo>
          <div className="sm:col-span-2 lg:col-span-3">
            <Campo id="observacoes" label="Observações">
              <textarea id="observacoes" name="observacoes" rows={2} defaultValue={txt(m.observacoes)} className={inputClass} />
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
