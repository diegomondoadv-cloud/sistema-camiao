"use server";

/**
 * Ações de Viagens. Verificam admin/gestor no servidor.
 */
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/infrastructure/prisma";
import { exigirGestor } from "@/infrastructure/auth/sessao";
import { viagemSchema, lerViagemDoForm } from "@/domain/viagens/validacao";

export async function criarViagem(formData: FormData) {
  await exigirGestor();

  const parsed = viagemSchema.safeParse(lerViagemDoForm(formData));
  if (!parsed.success) redirect("/viagens?erro=dados-invalidos");

  const filial = await prisma.filial.findFirst();
  const viagem = await prisma.viagem.create({
    data: { ...parsed.data, filialId: filial?.id ?? null },
  });

  revalidatePath("/viagens");
  redirect(`/viagens/${viagem.id}?ok=criada`);
}

export async function editarViagem(formData: FormData) {
  await exigirGestor();
  const id = String(formData.get("id") ?? "");

  const parsed = viagemSchema.safeParse(lerViagemDoForm(formData));
  if (!parsed.success) redirect(`/viagens/${id}?erro=dados-invalidos`);

  const alvo = await prisma.viagem.findUnique({ where: { id } });
  if (!alvo) redirect("/viagens?erro=nao-encontrada");

  await prisma.viagem.update({ where: { id }, data: { ...parsed.data } });

  revalidatePath("/viagens");
  revalidatePath(`/viagens/${id}`);
  redirect(`/viagens/${id}?ok=editada`);
}
