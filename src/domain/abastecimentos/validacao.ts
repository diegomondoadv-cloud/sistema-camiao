/**
 * Validação de abastecimentos (camada de domínio, testável).
 */
import { z } from "zod";
import { paraDecimal, paraInteiro, paraData, textoOpcional } from "@/shared/parse";

export const abastecimentoSchema = z.object({
  cavaloId: z.string().min(1, "Selecione o veículo."),
  viagemId: z.string().min(1).nullable(),
  data: z.date(),
  posto: textoOpcional,
  cidade: textoOpcional,
  km: z.number().int().min(0).max(9_999_999).nullable(),
  litros: z.number().positive("Informe os litros.").max(9999),
  valorLitro: z.number().positive("Informe o valor por litro.").max(9999),
  tipoCombustivel: textoOpcional,
  tanqueCheio: z.boolean(),
});
export type AbastecimentoInput = z.infer<typeof abastecimentoSchema>;

/**
 * Monta o objeto a partir do FormData. Data vazia = hoje.
 * viagemId vazio vira null (abastecimento pode não estar ligado a uma viagem).
 */
export function lerAbastecimentoDoForm(fd: FormData) {
  const viagemId = String(fd.get("viagemId") ?? "").trim();
  return {
    cavaloId: String(fd.get("cavaloId") ?? "").trim(),
    viagemId: viagemId === "" ? null : viagemId,
    data: paraData(fd.get("data")) ?? new Date(),
    posto: fd.get("posto"),
    cidade: fd.get("cidade"),
    km: paraInteiro(fd.get("km")),
    litros: paraDecimal(fd.get("litros")) ?? 0,
    valorLitro: paraDecimal(fd.get("valorLitro")) ?? 0,
    tipoCombustivel: fd.get("tipoCombustivel"),
    tanqueCheio: fd.get("tanqueCheio") === "true",
  };
}

/** Valor total do abastecimento = litros × valor por litro (2 casas). */
export function calcularValorTotal(litros: number, valorLitro: number): number {
  return Math.round(litros * valorLitro * 100) / 100;
}
