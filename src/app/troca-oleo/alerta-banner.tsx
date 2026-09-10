/**
 * Banner de alerta de troca de óleo na tela inicial.
 * Aparece só quando algum caminhão está na hora (ou perto) de trocar o óleo.
 * Vermelho se houver "trocar agora"; âmbar se só houver "em breve".
 */
import Link from "next/link";
import { formatarNumero } from "@/shared/formato";
import { prisma } from "@/infrastructure/prisma";
import { statusTrocaOleo } from "@/domain/oleo/troca";

export async function AlertaOleoBanner() {
  const cavalos = await prisma.cavalo.findMany({
    where: { situacao: { not: "vendido" } },
    orderBy: { placa: "asc" },
    select: {
      placa: true,
      kmAtual: true,
      intervaloOleoKm: true,
      kmUltimaTrocaOleo: true,
    },
  });

  const alertas = cavalos
    .map((c) => ({ placa: c.placa, r: statusTrocaOleo(c.intervaloOleoKm, c.kmUltimaTrocaOleo, c.kmAtual) }))
    .filter((a) => a.r.status === "vencida" || a.r.status === "proxima");

  if (alertas.length === 0) return null;

  const temAgora = alertas.some((a) => a.r.status === "vencida");
  const cor = temAgora ? "border-red-300 bg-red-50" : "border-amber-300 bg-amber-50";
  const corTitulo = temAgora ? "text-red-800" : "text-amber-800";

  // Vencidas primeiro.
  alertas.sort((a, b) => (a.r.status === "vencida" ? 0 : 1) - (b.r.status === "vencida" ? 0 : 1));

  return (
    <div className={`mt-6 rounded-2xl border p-4 shadow-sm ${cor}`}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className={`text-sm font-bold ${corTitulo}`}>🛢️ Troca de óleo</h2>
        <Link href="/troca-oleo" className="text-xs font-semibold text-slate-700 underline hover:no-underline">
          Ver troca de óleo →
        </Link>
      </div>
      <ul className="space-y-1 text-sm">
        {alertas.map((a) => (
          <li key={a.placa} className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                a.r.status === "vencida" ? "bg-red-200 text-red-800" : "bg-amber-200 text-amber-800"
              }`}
            >
              {a.r.status === "vencida" ? "TROCAR AGORA" : "Trocar em breve"}
            </span>
            <span className="font-semibold text-slate-800">{a.placa}</span>
            <span className="text-slate-600">
              {a.r.faltamKm == null
                ? ""
                : a.r.faltamKm <= 0
                  ? `— passou ${formatarNumero(-a.r.faltamKm, 0)} km do previsto`
                  : `— faltam ${formatarNumero(a.r.faltamKm, 0)} km`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
