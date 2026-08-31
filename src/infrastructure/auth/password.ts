/**
 * Hash e verificação de senhas com argon2id. Camada de infraestrutura.
 *
 * - argon2id é resistente a ataques de GPU e side-channel.
 * - Nunca guardamos senha em texto; apenas o hash (que inclui sal e parâmetros).
 * - `verificarSenha` nunca lança: em qualquer erro (hash malformado) retorna false.
 */
import argon2 from "argon2";

/** Gera o hash argon2id de uma senha em texto. */
export function gerarHashSenha(senha: string): Promise<string> {
  return argon2.hash(senha, { type: argon2.argon2id });
}

/** Confere se a senha em texto corresponde ao hash. Retorna false em qualquer falha. */
export async function verificarSenha(
  hash: string,
  senha: string,
): Promise<boolean> {
  try {
    return await argon2.verify(hash, senha);
  } catch {
    return false;
  }
}
