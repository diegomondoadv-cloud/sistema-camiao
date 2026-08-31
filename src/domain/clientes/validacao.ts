/**
 * Validação de clientes/transportadoras (camada de domínio, testável).
 */
import { z } from "zod";
import { paraInteiro, textoOpcional } from "@/shared/parse";

export const TIPOS_CLIENTE = ["cliente", "transportadora"] as const;

export const clienteSchema = z.object({
  tipo: z.enum(TIPOS_CLIENTE),
  razaoSocial: z.string().trim().min(2, "Informe a razão social ou nome."),
  cnpjCpf: textoOpcional,
  telefone: textoOpcional,
  responsavel: textoOpcional,
  prazoMedioPagamento: z.number().int().min(0).max(365).nullable(),
  dadosBancarios: textoOpcional,
  observacoes: textoOpcional,
});
export type ClienteInput = z.infer<typeof clienteSchema>;

/** Monta o objeto de cliente a partir do FormData. */
export function lerClienteDoForm(fd: FormData) {
  return {
    tipo: fd.get("tipo"),
    razaoSocial: fd.get("razaoSocial"),
    cnpjCpf: fd.get("cnpjCpf"),
    telefone: fd.get("telefone"),
    responsavel: fd.get("responsavel"),
    prazoMedioPagamento: paraInteiro(fd.get("prazoMedioPagamento")),
    dadosBancarios: fd.get("dadosBancarios"),
    observacoes: fd.get("observacoes"),
  };
}
