"use server";

/**
 * Ações de Carretas (reboques). Verificam admin/gestor no servidor.
 */
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/infrastructure/prisma";
import { exigirGestor } from "@/infrastructure/auth/sessao";
import { carretaSchema, lerCarretaDoForm } from "@/domain/veiculos/validacao";

export async function criarCarreta(formData: FormData) {
  await exigirGestor();

  const parsed = carretaSchema.safeParse(lerCarretaDoForm(formData));
  if (!parsed.success) redirect("/veiculos/carretas?erro=dados-invalidos");
  const dados = parsed.data;

  const existe = await prisma.carreta.findUnique({ where: { placa: dados.placa } });
  if (existe) redirect("/veiculos/carretas?erro=placa-existe");

  const filial = await prisma.filial.findFirst();
  await prisma.carreta.create({
    data: { ...dados, filialId: filial?.id ?? null },
  });

  revalidatePath("/veiculos/carretas");
  redirect("/veiculos/carretas?ok=criado");
}

export async function editarCarreta(formData: FormData) {
  await exigirGestor();
  const id = String(formData.get("id") ?? "");

  const parsed = carretaSchema.safeParse(lerCarretaDoForm(formData));
  if (!parsed.success) redirect(`/veiculos/carretas/${id}?erro=dados-invalidos`);
  const dados = parsed.data;

  const comMesmaPlaca = await prisma.carreta.findUnique({
    where: { placa: dados.placa },
  });
  if (comMesmaPlaca && comMesmaPlaca.id !== id) {
    redirect(`/veiculos/carretas/${id}?erro=placa-existe`);
  }

  const alvo = await prisma.carreta.findUnique({ where: { id } });
  if (!alvo) redirect("/veiculos/carretas?erro=nao-encontrado");

  await prisma.carreta.update({ where: { id }, data: { ...dados } });

  revalidatePath("/veiculos/carretas");
  revalidatePath(`/veiculos/carretas/${id}`);
  redirect(`/veiculos/carretas/${id}?ok=editado`);
}
