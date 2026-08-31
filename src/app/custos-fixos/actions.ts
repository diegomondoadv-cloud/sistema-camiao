"use server";

/**
 * Ações de Custos fixos. Verificam admin/gestor no servidor.
 */
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/infrastructure/prisma";
import { exigirGestor } from "@/infrastructure/auth/sessao";
import { custoFixoSchema, lerCustoFixoDoForm } from "@/domain/custos-fixos/validacao";

export async function criarCustoFixo(formData: FormData) {
  await exigirGestor();

  const parsed = custoFixoSchema.safeParse(lerCustoFixoDoForm(formData));
  if (!parsed.success) redirect("/custos-fixos?erro=dados-invalidos");

  const filial = await prisma.filial.findFirst();
  await prisma.custoFixo.create({
    data: { ...parsed.data, filialId: filial?.id ?? null },
  });

  revalidatePath("/custos-fixos");
  redirect("/custos-fixos?ok=criado");
}

export async function editarCustoFixo(formData: FormData) {
  await exigirGestor();
  const id = String(formData.get("id") ?? "");

  const parsed = custoFixoSchema.safeParse(lerCustoFixoDoForm(formData));
  if (!parsed.success) redirect(`/custos-fixos/${id}?erro=dados-invalidos`);

  const alvo = await prisma.custoFixo.findUnique({ where: { id } });
  if (!alvo) redirect("/custos-fixos?erro=nao-encontrado");

  await prisma.custoFixo.update({ where: { id }, data: { ...parsed.data } });

  revalidatePath("/custos-fixos");
  revalidatePath(`/custos-fixos/${id}`);
  redirect(`/custos-fixos/${id}?ok=editado`);
}

export async function removerCustoFixo(formData: FormData) {
  await exigirGestor();
  const id = String(formData.get("id") ?? "");

  await prisma.custoFixo.deleteMany({ where: { id } });

  revalidatePath("/custos-fixos");
  redirect("/custos-fixos?ok=removido");
}
