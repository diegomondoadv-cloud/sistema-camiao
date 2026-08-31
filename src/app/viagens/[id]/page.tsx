import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { exigirGestor } from "@/infrastructure/auth/sessao";
import { prisma } from "@/infrastructure/prisma";
import { reaisParaCentavos, formatarBRL, aplicarPercentual } from "@/shared/dinheiro";
import { formatarData, formatarNumero } from "@/shared/formato";
import { dataParaInput } from "@/shared/parse";
import { Campo, inputClass } from "@/components/campo";
import {
  calcularSaldoAReceber,
  calcularResultadoDireto,
} from "@/domain/financeiro/calculos";
import {
  CATEGORIAS_DESPESA,
  ROTULO_CATEGORIA,
} from "@/domain/despesas/validacao";
import {
  situacaoConta,
  ROTULO_SITUACAO_CONTA,
  COR_SITUACAO_CONTA,
} from "@/domain/recebimentos/validacao";
import { editarViagem } from "../actions";
import { criarDespesa, removerDespesa } from "./despesas-actions";
import { criarRecebimento, removerRecebimento } from "./recebimentos-actions";
import { criarAbastecimentoViagem, removerAbastecimentoViagem } from "./abastecimentos-actions";
import { AbastecimentoViagemForm } from "./abastecimento-form";
import { carregarOpcoes } from "../opcoes";
import { ViagemForm } from "../viagem-form";

export const metadata: Metadata = {
  title: "Viagem · Sistema Transportadora",
};

const mensagens: Record<string, { texto: string; tipo: "ok" | "erro" }> = {
  criada: { texto: "Viagem cadastrada com sucesso.", tipo: "ok" },
  editada: { texto: "Viagem atualizada com sucesso.", tipo: "ok" },
  "despesa-criada": { texto: "Despesa lançada.", tipo: "ok" },
  "despesa-removida": { texto: "Despesa removida.", tipo: "ok" },
  "despesa-editada": { texto: "Despesa atualizada.", tipo: "ok" },
  "dados-invalidos": { texto: "Verifique os dados informados.", tipo: "erro" },
  "despesa-invalida": {
    texto: "Verifique a despesa: categoria e valor são obrigatórios.",
    tipo: "erro",
  },
  "recebimento-criado": { texto: "Recebimento registrado.", tipo: "ok" },
  "recebimento-removido": { texto: "Recebimento removido.", tipo: "ok" },
  "recebimento-editado": { texto: "Recebimento atualizado.", tipo: "ok" },
  "recebimento-invalido": {
    texto: "Verifique o recebimento: o valor é obrigatório.",
    tipo: "erro",
  },
  "abast-criado": { texto: "Abastecimento lançado (também virou despesa de combustível).", tipo: "ok" },
  "abast-removido": { texto: "Abastecimento removido.", tipo: "ok" },
  "abast-invalido": { texto: "Verifique o abastecimento: litros e valor por litro são obrigatórios.", tipo: "erro" },
};

/** Soma dias a uma data (para estimar a previsão de pagamento). */
function somarDias(base: Date, dias: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + dias);
  return d;
}

function Card({
  titulo,
  valor,
  destaque,
}: {
  titulo: string;
  valor: string;
  destaque?: "verde" | "vermelho";
}) {
  const cor =
    destaque === "verde"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : destaque === "vermelho"
        ? "border-red-200 bg-red-50 text-red-800"
        : "border-slate-200 bg-white text-slate-800";
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${cor}`}>
      <p className="text-xs opacity-70">{titulo}</p>
      <p className="text-lg font-bold">{valor}</p>
    </div>
  );
}

export default async function ViagemPage({
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

  const [viagem, opcoes, fornecedores] = await Promise.all([
    prisma.viagem.findUnique({
      where: { id },
      include: {
        despesas: {
          orderBy: { data: "desc" },
          include: { fornecedor: { select: { nome: true } } },
        },
        recebimentos: { orderBy: { dataEfetiva: "desc" } },
        abastecimentos: { orderBy: { data: "desc" } },
        motorista: { select: { percentualComissao: true } },
        cliente: { select: { prazoMedioPagamento: true } },
        cavalo: { select: { kmAtual: true } },
      },
    }),
    carregarOpcoes(),
    prisma.fornecedor.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
  ]);
  if (!viagem) redirect("/viagens?erro=nao-encontrada");

  const brutoC = reaisParaCentavos(Number(viagem.valorBrutoFrete));
  const adiantC = reaisParaCentavos(Number(viagem.adiantamento));
  const comissaoTranspC = reaisParaCentavos(Number(viagem.comissaoTransportadora));
  const pctImposto = Number(viagem.percentualImposto ?? 0);
  const impostoC = aplicarPercentual(brutoC, pctImposto);

  const recebimentosC = viagem.recebimentos.map((r) =>
    reaisParaCentavos(Number(r.valor)),
  );
  const totalRecebimentosC = recebimentosC.reduce((s, v) => s + v, 0);
  const jaRecebidoC = adiantC + totalRecebimentosC;
  // Saldo já LÍQUIDO: desconta o imposto retido pela transportadora.
  const saldo = calcularSaldoAReceber(brutoC, adiantC, recebimentosC, impostoC);

  // Previsão de pagamento estimada = (entrega/previsão/carregamento) + prazo do cliente
  const baseData =
    viagem.dataEntrega ?? viagem.previsaoEntrega ?? viagem.dataCarregamento;
  const prazo = viagem.cliente?.prazoMedioPagamento ?? null;
  const previsaoPagamento =
    baseData && prazo != null ? somarDias(baseData, prazo) : null;
  const situacao = situacaoConta({
    saldo,
    jaRecebido: jaRecebidoC,
    previsaoPagamento,
    hoje: new Date(),
  });

  const despesasTotalC = viagem.despesas.reduce(
    (s, d) => s + reaisParaCentavos(Number(d.valor)),
    0,
  );
  // Comissão do motorista é calculada pelo % (abaixo); não a somamos de novo
  // se ela também tiver sido lançada como despesa.
  const despesasParaResultadoC = viagem.despesas
    .filter((d) => d.categoria !== "comissao_motorista")
    .reduce((s, d) => s + reaisParaCentavos(Number(d.valor)), 0);

  const { comissaoMotorista, imposto, resultadoDireto } = calcularResultadoDireto({
    valorBrutoFrete: brutoC,
    comissaoTransportadora: comissaoTranspC,
    despesasDiretas: despesasParaResultadoC,
    percentualComissaoMotorista: Number(viagem.motorista?.percentualComissao ?? 0),
    percentualImposto: pctImposto,
  });

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Viagem</h1>
        <Link href="/viagens" className="text-sm text-emerald-700 hover:underline">
          ← Voltar às viagens
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

      {/* Situação da conta a receber */}
      <div className="mb-3 flex items-center gap-2">
        <span className="text-sm text-slate-500">Situação da conta:</span>
        <span
          className={`rounded-full px-3 py-0.5 text-xs font-semibold ${
            COR_SITUACAO_CONTA[situacao] ?? "bg-slate-100 text-slate-600"
          }`}
        >
          {ROTULO_SITUACAO_CONTA[situacao]}
        </span>
      </div>

      {/* Resumo financeiro */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Card titulo="Frete bruto" valor={formatarBRL(brutoC)} />
        <Card titulo="Adiantamento" valor={formatarBRL(adiantC)} />
        <Card titulo="Recebido (adiant. + recebimentos)" valor={formatarBRL(jaRecebidoC)} />
        <Card
          titulo="Saldo a receber (líquido)"
          valor={formatarBRL(saldo)}
          destaque={saldo <= 0 ? "verde" : undefined}
        />
        <Card titulo="Despesas" valor={formatarBRL(despesasTotalC)} />
        <Card
          titulo="Comissão do motorista (auto)"
          valor={formatarBRL(comissaoMotorista)}
        />
        <Card
          titulo={`Imposto (${pctImposto.toLocaleString("pt-BR")}%)`}
          valor={formatarBRL(imposto)}
        />
        <Card
          titulo="Resultado da viagem"
          valor={formatarBRL(resultadoDireto)}
          destaque={resultadoDireto >= 0 ? "verde" : "vermelho"}
        />
      </div>

      {/* Despesas */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Despesas</h2>

        <div className="mb-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Data</th>
                <th className="px-3 py-2 font-medium">Categoria</th>
                <th className="px-3 py-2 font-medium">Fornecedor</th>
                <th className="px-3 py-2 font-medium">Estabelecimento</th>
                <th className="px-3 py-2 font-medium">Valor</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {viagem.despesas.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-slate-400">
                    Nenhuma despesa lançada.
                  </td>
                </tr>
              )}
              {viagem.despesas.map((d) => (
                <tr key={d.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-3 py-2 text-slate-600">{formatarData(d.data)}</td>
                  <td className="px-3 py-2 text-slate-700">
                    {ROTULO_CATEGORIA[d.categoria] ?? d.categoria}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {d.fornecedor?.nome ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {d.estabelecimento ?? "—"}
                  </td>
                  <td className="px-3 py-2 font-medium text-slate-800">
                    {formatarBRL(reaisParaCentavos(Number(d.valor)))}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/viagens/${viagem.id}/despesas/${d.id}/editar`}
                        className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 transition hover:bg-slate-50"
                      >
                        Editar
                      </Link>
                      <form action={removerDespesa}>
                        <input type="hidden" name="viagemId" value={viagem.id} />
                        <input type="hidden" name="despesaId" value={d.id} />
                        <button
                          type="submit"
                          className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-red-600 transition hover:bg-red-50"
                        >
                          Remover
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Lançar despesa */}
        <form action={criarDespesa} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input type="hidden" name="viagemId" value={viagem.id} />
          <Campo id="d-categoria" label="Categoria *">
            <select id="d-categoria" name="categoria" required defaultValue="combustivel" className={inputClass}>
              {CATEGORIAS_DESPESA.map((c) => (
                <option key={c} value={c}>{ROTULO_CATEGORIA[c]}</option>
              ))}
            </select>
          </Campo>
          <Campo id="d-valor" label="Valor (R$) *" dica="Ex.: 350,00">
            <input id="d-valor" name="valor" inputMode="decimal" required placeholder="0,00" className={inputClass} />
          </Campo>
          <Campo id="d-data" label="Data">
            <input id="d-data" name="data" type="date" defaultValue={dataParaInput(new Date())} className={inputClass} />
          </Campo>
          <Campo id="d-fornecedor" label="Fornecedor">
            <select id="d-fornecedor" name="fornecedorId" defaultValue="" className={inputClass}>
              <option value="">— nenhum —</option>
              {fornecedores.map((f) => (
                <option key={f.id} value={f.id}>{f.nome}</option>
              ))}
            </select>
          </Campo>
          <Campo id="d-estabelecimento" label="Estabelecimento (livre)">
            <input id="d-estabelecimento" name="estabelecimento" placeholder="Se não for um fornecedor cadastrado" className={inputClass} />
          </Campo>
          <Campo id="d-formaPagamento" label="Forma de pagamento">
            <input id="d-formaPagamento" name="formaPagamento" placeholder="Dinheiro / cartão / PIX" className={inputClass} />
          </Campo>
          <Campo id="d-descricao" label="Descrição">
            <input id="d-descricao" name="descricao" className={inputClass} />
          </Campo>
          <div className="sm:col-span-2 lg:col-span-3">
            <button
              type="submit"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Lançar despesa
            </button>
          </div>
        </form>
      </div>

      {/* Recebimentos (contas a receber) */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">
          Recebimentos (contas a receber)
        </h2>

        <div className="mb-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Data</th>
                <th className="px-3 py-2 font-medium">Forma</th>
                <th className="px-3 py-2 font-medium">Valor</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {viagem.recebimentos.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-slate-400">
                    Nenhum recebimento registrado.
                  </td>
                </tr>
              )}
              {viagem.recebimentos.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-3 py-2 text-slate-600">
                    {formatarData(r.dataEfetiva)}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {r.formaPagamento ?? "—"}
                  </td>
                  <td className="px-3 py-2 font-medium text-slate-800">
                    {formatarBRL(reaisParaCentavos(Number(r.valor)))}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/viagens/${viagem.id}/recebimentos/${r.id}/editar`}
                        className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 transition hover:bg-slate-50"
                      >
                        Editar
                      </Link>
                      <form action={removerRecebimento}>
                        <input type="hidden" name="viagemId" value={viagem.id} />
                        <input type="hidden" name="recebimentoId" value={r.id} />
                        <button
                          type="submit"
                          className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-red-600 transition hover:bg-red-50"
                        >
                          Remover
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Registrar recebimento */}
        <form action={criarRecebimento} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input type="hidden" name="viagemId" value={viagem.id} />
          <Campo id="r-valor" label="Valor recebido (R$) *" dica="Parcial ou total">
            <input id="r-valor" name="valor" inputMode="decimal" required placeholder="0,00" className={inputClass} />
          </Campo>
          <Campo id="r-data" label="Data do recebimento">
            <input id="r-data" name="data" type="date" defaultValue={dataParaInput(new Date())} className={inputClass} />
          </Campo>
          <Campo id="r-formaPagamento" label="Forma de pagamento">
            <input id="r-formaPagamento" name="formaPagamento" placeholder="PIX / boleto / transferência" className={inputClass} />
          </Campo>
          <div className="flex items-end">
            <button
              type="submit"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Registrar recebimento
            </button>
          </div>
        </form>
      </div>

      {/* Abastecimentos da viagem */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-slate-800">Abastecimentos</h2>
        <p className="mb-4 text-xs text-slate-500">
          O abastecimento entra como despesa de combustível (conta no resultado) e vai
          para o painel de Abastecimentos com a média de consumo.
        </p>

        <div className="mb-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Data</th>
                <th className="px-3 py-2 font-medium">Km</th>
                <th className="px-3 py-2 font-medium">Litros</th>
                <th className="px-3 py-2 font-medium">R$/L</th>
                <th className="px-3 py-2 font-medium">Total</th>
                <th className="px-3 py-2 font-medium">Tanque</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {viagem.abastecimentos.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center text-slate-400">
                    Nenhum abastecimento lançado.
                  </td>
                </tr>
              )}
              {viagem.abastecimentos.map((a) => (
                <tr key={a.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-3 py-2 text-slate-600">{formatarData(a.data)}</td>
                  <td className="px-3 py-2 text-slate-600">
                    {a.km != null ? a.km.toLocaleString("pt-BR") : "—"}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{formatarNumero(Number(a.litros), 1)}</td>
                  <td className="px-3 py-2 text-slate-600">{formatarBRL(reaisParaCentavos(Number(a.valorLitro)))}</td>
                  <td className="px-3 py-2 font-medium text-slate-800">{formatarBRL(reaisParaCentavos(Number(a.valorTotal)))}</td>
                  <td className="px-3 py-2 text-slate-600">{a.tanqueCheio ? "Cheio" : "Parcial"}</td>
                  <td className="px-3 py-2">
                    <form action={removerAbastecimentoViagem}>
                      <input type="hidden" name="viagemId" value={viagem.id} />
                      <input type="hidden" name="abastecimentoId" value={a.id} />
                      <button type="submit" className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-red-600 transition hover:bg-red-50">
                        Remover
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <AbastecimentoViagemForm
          action={criarAbastecimentoViagem}
          viagemId={viagem.id}
          ultimoKm={viagem.cavalo?.kmAtual ?? null}
          dataPadrao={dataParaInput(new Date())}
        />
      </div>

      {/* Dados da viagem */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Dados da viagem</h2>
        <ViagemForm
          action={editarViagem}
          opcoes={opcoes}
          viagem={viagem}
          submitLabel="Salvar alterações"
        />
      </div>
    </main>
  );
}
