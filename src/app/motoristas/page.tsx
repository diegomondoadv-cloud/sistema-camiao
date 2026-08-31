import type { Metadata } from "next";
import Link from "next/link";
import { exigirGestor } from "@/infrastructure/auth/sessao";
import { prisma } from "@/infrastructure/prisma";
import { formatarData, formatarNumero } from "@/shared/formato";
import { Campo, inputClass } from "@/components/campo";
import { statusVencimento, type StatusVencimento } from "@/domain/motoristas/validacao";
import { criarMotorista } from "./actions";

export const metadata: Metadata = {
  title: "Motoristas · Sistema Transportadora",
};

const mensagens: Record<string, { texto: string; tipo: "ok" | "erro" }> = {
  criado: { texto: "Motorista cadastrado com sucesso.", tipo: "ok" },
  editado: { texto: "Motorista atualizado.", tipo: "ok" },
  "dados-invalidos": {
    texto: "Verifique os dados: o nome é obrigatório.",
    tipo: "erro",
  },
  "nao-encontrado": { texto: "Motorista não encontrado.", tipo: "erro" },
};

const corStatus: Record<StatusVencimento, string> = {
  vencido: "bg-red-50 text-red-700",
  proximo: "bg-amber-50 text-amber-700",
  ok: "bg-emerald-50 text-emerald-700",
};

/** Célula de data com destaque conforme o vencimento. */
function CelulaVencimento({
  data,
  status,
}: {
  data: Date | null;
  status: StatusVencimento | null;
}) {
  if (!data) return <span className="text-slate-400">—</span>;
  const rotulo =
    status === "vencido" ? "Vencido" : status === "proximo" ? "A vencer" : null;
  return (
    <div className="flex items-center gap-2">
      <span className="text-slate-600">{formatarData(data)}</span>
      {rotulo && status && (
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${corStatus[status]}`}>
          {rotulo}
        </span>
      )}
    </div>
  );
}

function remuneracaoTexto(m: {
  formaRemuneracao: string;
  salario: unknown;
  percentualComissao: unknown;
}): string {
  const sal = m.salario != null ? `R$ ${formatarNumero(Number(m.salario), 2)}` : null;
  const com =
    m.percentualComissao != null
      ? `${formatarNumero(Number(m.percentualComissao), 0)}%`
      : null;
  if (m.formaRemuneracao === "salario") return sal ?? "Salário";
  if (m.formaRemuneracao === "comissao") return com ? `Comissão ${com}` : "Comissão";
  return [sal, com].filter(Boolean).join(" + ") || "Misto";
}

export default async function MotoristasPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  await exigirGestor();
  const { ok, erro } = await searchParams;
  const aviso = mensagens[ok ?? ""] ?? mensagens[erro ?? ""];

  const motoristas = await prisma.motorista.findMany({
    orderBy: { nome: "asc" },
  });

  const hoje = new Date();
  const linhas = motoristas.map((m) => {
    const stCnh = statusVencimento(m.vencCnh, hoje);
    const stTox = statusVencimento(m.vencToxicologico, hoje);
    const temAlerta =
      stCnh === "vencido" ||
      stCnh === "proximo" ||
      stTox === "vencido" ||
      stTox === "proximo";
    return { m, stCnh, stTox, temAlerta };
  });
  const comAlerta = linhas.filter((l) => l.temAlerta).length;

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Motoristas</h1>
        <Link href="/" className="text-sm text-emerald-700 hover:underline">
          ← Voltar ao início
        </Link>
      </div>

      {comAlerta > 0 && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          ⚠️ {comAlerta} motorista(s) com documentos vencidos ou a vencer nos
          próximos 30 dias.
        </p>
      )}

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
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Telefone</th>
              <th className="px-4 py-3 font-medium">CNH (venc.)</th>
              <th className="px-4 py-3 font-medium">Toxicológico (venc.)</th>
              <th className="px-4 py-3 font-medium">Remuneração</th>
              <th className="px-4 py-3 font-medium">Ação</th>
            </tr>
          </thead>
          <tbody>
            {linhas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  Nenhum motorista cadastrado ainda.
                </td>
              </tr>
            )}
            {linhas.map(({ m, stCnh, stTox }) => (
              <tr key={m.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-semibold text-slate-800">{m.nome}</td>
                <td className="px-4 py-3 text-slate-600">{m.telefone ?? "—"}</td>
                <td className="px-4 py-3">
                  <CelulaVencimento data={m.vencCnh} status={stCnh} />
                </td>
                <td className="px-4 py-3">
                  <CelulaVencimento data={m.vencToxicologico} status={stTox} />
                </td>
                <td className="px-4 py-3 text-slate-600">{remuneracaoTexto(m)}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/motoristas/${m.id}`}
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
          Cadastrar novo motorista
        </h2>
        <form action={criarMotorista} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Campo id="nome" label="Nome *">
            <input id="nome" name="nome" required placeholder="José da Silva" className={inputClass} />
          </Campo>
          <Campo id="telefone" label="Telefone">
            <input id="telefone" name="telefone" placeholder="(11) 98888-7777" className={inputClass} />
          </Campo>
          <Campo id="cpf" label="CPF">
            <input id="cpf" name="cpf" placeholder="123.456.789-00" className={inputClass} />
          </Campo>
          <Campo id="cnh" label="CNH (número)">
            <input id="cnh" name="cnh" className={inputClass} />
          </Campo>
          <Campo id="categoriaCnh" label="Categoria CNH">
            <input id="categoriaCnh" name="categoriaCnh" placeholder="E" className={inputClass} />
          </Campo>
          <Campo id="vencCnh" label="Vencimento da CNH">
            <input id="vencCnh" name="vencCnh" type="date" className={inputClass} />
          </Campo>
          <Campo id="vencToxicologico" label="Vencimento do toxicológico">
            <input id="vencToxicologico" name="vencToxicologico" type="date" className={inputClass} />
          </Campo>
          <Campo id="formaRemuneracao" label="Forma de remuneração">
            <select id="formaRemuneracao" name="formaRemuneracao" defaultValue="comissao" className={inputClass}>
              <option value="salario">Salário</option>
              <option value="comissao">Comissão</option>
              <option value="misto">Misto</option>
            </select>
          </Campo>
          <Campo id="salario" label="Salário (R$)" dica="Ex.: 2.500,00">
            <input id="salario" name="salario" inputMode="decimal" placeholder="2.500,00" className={inputClass} />
          </Campo>
          <Campo id="percentualComissao" label="% de comissão" dica="Ex.: 12">
            <input id="percentualComissao" name="percentualComissao" inputMode="decimal" placeholder="12" className={inputClass} />
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
              Cadastrar motorista
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
