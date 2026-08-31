/**
 * Validação de despesas de viagem (camada de domínio, testável).
 */
import { z } from "zod";
import { paraDecimal, paraData, textoOpcional } from "@/shared/parse";

export const CATEGORIAS_DESPESA = [
  "combustivel",
  "arla",
  "pedagio",
  "alimentacao",
  "estacionamento",
  "diaria",
  "descarga",
  "ajudante",
  "lavagem",
  "manutencao_emergencial",
  "pneus",
  "comissao_motorista",
  "outras",
] as const;

export const ROTULO_CATEGORIA: Record<string, string> = {
  combustivel: "Combustível",
  arla: "Arla",
  pedagio: "Pedágio",
  alimentacao: "Alimentação",
  estacionamento: "Estacionamento",
  diaria: "Diária",
  descarga: "Descarga",
  ajudante: "Ajudante",
  lavagem: "Lavagem",
  manutencao_emergencial: "Manutenção emergencial",
  pneus: "Pneus",
  comissao_motorista: "Comissão do motorista",
  outras: "Outras",
};

export const despesaSchema = z.object({
  data: z.date(),
  categoria: z.enum(CATEGORIAS_DESPESA),
  valor: z.number().min(0).max(99_999_999),
  formaPagamento: textoOpcional,
  estabelecimento: textoOpcional,
  descricao: textoOpcional,
  fornecedorId: z.string().nullable().optional(),
});
export type DespesaInput = z.infer<typeof despesaSchema>;

/** Monta o objeto de despesa a partir do FormData. Data vazia = hoje. */
export function lerDespesaDoForm(fd: FormData) {
  const fornecedorId = String(fd.get("fornecedorId") ?? "").trim();
  return {
    data: paraData(fd.get("data")) ?? new Date(),
    categoria: fd.get("categoria"),
    valor: paraDecimal(fd.get("valor")) ?? 0,
    formaPagamento: fd.get("formaPagamento"),
    estabelecimento: fd.get("estabelecimento"),
    descricao: fd.get("descricao"),
    fornecedorId: fornecedorId === "" ? null : fornecedorId,
  };
}
