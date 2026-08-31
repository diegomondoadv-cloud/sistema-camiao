/**
 * Regras de validação de usuários (camada de domínio, testável e sem I/O).
 */
import { z } from "zod";

/** Papéis que o admin pode atribuir ao CRIAR um usuário pela tela. */
export const PAPEIS_CRIAVEIS = ["gestor", "motorista"] as const;

export const criarUsuarioSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome completo."),
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  papel: z.enum(PAPEIS_CRIAVEIS),
  senha: z.string().min(8, "A senha deve ter ao menos 8 caracteres."),
});
export type CriarUsuarioInput = z.infer<typeof criarUsuarioSchema>;

export const editarUsuarioSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome completo."),
  papel: z.enum(PAPEIS_CRIAVEIS),
});

export const redefinirSenhaSchema = z.object({
  senha: z.string().min(8, "A senha deve ter ao menos 8 caracteres."),
});
