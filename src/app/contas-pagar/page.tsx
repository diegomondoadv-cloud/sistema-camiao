import type { Metadata } from "next";
import Link from "next/link";
import { exigirGestor } from "@/infrastructure/auth/sessao";
import { prisma } from "@/infrastructure/prisma";
import { reaisParaCentavos, formatarBRL } from "@/shared/dinheiro";
import { formatarData } from "@/shared/formato";
import { dataParaInput, paraData } from "@/shared/parse";
import { Campo, inputClass } from "@/components/campo";
import {
  CATEGORIAS_CONTA_PAGAR,
  ROTULO_CATEGORIA_PAGAR,
  ROTULO_SITUACAO_PAGAR,
  COR_SITUACAO_PAGAR,
  situacaoContaPagar,
} from "@/domain/contas-pagar/validacao";
import {
  CATEGORIAS_FORNECEDOR,
  ROTULO_CATEGORIA_FORNECEDOR,
} from "@/domain/fornecedores/validacao";
import {
  criarContaPagar,
  alternarPagaContaPagar,
  removerContaPagar,
  gerarContasFixasDoMes,
  criarFornecedorRapido,
} from "./actions";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export const metadata: Metadata = {
  title: "Contas a pagar · Sistema Transportadora",
};

const mensagens: Record<string, { texto: string; tipo: "ok" | "erro" }> = {
  criada: { texto: "Conta cadastrada.", tipo: "ok" },
  atualizada: { texto: "Conta atualizada.", tipo: "ok" },
  editada: { texto: "Conta atualizada.", tipo: "ok" },
  removida: { texto: "Conta removida.", tipo: "ok" },
  "fornecedor-criado": { texto: "Fornecedor cadastrado. Agora selecione-o na conta.", tipo: "ok" },
  "fornecedor-invalido": { texto: "Nome do fornecedor é obrigatório.", tipo: "erro" },
  "dados-invalidos": { texto: "Verifique os dados: descrição e valor são obrigatórios.", tipo: "erro" },
  "nao-encontrada": { texto: "Conta não encontrada.", tipo: "erro" },
};

export default async function ContasPagarPage({
  searchParams,
}: {
  searchParams: Promise<{
    ok?: string;
    erro?: string;
    filtro?: string;
    n?: string;
    mes?: string;
    ano?: string;
    inicio?: string;
    fim?: string;
  }>;
}) {
  await exigirGestor();
  const sp = await searchParams;
  const aviso =
    sp.ok === "geradas"
      ? { texto: `${sp.n ?? 0} conta(s) gerada(s) a partir dos custos fixos.`, tipo: "ok" as const }
      : sp.ok === "parcelada"
        ? { texto: `${sp.n ?? 0} parcelas lançadas.`, tipo: "ok" as const }
        : mensagens[sp.ok ?? ""] ?? mensagens[sp.erro ?? ""];
  const filtro = sp.filtro === "pagas" || sp.filtro === "todas" ? sp.filtro : "aberto";
  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth() + 1;

  const [contas, fornecedores, cavalos] = await Promise.all([
    prisma.contaPagar.findMany({
      orderBy: [{ paga: "asc" }, { dataVencimento: "asc" }],
      include: {
        fornecedor: { select: { nome: true } },
        cavalo: { select: { placa: true } },
      },
    }),
    prisma.fornecedor.findMany({ where: { ativo: true }, orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    prisma.cavalo.findMany({ where: { situacao: { not: "vendido" } }, orderBy: { placa: "asc" }, select: { id: true, placa: true } }),
  ]);

  // --- Filtro por data de vencimento (mês/ano ou período específico) ---
  const mesSel = Number(sp.mes) || 0; // 0 = todos os meses
  const anoSel = Number(sp.ano) || 0; // 0 = todos os anos
  const inicio = paraData(sp.inicio ?? null);
  const fim = paraData(sp.fim ?? null);

  let rangeIni: Date | null = null;
  let rangeFim: Date | null = null; // exclusivo
  if (inicio || fim) {
    rangeIni = inicio;
    rangeFim = fim ? new Date(fim.getTime() + 24 * 60 * 60 * 1000) : null;
  } else if (anoSel > 0) {
    if (mesSel > 0) {
      rangeIni = new Date(Date.UTC(anoSel, mesSel - 1, 1));
      rangeFim = new Date(Date.UTC(anoSel, mesSel, 1));
    } else {
      rangeIni = new Date(Date.UTC(anoSel, 0, 1));
      rangeFim = new Date(Date.UTC(anoSel + 1, 0, 1));
    }
  }
  const temFiltroData = rangeIni != null || rangeFim != null;

  const noPeriodo = (d: Date | null) => {
    if (!temFiltroData) return true;
    if (!d) return false; // sem vencimento não entra em filtro por data
    if (rangeIni && d.getTime() < rangeIni.getTime()) return false;
    if (rangeFim && d.getTime() >= rangeFim.getTime()) return false;
    return true;
  };

  const contasNoPeriodo = contas.filter((c) => noPeriodo(c.dataVencimento));

  // Totais sobre o período filtrado
  let totalAberto = 0;
  let totalVencido = 0;
  let totalPago = 0;
  for (const c of contasNoPeriodo) {
    const valorC = reaisParaCentavos(Number(c.valor));
    const sit = situacaoContaPagar(c.paga, c.dataVencimento, hoje);
    if (sit === "paga") totalPago += valorC;
    else {
      totalAberto += valorC;
      if (sit === "vencida") totalVencido += valorC;
    }
  }

  const visiveis = contasNoPeriodo.filter((c) => {
    if (filtro === "pagas") return c.paga;
    if (filtro === "todas") return true;
    return !c.paga; // aberto
  });

  // Preserva o filtro de data ao trocar de aba
  const paramsData = new URLSearchParams();
  if (sp.mes) paramsData.set("mes", sp.mes);
  if (sp.ano) paramsData.set("ano", sp.ano);
  if (sp.inicio) paramsData.set("inicio", sp.inicio);
  if (sp.fim) paramsData.set("fim", sp.fim);
  const sufixoData = paramsData.toString() ? `&${paramsData.toString()}` : "";

  const abas = [
    { chave: "aberto", rotulo: "Em aberto" },
    { chave: "pagas", rotulo: "Pagas" },
    { chave: "todas", rotulo: "Todas" },
  ];

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Contas a pagar</h1>
        <Link href="/" className="text-sm text-emerald-700 hover:underline">
          ← Voltar ao início
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

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-xs text-amber-700/70">Total a pagar (em aberto)</p>
          <p className="text-xl font-bold text-amber-800">{formatarBRL(totalAberto)}</p>
        </div>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
          <p className="text-xs text-red-700/70">Vencido</p>
          <p className="text-xl font-bold text-red-700">{formatarBRL(totalVencido)}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <p className="text-xs text-emerald-700/70">Já pago</p>
          <p className="text-xl font-bold text-emerald-800">{formatarBRL(totalPago)}</p>
        </div>
      </div>

      {/* Gerar custos fixos do mês */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <form action={gerarContasFixasDoMes} className="flex flex-wrap items-end gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-700">Gerar contas dos custos fixos</p>
            <p className="text-xs text-slate-500">Cria as contas dos custos fixos mensais (rastreador, seguro, salário…). Não duplica. Financiamento: lance como parcelado abaixo.</p>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="g-mes" className="text-xs font-medium text-slate-600">A partir de</label>
            <select id="g-mes" name="mes" defaultValue={String(mesAtual)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="g-ano" className="text-xs font-medium text-slate-600">Ano</label>
            <select id="g-ano" name="ano" defaultValue={String(anoAtual)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              {[anoAtual - 1, anoAtual, anoAtual + 1].map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="g-meses" className="text-xs font-medium text-slate-600">Nº de meses</label>
            <select id="g-meses" name="meses" defaultValue="1" className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              {[1, 2, 3, 6, 12].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <button type="submit" className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900">
            Gerar
          </button>
        </form>
      </div>

      {/* Filtro por período */}
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="filtro" value={filtro} />
          <div className="flex flex-col gap-1">
            <label htmlFor="f-mes" className="text-xs font-medium text-slate-600">Mês</label>
            <select id="f-mes" name="mes" defaultValue={String(mesSel)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="0">Todos</option>
              {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="f-ano" className="text-xs font-medium text-slate-600">Ano</label>
            <select id="f-ano" name="ano" defaultValue={String(anoSel)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="0">Todos</option>
              {[anoAtual - 2, anoAtual - 1, anoAtual, anoAtual + 1].map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <span className="pb-2 text-xs text-slate-400">ou período:</span>
          <div className="flex flex-col gap-1">
            <label htmlFor="f-inicio" className="text-xs font-medium text-slate-600">De</label>
            <input id="f-inicio" name="inicio" type="date" defaultValue={sp.inicio ?? ""} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="f-fim" className="text-xs font-medium text-slate-600">Até</label>
            <input id="f-fim" name="fim" type="date" defaultValue={sp.fim ?? ""} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <button type="submit" className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900">
            Filtrar
          </button>
          {temFiltroData && (
            <Link href={`/contas-pagar?filtro=${filtro}`} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
              Limpar
            </Link>
          )}
        </form>
        <p className="mt-2 text-xs text-slate-400">
          Filtra pela data de vencimento. O período específico (De/Até) tem prioridade sobre mês/ano.
        </p>
      </div>

      {/* Filtro (abas de situação) */}
      <div className="mb-4 flex gap-2">
        {abas.map((a) => (
          <Link
            key={a.chave}
            href={`/contas-pagar?filtro=${a.chave}${sufixoData}`}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              filtro === a.chave ? "bg-slate-800 text-white" : "border border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {a.rotulo}
          </Link>
        ))}
      </div>

      {/* Lista */}
      <div className="mb-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Vencimento</th>
              <th className="px-4 py-3 font-medium">Descrição</th>
              <th className="px-4 py-3 font-medium">Categoria</th>
              <th className="px-4 py-3 font-medium">Fornecedor / Veículo</th>
              <th className="px-4 py-3 font-medium">Valor</th>
              <th className="px-4 py-3 font-medium">Situação</th>
              <th className="px-4 py-3 font-medium">Ação</th>
            </tr>
          </thead>
          <tbody>
            {visiveis.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                  Nenhuma conta {filtro === "pagas" ? "paga" : filtro === "aberto" ? "em aberto" : "cadastrada"}.
                </td>
              </tr>
            )}
            {visiveis.map((c) => {
              const sit = situacaoContaPagar(c.paga, c.dataVencimento, hoje);
              return (
                <tr key={c.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 text-slate-600">{formatarData(c.dataVencimento)}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{c.descricao}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {c.categoria ? (ROTULO_CATEGORIA_PAGAR[c.categoria] ?? c.categoria) : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {c.fornecedor?.nome ?? c.cavalo?.placa ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {formatarBRL(reaisParaCentavos(Number(c.valor)))}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${COR_SITUACAO_PAGAR[sit]}`}>
                      {ROTULO_SITUACAO_PAGAR[sit]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <form action={alternarPagaContaPagar}>
                        <input type="hidden" name="id" value={c.id} />
                        <button
                          type="submit"
                          className={`rounded-lg border px-3 py-1 text-xs font-medium transition ${
                            c.paga
                              ? "border-slate-300 text-slate-600 hover:bg-slate-50"
                              : "border-emerald-300 bg-emerald-600 text-white hover:bg-emerald-700"
                          }`}
                        >
                          {c.paga ? "Reabrir" : "Marcar paga"}
                        </button>
                      </form>
                      <Link
                        href={`/contas-pagar/${c.id}/editar`}
                        className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 transition hover:bg-slate-50"
                      >
                        Editar
                      </Link>
                      <form action={removerContaPagar}>
                        <input type="hidden" name="id" value={c.id} />
                        <button type="submit" className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-red-600 transition hover:bg-red-50">
                          Remover
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Cadastrar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Cadastrar conta a pagar</h2>

        {/* Cadastro rápido de fornecedor (form separado — não aninhar em outro form) */}
        <details className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <summary className="cursor-pointer text-sm font-medium text-emerald-700">
            ➕ Cadastrar novo fornecedor
          </summary>
          <form action={criarFornecedorRapido} className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Campo id="nf-nome" label="Nome *">
              <input id="nf-nome" name="nome" required placeholder="Ex.: Oficina Central" className={inputClass} />
            </Campo>
            <Campo id="nf-categoria" label="Categoria">
              <select id="nf-categoria" name="categoria" defaultValue="" className={inputClass}>
                <option value="">— nenhuma —</option>
                {CATEGORIAS_FORNECEDOR.map((k) => (
                  <option key={k} value={k}>{ROTULO_CATEGORIA_FORNECEDOR[k]}</option>
                ))}
              </select>
            </Campo>
            <Campo id="nf-cidade" label="Cidade">
              <input id="nf-cidade" name="cidade" placeholder="Cidade/UF" className={inputClass} />
            </Campo>
            <div className="flex items-end">
              <button type="submit" className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900">
                Salvar fornecedor
              </button>
            </div>
          </form>
        </details>

        <form action={criarContaPagar} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Campo id="descricao" label="Descrição *">
            <input id="descricao" name="descricao" required placeholder="Parcela financiamento MKY1H51" className={inputClass} />
          </Campo>
          <Campo id="valor" label="Valor da parcela (R$) *" dica="Ex.: 8.500,00">
            <input id="valor" name="valor" inputMode="decimal" required placeholder="0,00" className={inputClass} />
          </Campo>
          <Campo id="dataVencimento" label="1º vencimento">
            <input id="dataVencimento" name="dataVencimento" type="date" defaultValue={dataParaInput(new Date())} className={inputClass} />
          </Campo>
          <Campo id="parcelas" label="Nº de parcelas" dica="1 = conta única. Ex.: 24 (financiamento)">
            <input id="parcelas" name="parcelas" inputMode="numeric" defaultValue="1" placeholder="1" className={inputClass} />
          </Campo>
          <Campo id="categoria" label="Categoria">
            <select id="categoria" name="categoria" defaultValue="" className={inputClass}>
              <option value="">— nenhuma —</option>
              {CATEGORIAS_CONTA_PAGAR.map((k) => (
                <option key={k} value={k}>{ROTULO_CATEGORIA_PAGAR[k]}</option>
              ))}
            </select>
          </Campo>
          <Campo id="fornecedorId" label="Fornecedor">
            <select id="fornecedorId" name="fornecedorId" defaultValue="" className={inputClass}>
              <option value="">— nenhum —</option>
              {fornecedores.map((f) => (
                <option key={f.id} value={f.id}>{f.nome}</option>
              ))}
            </select>
          </Campo>
          <Campo id="cavaloId" label="Veículo (opcional)">
            <select id="cavaloId" name="cavaloId" defaultValue="" className={inputClass}>
              <option value="">— nenhum —</option>
              {cavalos.map((c) => (
                <option key={c.id} value={c.id}>{c.placa}</option>
              ))}
            </select>
          </Campo>
          <Campo id="formaPagamento" label="Forma de pagamento">
            <input id="formaPagamento" name="formaPagamento" placeholder="Boleto / débito / PIX" className={inputClass} />
          </Campo>
          <div className="sm:col-span-2 lg:col-span-3">
            <Campo id="observacoes" label="Observações">
              <input id="observacoes" name="observacoes" className={inputClass} />
            </Campo>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-700">
              Cadastrar conta
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
