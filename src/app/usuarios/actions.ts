"use server";

/**
 * Ações da tela de Usuários. TODAS verificam admin no servidor (exigirAdmin)
 * antes de qualquer operação. Feedback via redirect com código na URL
 * (robusto: não depende de JavaScript no cliente).
 */
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/infrastructure/prisma";
import { gerarHashSenha } from "@/infrastructure/auth/password";
import { exigirAdmin } from "@/infrastructure/auth/sessao";
import {
  criarUsuarioSchema,
  editarUsuarioSchema,
  redefinirSenhaSchema,
} from "@/domain/usuarios/validacao";

export async function criarUsuario(formData: FormData) {
  await exigirAdmin();

  const parsed = criarUsuarioSchema.safeParse({
    nome: formData.get("nome"),
    email: formData.get("email"),
    papel: formData.get("papel"),
    senha: formData.get("senha"),
  });
  if (!parsed.success) redirect("/usuarios?erro=dados-invalidos");

  const { nome, email, papel, senha } = parsed.data;

  const existe = await prisma.usuario.findUnique({ where: { email } });
  if (existe) redirect("/usuarios?erro=email-existe");

  const filial = await prisma.filial.findFirst();
  const senhaHash = await gerarHashSenha(senha);

  await prisma.usuario.create({
    data: {
      nome,
      email,
      senhaHash,
      papel,
      ativo: true,
      precisaTrocarSenha: false,
      filialId: filial?.id ?? null,
    },
  });

  revalidatePath("/usuarios");
  redirect("/usuarios?ok=criado");
}

export async function alternarAtivo(formData: FormData) {
  const admin = await exigirAdmin();
  const id = String(formData.get("id") ?? "");

  // Proteção contra auto-bloqueio: não pode desativar a própria conta.
  if (id === admin.id) redirect("/usuarios?erro=auto-bloqueio");

  const alvo = await prisma.usuario.findUnique({ where: { id } });
  if (!alvo) redirect("/usuarios?erro=nao-encontrado");

  await prisma.usuario.update({
    where: { id },
    data: { ativo: !alvo.ativo },
  });

  revalidatePath("/usuarios");
  redirect(alvo.ativo ? "/usuarios?ok=desativado" : "/usuarios?ok=ativado");
}

export async function editarUsuario(formData: FormData) {
  const admin = await exigirAdmin();
  const id = String(formData.get("id") ?? "");

  const parsed = editarUsuarioSchema.safeParse({
    nome: formData.get("nome"),
    papel: formData.get("papel"),
  });
  if (!parsed.success) redirect(`/usuarios/${id}?erro=dados-invalidos`);

  const alvo = await prisma.usuario.findUnique({ where: { id } });
  if (!alvo) redirect("/usuarios?erro=nao-encontrado");

  // Proteção contra auto-bloqueio: não permite mudar o próprio papel
  // (evita o admin rebaixar a si mesmo e perder o acesso). Nome pode mudar.
  const ehEuMesmo = id === admin.id;

  await prisma.usuario.update({
    where: { id },
    data: ehEuMesmo
      ? { nome: parsed.data.nome }
      : { nome: parsed.data.nome, papel: parsed.data.papel },
  });

  revalidatePath("/usuarios");
  revalidatePath(`/usuarios/${id}`);
  redirect(`/usuarios/${id}?ok=${ehEuMesmo ? "editado-nome" : "editado"}`);
}

export async function redefinirSenha(formData: FormData) {
  await exigirAdmin();
  const id = String(formData.get("id") ?? "");

  const parsed = redefinirSenhaSchema.safeParse({ senha: formData.get("senha") });
  if (!parsed.success) redirect(`/usuarios/${id}?erro=senha-curta`);

  const alvo = await prisma.usuario.findUnique({ where: { id } });
  if (!alvo) redirect("/usuarios?erro=nao-encontrado");

  const senhaHash = await gerarHashSenha(parsed.data.senha);
  await prisma.usuario.update({
    where: { id },
    data: { senhaHash, precisaTrocarSenha: false },
  });

  redirect(`/usuarios/${id}?ok=senha-redefinida`);
}
