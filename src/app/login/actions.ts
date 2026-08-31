"use server";

/**
 * Ação de servidor para autenticação. Chama o signIn do Auth.js.
 * Em sucesso, `signIn` lança um redirecionamento (NEXT_REDIRECT) que deve
 * propagar. Em falha de credenciais, devolvemos uma mensagem genérica
 * (não revela se o e-mail existe).
 */
import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export type EstadoLogin = { erro?: string };

export async function autenticar(
  _estadoAnterior: EstadoLogin,
  formData: FormData,
): Promise<EstadoLogin> {
  const email = String(formData.get("email") ?? "");
  const senha = String(formData.get("senha") ?? "");

  try {
    await signIn("credentials", { email, senha, redirectTo: "/" });
    return {};
  } catch (erro) {
    if (erro instanceof AuthError) {
      return { erro: "E-mail ou senha inválidos." };
    }
    // Redirecionamento de sucesso (e outros) deve continuar a propagar.
    throw erro;
  }
}
