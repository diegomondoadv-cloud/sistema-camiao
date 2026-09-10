/**
 * Controle de troca de óleo (camada de domínio, puro e testável).
 *
 * A avaliação usa o KM ATUAL do caminhão — que sobe automaticamente quando se
 * lança o km numa abastecida. Se o km atual já chegou (ou está perto) do km da
 * próxima troca, o sistema avisa que está na hora.
 */
export type StatusOleo = "vencida" | "proxima" | "ok" | "sem_config";

export interface ResultadoOleo {
  status: StatusOleo;
  /** Km em que a próxima troca é devida (última troca + intervalo). */
  proximoKm: number | null;
  /** Quanto falta em km (negativo/zero = já passou). */
  faltamKm: number | null;
}

/**
 * Avalia a troca de óleo.
 * @param margemKm quantos km antes já começa a avisar "próxima" (padrão 1000).
 */
export function statusTrocaOleo(
  intervaloKm: number | null | undefined,
  kmUltimaTroca: number | null | undefined,
  kmAtual: number | null | undefined,
  margemKm = 1000,
): ResultadoOleo {
  // Sem intervalo ou sem a última troca não há como calcular.
  if (intervaloKm == null || intervaloKm <= 0 || kmUltimaTroca == null) {
    return { status: "sem_config", proximoKm: null, faltamKm: null };
  }

  const proximoKm = kmUltimaTroca + intervaloKm;

  // Sem km atual não dá para avaliar (mas já mostramos o km alvo).
  if (kmAtual == null) {
    return { status: "ok", proximoKm, faltamKm: null };
  }

  const faltamKm = proximoKm - kmAtual;
  if (faltamKm <= 0) return { status: "vencida", proximoKm, faltamKm };
  if (faltamKm <= margemKm) return { status: "proxima", proximoKm, faltamKm };
  return { status: "ok", proximoKm, faltamKm };
}

export const ROTULO_STATUS_OLEO: Record<StatusOleo, string> = {
  vencida: "Trocar agora",
  proxima: "Trocar em breve",
  ok: "Em dia",
  sem_config: "Sem configuração",
};

export const COR_STATUS_OLEO: Record<StatusOleo, string> = {
  vencida: "bg-red-50 text-red-700",
  proxima: "bg-amber-50 text-amber-700",
  ok: "bg-emerald-50 text-emerald-700",
  sem_config: "bg-slate-100 text-slate-500",
};
