/**
 * Hash e verificação de senhas com argon2id. Camada de infraestrutura.
 *
 * - argon2id é resistente a ataques de GPU e side-channel.
 * - Nunca guardamos senha em texto; apenas o hash (que inclui sal e parâmetros).
 * - `verificarSenha` nunca lança: em qualquer erro (hash malformado) retorna false.
 *
 * Usa `@node-rs/argon2` (implementação em Rust com binários pré-compilados
 * confiáveis em ambientes serverless, como o Vercel). Ela lê e gera o mesmo
 * formato de hash argon2 (string PHC), então hashes antigos continuam válidos.
 */
import { hash as argonHash, verify as argonVerify } from "@node-rs/argon2";

/** Gera o hash argon2id de uma senha em texto (padrão da lib é argon2id). */
export function gerarHashSenha(senha: string): Promise<string> {
  return argonHash(senha);
}

/** Confere se a senha em texto corresponde ao hash. Retorna false em qualquer falha. */
export async function verificarSenha(
  hash: string,
  senha: string,
): Promise<boolean> {
  try {
    return await argonVerify(hash, senha);
  } catch {
    return false;
  }
}
