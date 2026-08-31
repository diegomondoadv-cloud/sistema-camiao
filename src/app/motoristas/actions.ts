"use server";

/**
 * Ações de Motoristas. Verificam admin/gestor no servidor.
 * Feedback via redirect com código na URL.
 */
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/infrastructure/prisma";
import { exigirGestor } from "@/infrastructure/auth/sessao";
import { motoristaSchema, lerMotoristaDoForm } from "@/domain/motoristas/validacao";

export async function criarMotorista(formData: FormData) {
  await exigirGestor();

  const parsed = motoristaSchema.safeParse(lerMotoristaDoForm(formData));
  if (!parsed.success) redirect("/motoristas?erro=dados-invalidos");

  const filial = await prisma.filial.findFirst();
  await prisma.motorista.create({
    data: { ...parsed.data, filialId: filial?.id ?? null },
  });

  revalidatePath("/motoristas");
  redirect("/motoristas?ok=criado");
}

export async function editarMotorista(formData: FormData) {
  await exigirGestor();
  const id = String(formData.get("id") ?? "");

  const parsed = motoristaSchema.safeParse(lerMotoristaDoForm(formData));
  if (!parsed.success) redirect(`/motoristas/${id}?erro=dados-invalidos`);

  const alvo = await prisma.motorista.findUnique({ where: { id } });
  if (!alvo) redirect("/motoristas?erro=nao-encontrado");

  await prisma.motorista.update({ where: { id }, data: { ...parsed.data } });

  revalidatePath("/motoristas");
  revalidatePath(`/motoristas/${id}`);
  redirect(`/motoristas/${id}?ok=editado`);
}
