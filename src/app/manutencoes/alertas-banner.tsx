/**
 * Banner de alertas de manutenção para a tela inicial.
 * Aparece só quando há manutenção vencida ou próxima. Vermelho se houver
 * vencida; âmbar se só houver próximas.
 */
import Link from "next/link";
import { formatarData, formatarNumero } from "@/shared/formato";
import { listarAlertasManutencao } from "@/application/manutencoes/alertas";

function descricao(a: {
  proximaData: Date | null;
  proximoKm: number | null;
  kmAtual: number | null;
}): string {
  const partes: string[] = [];
  if (a.proximaData) partes.push(`vence em ${formatarData(a.proximaData)}`);
  if (a.proximoKm != null) {
    const falta =
      a.kmAtual != null ? a.proximoKm - a.kmAtual : null;
    if (falta != null && falta <= 0) {
      partes.push(`km atingido (${formatarNumero(a.proximoKm, 0)} km)`);
    } else if (falta != null) {
      partes.push(`faltam ${formatarNumero(falta, 0)} km`);
    } else {
      partes.push(`aos ${formatarNumero(a.proximoKm, 0)} km`);
    }
  }
  return partes.join(" · ");
}

export async function AlertasManutencaoBanner() {
  const { alertas, vencidas, proximas } = await listarAlertasManutencao();
  if (alertas.length === 0) return null;

  const temVencida = vencidas > 0;
  const cor = temVencida
    ? "border-red-300 bg-red-50"
    : "border-amber-300 bg-amber-50";
  const corTitulo = temVencida ? "text-red-800" : "text-amber-800";

  const partesResumo: string[] = [];
  if (vencidas > 0)
    partesResumo.push(`${vencidas} ${vencidas === 1 ? "vencida" : "vencidas"}`);
  if (proximas > 0)
    partesResumo.push(`${proximas} ${proximas === 1 ? "próxima" : "próximas"}`);

  const mostradas = alertas.slice(0, 6);
  const restantes = alertas.length - mostradas.length;

  return (
    <div className={`mt-6 rounded-2xl border p-4 shadow-sm ${cor}`}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className={`text-sm font-bold ${corTitulo}`}>
          🔧 Manutenção — {partesResumo.join(" · ")}
        </h2>
        <Link
          href="/manutencoes"
          className="text-xs font-semibold text-slate-700 underline hover:no-underline"
        >
          Ver manutenções →
        </Link>
      </div>
      <ul className="space-y-1 text-sm">
        {mostradas.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                a.status === "vencida"
                  ? "bg-red-200 text-red-800"
                  : "bg-amber-200 text-amber-800"
              }`}
            >
              {a.status === "vencida" ? "VENCIDA" : "Próxima"}
            </span>
            <span className="font-semibold text-slate-800">{a.placa}</span>
            <span className="text-slate-600">
              {a.tipoServico ?? "Manutenção"} · {descricao(a)}
            </span>
          </li>
        ))}
      </ul>
      {restantes > 0 && (
        <p className="mt-2 text-xs text-slate-500">
          e mais {restantes}…{" "}
          <Link href="/manutencoes" className="underline">
            ver todas
          </Link>
        </p>
      )}
    </div>
  );
}
