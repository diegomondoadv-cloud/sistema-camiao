/**
 * Instância principal do Auth.js (runtime Node). Adiciona o provider de
 * credenciais que valida e-mail + senha contra o banco, com verificação
 * argon2. Exporta os utilitários usados na aplicação: handlers, auth,
 * signIn, signOut.
 *
 * Segurança:
 * - mensagens de erro genéricas (não revelam se o e-mail existe);
 * - usuário inativo não autentica;
 * - senha conferida com argon2 (hash forte);
 * - e-mail normalizado (minúsculas + trim) para busca consistente.
 */
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { authConfig } from "@/auth.config";
import { prisma } from "@/infrastructure/prisma";
import { verificarSenha } from "@/infrastructure/auth/password";

const credenciaisSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        senha: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credenciaisSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const email = parsed.data.email.trim().toLowerCase();
        const { senha } = parsed.data;

        const usuario = await prisma.usuario.findUnique({ where: { email } });
        if (!usuario || !usuario.ativo) return null;

        const senhaOk = await verificarSenha(usuario.senhaHash, senha);
        if (!senhaOk) return null;

        return {
          id: usuario.id,
          name: usuario.nome,
          email: usuario.email,
          papel: usuario.papel,
          precisaTrocarSenha: usuario.precisaTrocarSenha,
        };
      },
    }),
  ],
});
