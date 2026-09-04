/**
 * Validação de VALES do motorista (camada de domínio, testável).
 *
 * Um vale é um adiantamento anotado apenas para registro/consulta — para
 * descontar no acerto das comissões. NÃO entra no caixa nem no resultado.
 */
import { z } from "zod";
import { paraDecimal, paraData, textoOpcional } from "@/shared/parse";

export const valeSchema = z.object({
  motoristaId: z.string().min(1, "Selecione o motorista."),
  valor: z.number().positive("Informe o valor do vale.").max(99_999_999),
  data: z.date(),
  dataVencimento: z.date().nullable(),
  observacoes: textoOpcional,
});
export type ValeInput = z.infer<typeof valeSchema>;

/** Monta o vale a partir do FormData. Data vazia = hoje. */
export function lerValeDoForm(fd: FormData) {
  return {
    motoristaId: String(fd.get("motoristaId") ?? "").trim(),
    valor: paraDecimal(fd.get("valor")) ?? 0,
    data: paraData(fd.get("data")) ?? new Date(),
    dataVencimento: paraData(fd.get("dataVencimento")),
    observacoes: fd.get("observacoes"),
  };
}

export type SituacaoVale = "acertado" | "vencido" | "pendente";

export const ROTULO_SITUACAO_VALE: Record<SituacaoVale, string> = {
  acertado: "Acertado",
  vencido: "Vencido",
  pendente: "Pendente",
};

export const COR_SITUACAO_VALE: Record<SituacaoVale, string> = {
  acertado: "bg-emerald-50 text-emerald-700",
  vencido: "bg-red-50 text-red-700",
  pendente: "bg-amber-50 text-amber-700",
};

/** Situação do vale: acertado; senão vencido (se passou do vencimento); senão pendente. */
export function situacaoVale(
  acertado: boolean,
  dataVencimento: Date | null | undefined,
  hoje: Date,
): SituacaoVale {
  if (acertado) return "acertado";
  if (dataVencimento && dataVencimento.getTime() < hoje.getTime()) return "vencido";
  return "pendente";
}
