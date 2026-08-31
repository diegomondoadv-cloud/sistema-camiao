/**
 * Aumenta os tipos do Auth.js para incluir os campos do nosso domínio
 * (id, papel, precisaTrocarSenha) na sessão, no usuário e no token JWT.
 */
import type { Papel } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    papel: Papel;
    precisaTrocarSenha: boolean;
  }

  interface Session {
    user: {
      id: string;
      papel: Papel;
      precisaTrocarSenha: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    papel: Papel;
    precisaTrocarSenha: boolean;
  }
}
