/**
 * Validação de contas a pagar (camada de domínio, testável) + situação.
 */
import { z } from "zod";
import { paraDecimal, paraData, textoOpcional } from "@/shared/parse";

export const CATEGORIAS_CONTA_PAGAR = [
  "financiamento",
  "investimento",
  "manutencao",
  "pecas",
  "pneus",
  "rastreador",
  "seguro",
  "salario",
  "encargos",
  "impostos",
  "licenciamento",
  "contabilidade",
  "aluguel",
  "fornecedor",
  "combustivel",
  "pedagio",
  "outros",
] as const;

export const ROTULO_CATEGORIA_PAGAR: Record<string, string> = {
  financiamento: "Financiamento",
  investimento: "Investimento",
  manutencao: "Manutenção",
  pecas: "Peças",
  pneus: "Pneus",
  rastreador: "Rastreador",
  seguro: "Seguro",
  salario: "Salário",
  encargos: "Encargos",
  impostos: "Impostos",
  licenciamento: "Licenciamento",
  contabilidade: "Contabilidade",
  aluguel: "Aluguel",
  fornecedor: "Fornecedor",
  combustivel: "Combustível",
  pedagio: "Pedágio",
  outros: "Outros",
};

export type SituacaoContaPagar = "paga" | "vencida" | "a_vencer";

export const ROTULO_SITUACAO_PAGAR: Record<SituacaoContaPagar, string> = {
  paga: "Paga",
  vencida: "Vencida",
  a_vencer: "A vencer",
};

export const COR_SITUACAO_PAGAR: Record<SituacaoContaPagar, string> = {
  paga: "bg-emerald-50 text-emerald-700",
  vencida: "bg-red-50 text-red-700",
  a_vencer: "bg-amber-50 text-amber-700",
};

export const contaPagarSchema = z.object({
  descricao: z.string().trim().min(2, "Descreva a conta.").max(200),
  categoria: textoOpcional,
  valor: z.number().positive("Informe o valor.").max(99_999_999),
  dataVencimento: z.date().nullable(),
  fornecedorId: z.string().nullable(),
  cavaloId: z.string().nullable(),
  formaPagamento: textoOpcional,
  observacoes: textoOpcional,
});
export type ContaPagarInput = z.infer<typeof contaPagarSchema>;

export function lerContaPagarDoForm(fd: FormData) {
  const fornecedorId = String(fd.get("fornecedorId") ?? "").trim();
  const cavaloId = String(fd.get("cavaloId") ?? "").trim();
  return {
    descricao: String(fd.get("descricao") ?? "").trim(),
    categoria: fd.get("categoria"),
    valor: paraDecimal(fd.get("valor")) ?? 0,
    dataVencimento: paraData(fd.get("dataVencimento")),
    fornecedorId: fornecedorId === "" ? null : fornecedorId,
    cavaloId: cavaloId === "" ? null : cavaloId,
    formaPagamento: fd.get("formaPagamento"),
    observacoes: fd.get("observacoes"),
  };
}

/** Situação de uma conta a pagar. */
export function situacaoContaPagar(
  paga: boolean,
  dataVencimento: Date | null | undefined,
  hoje: Date,
): SituacaoContaPagar {
  if (paga) return "paga";
  if (dataVencimento && dataVencimento.getTime() < hoje.getTime()) return "vencida";
  return "a_vencer";
}
