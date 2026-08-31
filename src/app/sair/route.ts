/**
 * Rota de logout robusta: encerra a sessão e redireciona para /login.
 * É um link simples (GET), não depende de JavaScript no cliente — por isso
 * funciona mesmo que a página não hidrate. Runtime Node (Auth.js).
 */
import { signOut } from "@/auth";

export const runtime = "nodejs";

export async function GET() {
  await signOut({ redirectTo: "/login" });
}
