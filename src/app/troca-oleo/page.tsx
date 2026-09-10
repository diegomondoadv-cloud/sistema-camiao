import type { Metadata } from "next";
import Link from "next/link";
import { exigirGestor } from "@/infrastructure/auth/sessao";
import { prisma } from "@/infrastructure/prisma";
import { formatarData, formatarNumero } from "@/shared/formato";
import { dataParaInput } from "@/shared/parse";
import { inputClass } from "@/components/campo";
import {
  statusTrocaOleo,
  ROTULO_STATUS_OLEO,
  COR_STATUS_OLEO,
} from "@/domain/oleo/troca";
import { salvarConfigOleo, registrarTrocaOleo } from "./actions";

export const metadata: Metadata = {
  title: "Troca de óleo · Sistema Transportadora",
};

const mensagens: Record<string, { texto: string; tipo: "ok" | "erro" }> = {
  config: { texto: "Configuração de óleo salva.", tipo: "ok" },
  trocado: { texto: "Troca de óleo registrada com o km atual.", tipo: "ok" },
  "dados-invalidos": { texto: "Verifique os dados.", tipo: "erro" },
  "veiculo-invalido": { texto: "Veículo não encontrado.", tipo: "erro" },
};

function km(n: number | null | undefined): string {
  return n == null ? "—" : `${n.toLocaleString("pt-BR")} km`;
}

export default async function TrocaOleoPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  await exigirGestor();
  const sp = await searchParams;
  const aviso = mensagens[sp.ok ?? ""] ?? mensagens[sp.erro ?? ""];

  const cavalos = await prisma.cavalo.findMany({
    where: { situacao: { not: "vendido" } },
    orderBy: { placa: "asc" },
    select: {
      id: true,
      placa: true,
      kmAtual: true,
      intervaloOleoKm: true,
      kmUltimaTrocaOleo: true,
      dataUltimaTrocaOleo: true,
    },
  });

  const linhas = cavalos.map((c) => ({
    c,
    r: statusTrocaOleo(c.intervaloOleoKm, c.kmUltimaTrocaOleo, c.kmAtual),
  }));

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Troca de óleo</h1>
        <Link href="/" className="text-sm text-emerald-700 hover:underline">
          ← Voltar ao início
        </Link>
      </div>

      <p className="mb-4 text-sm text-slate-500">
        Configure de quantos em quantos km cada caminhão troca o óleo e quando foi
        a última troca. O sistema usa o <strong>km atual</strong> (que sobe quando
        você lança o km nas abastecidas) para avisar quando está na hora — aqui e
        na tela inicial.
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

      {linhas.length === 0 && (
        <p className="text-sm text-slate-400">Nenhum caminhão cadastrado.</p>
      )}

      <div className="space-y-4">
        {linhas.map(({ c, r }) => (
          <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-slate-800">{c.placa}</h2>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${COR_STATUS_OLEO[r.status]}`}>
                  {ROTULO_STATUS_OLEO[r.status]}
                </span>
              </div>
              <div className="text-sm text-slate-500">
                Km atual: <span className="font-semibold text-slate-800">{km(c.kmAtual)}</span>
              </div>
            </div>

            {/* Situação atual */}
            <div className="mb-4 grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Última troca</p>
                <p className="font-medium text-slate-800">{km(c.kmUltimaTrocaOleo)}</p>
                <p className="text-xs text-slate-400">
                  {c.dataUltimaTrocaOleo ? formatarData(c.dataUltimaTrocaOleo) : "sem data"}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Próxima troca (km)</p>
                <p className="font-medium text-slate-800">{km(r.proximoKm)}</p>
              </div>
              <div className={`rounded-xl p-3 ${r.status === "vencida" ? "bg-red-50" : r.status === "proxima" ? "bg-amber-50" : "bg-slate-50"}`}>
                <p className="text-xs text-slate-500">Faltam</p>
                <p className="font-medium text-slate-800">
                  {r.faltamKm == null
                    ? "—"
                    : r.faltamKm <= 0
                      ? `passou ${formatarNumero(-r.faltamKm, 0)} km`
                      : `${formatarNumero(r.faltamKm, 0)} km`}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-4">
              {/* Configuração */}
              <form action={salvarConfigOleo} className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="cavaloId" value={c.id} />
                <div className="flex flex-col">
                  <label className="mb-1 text-xs text-slate-500">Trocar a cada (km)</label>
                  <input name="intervaloOleoKm" inputMode="numeric" defaultValue={c.intervaloOleoKm ?? ""} placeholder="20000" className={`${inputClass} w-32`} />
                </div>
                <div className="flex flex-col">
                  <label className="mb-1 text-xs text-slate-500">Km da última troca</label>
                  <input name="kmUltimaTrocaOleo" inputMode="numeric" defaultValue={c.kmUltimaTrocaOleo ?? ""} placeholder="480000" className={`${inputClass} w-36`} />
                </div>
                <div className="flex flex-col">
                  <label className="mb-1 text-xs text-slate-500">Data da última troca</label>
                  <input name="dataUltimaTrocaOleo" type="date" defaultValue={c.dataUltimaTrocaOleo ? dataParaInput(c.dataUltimaTrocaOleo) : ""} className={inputClass} />
                </div>
                <button type="submit" className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900">
                  Salvar
                </button>
              </form>

              {/* Registrar troca agora */}
              <form action={registrarTrocaOleo}>
                <input type="hidden" name="cavaloId" value={c.id} />
                <button
                  type="submit"
                  className="rounded-lg border border-emerald-300 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                  title="Registra que a troca foi feita agora, no km atual do caminhão"
                >
                  Troquei o óleo agora ({km(c.kmAtual)})
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
