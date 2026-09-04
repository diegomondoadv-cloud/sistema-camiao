import type { Metadata } from "next";
import Link from "next/link";
import { exigirGestor } from "@/infrastructure/auth/sessao";
import { prisma } from "@/infrastructure/prisma";
import { reaisParaCentavos, formatarBRL, type Centavos } from "@/shared/dinheiro";
import { formatarData } from "@/shared/formato";
import { dataParaInput } from "@/shared/parse";
import { Campo, inputClass } from "@/components/campo";
import {
  situacaoVale,
  ROTULO_SITUACAO_VALE,
  COR_SITUACAO_VALE,
} from "@/domain/vales/validacao";
import { criarVale, alternarAcertadoVale, removerVale } from "./actions";

export const metadata: Metadata = {
  title: "Vales do motorista · Sistema Transportadora",
};

const mensagens: Record<string, { texto: string; tipo: "ok" | "erro" }> = {
  criado: { texto: "Vale anotado.", tipo: "ok" },
  editado: { texto: "Vale atualizado.", tipo: "ok" },
  atualizado: { texto: "Vale atualizado.", tipo: "ok" },
  removido: { texto: "Vale removido.", tipo: "ok" },
  "dados-invalidos": { texto: "Verifique os dados: motorista e valor são obrigatórios.", tipo: "erro" },
  "motorista-invalido": { texto: "Motorista não encontrado.", tipo: "erro" },
  "nao-encontrado": { texto: "Vale não encontrado.", tipo: "erro" },
};

export default async function ValesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string; motoristaId?: string; status?: string }>;
}) {
  await exigirGestor();
  const sp = await searchParams;
  const aviso = mensagens[sp.ok ?? ""] ?? mensagens[sp.erro ?? ""];
  const hoje = new Date();

  const filtroMotorista = sp.motoristaId || "";
  const status = sp.status === "acertados" ? "acertados" : sp.status === "pendentes" ? "pendentes" : "todos";

  const [motoristas, vales] = await Promise.all([
    prisma.motorista.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    prisma.valeMotorista.findMany({
      orderBy: [{ acertado: "asc" }, { data: "desc" }],
      include: { motorista: { select: { nome: true } } },
    }),
  ]);

  // Pendências por motorista (só não acertados) — o que se desconta no acerto.
  const pendentePorMotorista = new Map<string, { nome: string; totalC: Centavos }>();
  for (const v of vales) {
    if (v.acertado) continue;
    const atual = pendentePorMotorista.get(v.motoristaId) ?? { nome: v.motorista.nome, totalC: 0 };
    atual.totalC += reaisParaCentavos(Number(v.valor));
    pendentePorMotorista.set(v.motoristaId, atual);
  }
  const totalPendenteC = [...pendentePorMotorista.values()].reduce((s, m) => s + m.totalC, 0);

  // Lista filtrada.
  const linhas = vales
    .filter((v) => (filtroMotorista ? v.motoristaId === filtroMotorista : true))
    .filter((v) =>
      status === "pendentes" ? !v.acertado : status === "acertados" ? v.acertado : true,
    )
    .map((v) => ({ v, situacao: situacaoVale(v.acertado, v.dataVencimento, hoje) }));

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Vales do motorista</h1>
        <Link href="/" className="text-sm text-emerald-700 hover:underline">
          ← Voltar ao início
        </Link>
      </div>

      <p className="mb-4 text-sm text-slate-500">
        Registro dos vales (adiantamentos) para descontar no acerto das comissões.
        Os vales <strong>não</strong> saem do caixa nem entram no resultado — é só
        controle.
      </p>

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

      {/* Resumo de pendências por motorista */}
      <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-amber-800">
            A descontar no acerto (vales pendentes)
          </h2>
          <span className="text-sm font-bold text-amber-800">{formatarBRL(totalPendenteC)}</span>
        </div>
        {pendentePorMotorista.size === 0 ? (
          <p className="text-sm text-amber-700/80">Nenhum vale pendente. 🎉</p>
        ) : (
          <ul className="grid gap-1 text-sm text-amber-900 sm:grid-cols-2">
            {[...pendentePorMotorista.values()]
              .sort((a, b) => b.totalC - a.totalC)
              .map((m) => (
                <li key={m.nome} className="flex justify-between gap-2">
                  <span>{m.nome}</span>
                  <span className="font-semibold">{formatarBRL(m.totalC)}</span>
                </li>
              ))}
          </ul>
        )}
      </div>

      {/* Filtros */}
      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col">
          <label className="mb-1 text-xs text-slate-500">Motorista</label>
          <select name="motoristaId" defaultValue={filtroMotorista} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
            <option value="">Todos</option>
            {motoristas.map((m) => (
              <option key={m.id} value={m.id}>{m.nome}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="mb-1 text-xs text-slate-500">Situação</label>
          <select name="status" defaultValue={status} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
            <option value="todos">Todos</option>
            <option value="pendentes">Só pendentes</option>
            <option value="acertados">Só acertados</option>
          </select>
        </div>
        <button type="submit" className="rounded-lg bg-slate-800 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-slate-900">
          Filtrar
        </button>
        {(filtroMotorista || status !== "todos") && (
          <Link href="/vales" className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
            Limpar
          </Link>
        )}
      </form>

      {/* Lista */}
      <div className="mb-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-4 py-3 font-medium">Motorista</th>
              <th className="px-4 py-3 font-medium">Valor</th>
              <th className="px-4 py-3 font-medium">Vencimento</th>
              <th className="px-4 py-3 font-medium">Situação</th>
              <th className="px-4 py-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {linhas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  Nenhum vale registrado.
                </td>
              </tr>
            )}
            {linhas.map(({ v, situacao }) => (
              <tr key={v.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 text-slate-600">{formatarData(v.data)}</td>
                <td className="px-4 py-3 font-medium text-slate-800">
                  {v.motorista.nome}
                  {v.observacoes && (
                    <span className="block text-xs font-normal text-slate-400">{v.observacoes}</span>
                  )}
                </td>
                <td className="px-4 py-3 font-semibold text-slate-800">
                  {formatarBRL(reaisParaCentavos(Number(v.valor)))}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {v.dataVencimento ? formatarData(v.dataVencimento) : "—"}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${COR_SITUACAO_VALE[situacao]}`}>
                    {ROTULO_SITUACAO_VALE[situacao]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <form action={alternarAcertadoVale}>
                      <input type="hidden" name="id" value={v.id} />
                      <button
                        type="submit"
                        className={`rounded-lg border px-2 py-1 text-xs font-medium transition ${
                          v.acertado
                            ? "border-slate-300 text-slate-600 hover:bg-slate-50"
                            : "border-emerald-300 bg-emerald-600 text-white hover:bg-emerald-700"
                        }`}
                      >
                        {v.acertado ? "Reabrir" : "Marcar acertado"}
                      </button>
                    </form>
                    <Link
                      href={`/vales/${v.id}/editar`}
                      className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 transition hover:bg-slate-50"
                    >
                      Editar
                    </Link>
                    <form action={removerVale}>
                      <input type="hidden" name="id" value={v.id} />
                      <button type="submit" className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-red-600 transition hover:bg-red-50">
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

      {/* Anotar vale */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Anotar vale</h2>
        {motoristas.length === 0 ? (
          <p className="text-sm text-slate-500">Cadastre um motorista antes de anotar vales.</p>
        ) : (
          <form action={criarVale} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Campo id="motoristaId" label="Motorista *">
              <select id="motoristaId" name="motoristaId" required defaultValue={filtroMotorista} className={inputClass}>
                <option value="">Selecione…</option>
                {motoristas.map((m) => (
                  <option key={m.id} value={m.id}>{m.nome}</option>
                ))}
              </select>
            </Campo>
            <Campo id="valor" label="Valor (R$) *" dica="Ex.: 200,00">
              <input id="valor" name="valor" inputMode="decimal" required placeholder="0,00" className={inputClass} />
            </Campo>
            <Campo id="data" label="Data do vale">
              <input id="data" name="data" type="date" defaultValue={dataParaInput(new Date())} className={inputClass} />
            </Campo>
            <Campo id="dataVencimento" label="Vencimento (opcional)">
              <input id="dataVencimento" name="dataVencimento" type="date" className={inputClass} />
            </Campo>
            <div className="sm:col-span-2 lg:col-span-3">
              <Campo id="observacoes" label="Observação">
                <input id="observacoes" name="observacoes" placeholder="Ex.: adiantamento combustível" className={inputClass} />
              </Campo>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <button
                type="submit"
                className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-700"
              >
                Anotar vale
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
