/**
 * Validação de fornecedores (camada de domínio, testável).
 */
import { z } from "zod";
import { textoOpcional } from "@/shared/parse";

export const CATEGORIAS_FORNECEDOR = [
  "posto",
  "oficina",
  "pedagio",
  "alimentacao",
  "pecas",
  "pneus",
  "outros",
] as const;

export const ROTULO_CATEGORIA_FORNECEDOR: Record<string, string> = {
  posto: "Posto de combustível",
  oficina: "Oficina",
  pedagio: "Pedágio",
  alimentacao: "Alimentação",
  pecas: "Peças",
  pneus: "Pneus",
  outros: "Outros",
};

export const fornecedorSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do fornecedor.").max(200),
  categoria: textoOpcional,
  cnpjCpf: textoOpcional,
  telefone: textoOpcional,
  cidade: textoOpcional,
  observacoes: textoOpcional,
});
export type FornecedorInput = z.infer<typeof fornecedorSchema>;

export function lerFornecedorDoForm(fd: FormData) {
  return {
    nome: fd.get("nome"),
    categoria: fd.get("categoria"),
    cnpjCpf: fd.get("cnpjCpf"),
    telefone: fd.get("telefone"),
    cidade: fd.get("cidade"),
    observacoes: fd.get("observacoes"),
  };
}
