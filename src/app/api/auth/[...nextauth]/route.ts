/**
 * Rota de autenticação do Auth.js. Runtime Node (argon2/Prisma exigem Node).
 */
import { handlers } from "@/auth";

export const runtime = "nodejs";
export const { GET, POST } = handlers;
