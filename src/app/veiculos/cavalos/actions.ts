"use server";

/**
 * Ações de Cavalos (caminhões). Verificam admin/gestor no servidor.
 * Feedback via redirect com código na URL (robusto, sem depender de JS).
 */
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/infrastructure/prisma";
import { exigirGestor } from "@/infrastructure/auth/sessao";
import { cavaloSchema, lerCavaloDoForm } from "@/domain/veiculos/validacao";

export async function criarCavalo(formData: FormData) {
  await exigirGestor();

  const parsed = cavaloSchema.safeParse(lerCavaloDoForm(formData));
  if (!parsed.success) redirect("/veiculos/cavalos?erro=dados-invalidos");
  const dados = parsed.data;

  const existe = await prisma.cavalo.findUnique({ where: { placa: dados.placa } });
  if (existe) redirect("/veiculos/cavalos?erro=placa-existe");

  const filial = await prisma.filial.findFirst();
  await prisma.cavalo.create({
    data: { ...dados, filialId: filial?.id ?? null },
  });

  revalidatePath("/veiculos/cavalos");
  redirect("/veiculos/cavalos?ok=criado");
}

export async function editarCavalo(formData: FormData) {
  await exigirGestor();
  const id = String(formData.get("id") ?? "");

  const parsed = cavaloSchema.safeParse(lerCavaloDoForm(formData));
  if (!parsed.success) redirect(`/veiculos/cavalos/${id}?erro=dados-invalidos`);
  const dados = parsed.data;

  const comMesmaPlaca = await prisma.cavalo.findUnique({
    where: { placa: dados.placa },
  });
  if (comMesmaPlaca && comMesmaPlaca.id !== id) {
    redirect(`/veiculos/cavalos/${id}?erro=placa-existe`);
  }

  const alvo = await prisma.cavalo.findUnique({ where: { id } });
  if (!alvo) redirect("/veiculos/cavalos?erro=nao-encontrado");

  await prisma.cavalo.update({ where: { id }, data: { ...dados } });

  revalidatePath("/veiculos/cavalos");
  revalidatePath(`/veiculos/cavalos/${id}`);
  redirect(`/veiculos/cavalos/${id}?ok=editado`);
}
