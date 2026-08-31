import type { Metadata } from "next";
import Link from "next/link";
import { exigirGestor } from "@/infrastructure/auth/sessao";
import { prisma } from "@/infrastructure/prisma";
import { reaisParaCentavos, formatarBRL } from "@/shared/dinheiro";
import { formatarData, formatarNumero } from "@/shared/formato";
import { dataParaInput } from "@/shared/parse";
import { Campo, inputClass } from "@/components/campo";
import { statusAlertaManutencao, type StatusAlerta } from "@/domain/manutencoes/validacao";
import { criarManutencao, removerManutencao } from "./actions";

export const metadata: Metadata = {
  title: "Manutenções · Sistema Transportadora",
};

const mensagens: Record<string, { texto: string; tipo: "ok" | "erro" }> = {
  criada: { texto: "Manutenção registrada.", tipo: "ok" },
  editada: { texto: "Manutenção atualizada.", tipo: "ok" },
  removida: { texto: "Manutenção removida.", tipo: "ok" },
  "dados-invalidos": {
    texto: "Verifique os dados: veículo e valor (ou peças/mão de obra) são obrigatórios.",
    tipo: "erro",
  },
  "veiculo-invalido": { texto: "Veículo não encontrado.", tipo: "erro" },
};

const rotuloAlerta: Record<string, string> = {
  vencida: "Vencida",
  proxima: "Próxima",
};
const corAlerta: Record<string, string> = {
  vencida: "bg-red-50 text-red-700",
  proxima: "bg-amber-50 text-amber-700",
};

export default async function ManutencoesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  await exigirGestor();
  const { ok, erro } = await searchParams;
  const aviso = mensagens[ok ?? ""] ?? mensagens[erro ?? ""];
  const hoje = new Date();

  const [manutencoes, cavalos] = await Promise.all([
    prisma.manutencao.findMany({
      orderBy: { data: "desc" },
      include: { cavalo: { select: { placa: true, kmAtual: true } } },
    }),
    prisma.cavalo.findMany({
      orderBy: { placa: "asc" },
      select: { id: true, placa: true, marca: true, modelo: true },
    }),
  ]);

  const linhas = manutencoes.map((m) => ({
    m,
    status: statusAlertaManutencao(m.proximaData, m.proximoKm, m.cavalo.kmAtual, hoje) as StatusAlerta,
  }));
  const alertas = linhas.filter((l) => l.status === "vencida" || l.status === "proxima");

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Manutenções</h1>
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

      {/* Alertas de próximas manutenções */}
      {alertas.length > 0 && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="mb-2 text-sm font-semibold text-amber-800">
            Alertas de manutenção ({alertas.length})
          </h2>
          <ul className="space-y-1 text-sm text-amber-800">
            {alertas.map((l) => (
              <li key={l.m.id}>
                <span className="font-semibold">{l.m.cavalo.placa}</span> ·{" "}
                {l.m.tipoServico ?? "Manutenção"} ·{" "}
                {l.m.proximaData && `próxima em ${formatarData(l.m.proximaData)}`}
                {l.m.proximaData && l.m.proximoKm != null && " / "}
                {l.m.proximoKm != null && `${formatarNumero(l.m.proximoKm, 0)} km`}{" "}
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${corAlerta[l.status ?? ""] ?? ""}`}>
                  {rotuloAlerta[l.status ?? ""] ?? ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Lista */}
      <div className="mb-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-4 py-3 font-medium">Veículo</th>
              <th className="px-4 py-3 font-medium">Serviço</th>
              <th className="px-4 py-3 font-medium">Valor</th>
              <th className="px-4 py-3 font-medium">Próxima</th>
              <th className="px-4 py-3 font-medium">Ação</th>
            </tr>
          </thead>
          <tbody>
            {linhas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  Nenhuma manutenção registrada ainda.
                </td>
              </tr>
            )}
            {linhas.map(({ m, status }) => (
              <tr key={m.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 text-slate-600">{formatarData(m.data)}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{m.cavalo.placa}</td>
                <td className="px-4 py-3 text-slate-600">{m.tipoServico ?? "—"}</td>
                <td className="px-4 py-3 font-medium text-slate-800">
                  {formatarBRL(reaisParaCentavos(Number(m.valor)))}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {m.proximaData ? formatarData(m.proximaData) : ""}
                  {m.proximaData && m.proximoKm != null && " · "}
                  {m.proximoKm != null ? `${formatarNumero(m.proximoKm, 0)} km` : ""}
                  {!m.proximaData && m.proximoKm == null && "—"}{" "}
                  {(status === "vencida" || status === "proxima") && (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${corAlerta[status]}`}>
                      {rotuloAlerta[status]}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/manutencoes/${m.id}/editar`}
                      className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 transition hover:bg-slate-50"
                    >
                      Editar
                    </Link>
                    <form action={removerManutencao}>
                      <input type="hidden" name="id" value={m.id} />
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

      {/* Registrar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">
          Registrar manutenção
        </h2>
        {cavalos.length === 0 ? (
          <p className="text-sm text-slate-500">Cadastre um veículo antes de registrar manutenções.</p>
        ) : (
          <form action={criarManutencao} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Campo id="cavaloId" label="Veículo *">
              <select id="cavaloId" name="cavaloId" required className={inputClass}>
                {cavalos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {[c.placa, c.marca, c.modelo].filter(Boolean).join(" ")}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo id="data" label="Data">
              <input id="data" name="data" type="date" defaultValue={dataParaInput(new Date())} className={inputClass} />
            </Campo>
            <Campo id="km" label="Quilometragem" dica="Hodômetro na manutenção">
              <input id="km" name="km" inputMode="numeric" placeholder="480000" className={inputClass} />
            </Campo>
            <Campo id="oficina" label="Oficina">
              <input id="oficina" name="oficina" placeholder="Auto Diesel" className={inputClass} />
            </Campo>
            <Campo id="tipoServico" label="Tipo de serviço">
              <input id="tipoServico" name="tipoServico" placeholder="Troca de óleo, freios…" className={inputClass} />
            </Campo>
            <Campo id="pecas" label="Peças (R$)">
              <input id="pecas" name="pecas" inputMode="decimal" placeholder="0,00" className={inputClass} />
            </Campo>
            <Campo id="maoDeObra" label="Mão de obra (R$)">
              <input id="maoDeObra" name="maoDeObra" inputMode="decimal" placeholder="0,00" className={inputClass} />
            </Campo>
            <Campo id="valor" label="Valor total (R$)" dica="Se vazio, soma peças + mão de obra">
              <input id="valor" name="valor" inputMode="decimal" placeholder="0,00" className={inputClass} />
            </Campo>
            <Campo id="proximaData" label="Próxima manutenção (data)">
              <input id="proximaData" name="proximaData" type="date" className={inputClass} />
            </Campo>
            <Campo id="proximoKm" label="Próxima manutenção (km)">
              <input id="proximoKm" name="proximoKm" inputMode="numeric" placeholder="490000" className={inputClass} />
            </Campo>
            <div className="sm:col-span-2 lg:col-span-3">
              <Campo id="observacoes" label="Observações">
                <input id="observacoes" name="observacoes" className={inputClass} />
              </Campo>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <button
                type="submit"
                className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-700"
              >
                Registrar manutenção
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
