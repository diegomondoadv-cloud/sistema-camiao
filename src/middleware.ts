/**
 * Middleware de autenticação. Usa apenas a configuração edge-safe
 * (`authConfig`), sem Prisma/argon2. Redireciona para /login quem não
 * tiver sessão válida, conforme o callback `authorized`.
 */
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // Protege tudo, exceto rotas de API do Auth, assets estáticos, favicon e os
  // arquivos públicos do PWA (manifest, service worker e ícones).
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icon-192.png|icon-512.png|apple-icon.png).*)",
  ],
};
