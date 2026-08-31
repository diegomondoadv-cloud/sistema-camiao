/**
 * Configuração base do Auth.js — SEGURA PARA EDGE (usada pelo middleware).
 * NÃO importa Prisma nem argon2 (que exigem Node). O provider de credenciais,
 * que faz acesso ao banco, é adicionado em `auth.ts` (runtime Node).
 *
 * Estratégia de sessão: JWT (obrigatório com provider de credenciais).
 * As permissões por papel são verificadas no servidor em cada operação.
 */
import type { NextAuthConfig } from "next-auth";
import type { Papel } from "@prisma/client";

export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    /**
     * Controle de acesso central usado pelo middleware:
     * - páginas públicas: apenas /login;
     * - qualquer outra rota exige sessão válida.
     */
    authorized({ auth, request: { nextUrl } }) {
      const logado = !!auth?.user;
      const naTelaLogin = nextUrl.pathname.startsWith("/login");

      if (naTelaLogin) {
        if (logado) return Response.redirect(new URL("/", nextUrl));
        return true;
      }

      // Qualquer rota protegida exige apenas sessão válida.
      return logado;
    },

    jwt({ token, user }) {
      // No login, `user` vem preenchido pelo provider — copiamos para o token.
      if (user) {
        token.id = user.id ?? token.sub ?? "";
        token.papel = user.papel;
        token.precisaTrocarSenha = user.precisaTrocarSenha;
      }
      return token;
    },

    session({ session, token }) {
      // Os claims do JWT são fracamente tipados; convertemos para o formato
      // do domínio (foram gravados por nós no callback jwt, a partir do user).
      if (session.user) {
        session.user.id = token.id as string;
        session.user.papel = token.papel as Papel;
        session.user.precisaTrocarSenha = token.precisaTrocarSenha as boolean;
      }
      return session;
    },
  },
  providers: [], // preenchido em auth.ts (Node)
} satisfies NextAuthConfig;
