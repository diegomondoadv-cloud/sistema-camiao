/**
 * Validação de recebimentos (contas a receber) — camada de domínio, testável.
 *
 * Um "recebimento" é uma entrada de dinheiro (parcial ou total) ligada a uma
 * viagem. O saldo a receber da viagem é: frete bruto − adiantamento − Σ recebimentos
 * (ver calcularSaldoAReceber em financeiro/calculos).
 */
import { z } from "zod";
import { paraDecimal, paraData, textoOpcional } from "@/shared/parse";

export const SITUACOES_CONTA = [
  "a_vencer",
  "vencida",
  "parcialmente_recebida",
  "recebida",
  "contestada",
] as const;

export type SituacaoConta = (typeof SITUACOES_CONTA)[number];

export const ROTULO_SITUACAO_CONTA: Record<string, string> = {
  a_vencer: "A vencer",
  vencida: "Vencida",
  parcialmente_recebida: "Parcialmente recebida",
  recebida: "Recebida",
  contestada: "Contestada",
};

export const COR_SITUACAO_CONTA: Record<string, string> = {
  a_vencer: "bg-slate-100 text-slate-600",
  vencida: "bg-red-50 text-red-700",
  parcialmente_recebida: "bg-amber-50 text-amber-700",
  recebida: "bg-emerald-50 text-emerald-700",
  contestada: "bg-purple-50 text-purple-700",
};

export const recebimentoSchema = z.object({
  valor: z.number().positive("Informe o valor recebido.").max(99_999_999),
  data: z.date(),
  formaPagamento: textoOpcional,
});
export type RecebimentoInput = z.infer<typeof recebimentoSchema>;

/** Lê um recebimento do formulário. Data vazia = hoje. */
export function lerRecebimentoDoForm(fd: FormData) {
  return {
    valor: paraDecimal(fd.get("valor")) ?? 0,
    data: paraData(fd.get("data")) ?? new Date(),
    formaPagamento: fd.get("formaPagamento"),
  };
}

/**
 * Situação da conta a receber de uma viagem, calculada a partir dos números.
 * Valores em centavos. `previsaoPagamento` pode ser null (sem base para vencer).
 * "contestada" não é calculada aqui — é uma marcação manual.
 */
export function situacaoConta(p: {
  saldo: number;
  jaRecebido: number; // adiantamento + recebimentos, em centavos
  previsaoPagamento: Date | null;
  hoje: Date;
}): Exclude<SituacaoConta, "contestada"> {
  if (p.saldo <= 0) return "recebida";
  if (p.jaRecebido > 0) return "parcialmente_recebida";
  if (
    p.previsaoPagamento &&
    p.previsaoPagamento.getTime() < p.hoje.getTime()
  ) {
    return "vencida";
  }
  return "a_vencer";
}
