/**
 * Utilitários de sessão e autorização (verificação NO SERVIDOR).
 * Usar no topo de páginas e server actions sensíveis — nunca confiar apenas
 * no que o menu mostra ao usuário.
 */
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/infrastructure/prisma";

/** Exige sessão válida. Redireciona para /login se não houver. */
export async function exigirUsuario() {
  const sessao = await auth();
  if (!sessao?.user) redirect("/login");
  return sessao.user;
}

/** Exige que o usuário seja administrador. Não-admin é mandado para a home. */
export async function exigirAdmin() {
  const usuario = await exigirUsuario();
  if (usuario.papel !== "admin") redirect("/");
  return usuario;
}

/**
 * Exige papel de gestão (admin OU gestor). Usado nas áreas operacionais
 * como Veículos. Motorista é mandado para a home.
 */
export async function exigirGestor() {
  const usuario = await exigirUsuario();
  if (usuario.papel !== "admin" && usuario.papel !== "gestor") redirect("/");
  return usuario;
}

/**
 * Resolve o id REAL (no banco) do usuário logado, para usar em campos de
 * autoria (ex.: criadoPorId). Tolera um token com id antigo — por exemplo,
 * quando o usuário admin foi recriado e a sessão antiga ainda está aberta:
 * tenta pelo id e, se não existir, pelo e-mail (estável). Devolve null se
 * não encontrar (o campo de autoria é opcional e nunca deve quebrar a gravação).
 */
export async function idUsuarioAtual(): Promise<string | null> {
  const usuario = await exigirUsuario();

  if (usuario.id) {
    const porId = await prisma.usuario.findUnique({
      where: { id: usuario.id },
      select: { id: true },
    });
    if (porId) return porId.id;
  }

  if (usuario.email) {
    const porEmail = await prisma.usuario.findUnique({
      where: { email: usuario.email },
      select: { id: true },
    });
    if (porEmail) return porEmail.id;
  }

  return null;
}
