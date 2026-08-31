/**
 * Validação de metas (camada de domínio, testável) + cálculo de % atingido.
 * Metas mensais por caminhão: faturamento, lucro, consumo (km/l) e km rodados.
 */
import { z } from "zod";
import { paraDecimal, paraInteiro } from "@/shared/parse";

export const metaSchema = z.object({
  cavaloId: z.string().min(1, "Selecione o veículo."),
  ano: z.number().int().min(2000).max(2100),
  mes: z.number().int().min(1).max(12),
  metaFaturamento: z.number().min(0).max(99_999_999).nullable(),
  metaLucro: z.number().min(0).max(99_999_999).nullable(),
  metaConsumo: z.number().min(0).max(99).nullable(),
  metaKm: z.number().int().min(0).max(9_999_999).nullable(),
});
export type MetaInput = z.infer<typeof metaSchema>;

export function lerMetaDoForm(fd: FormData) {
  return {
    cavaloId: String(fd.get("cavaloId") ?? "").trim(),
    ano: paraInteiro(fd.get("ano")) ?? 0,
    mes: paraInteiro(fd.get("mes")) ?? 0,
    metaFaturamento: paraDecimal(fd.get("metaFaturamento")),
    metaLucro: paraDecimal(fd.get("metaLucro")),
    metaConsumo: paraDecimal(fd.get("metaConsumo")),
    metaKm: paraInteiro(fd.get("metaKm")),
  };
}

/**
 * Percentual atingido = realizado / meta × 100. Sem meta válida (null/≤0),
 * devolve null (não há o que comparar).
 */
export function percentualAtingido(
  realizado: number,
  meta: number | null | undefined,
): number | null {
  if (meta == null || meta <= 0) return null;
  return (realizado / meta) * 100;
}
