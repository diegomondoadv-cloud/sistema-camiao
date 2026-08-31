"use server";

/**
 * Ações de Fornecedores. Verificam admin/gestor no servidor.
 */
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/infrastructure/prisma";
import { exigirGestor } from "@/infrastructure/auth/sessao";
import { fornecedorSchema, lerFornecedorDoForm } from "@/domain/fornecedores/validacao";

export async function criarFornecedor(formData: FormData) {
  await exigirGestor();

  const parsed = fornecedorSchema.safeParse(lerFornecedorDoForm(formData));
  if (!parsed.success) redirect("/fornecedores?erro=dados-invalidos");

  const filial = await prisma.filial.findFirst();
  await prisma.fornecedor.create({
    data: { ...parsed.data, filialId: filial?.id ?? null },
  });

  revalidatePath("/fornecedores");
  redirect("/fornecedores?ok=criado");
}

export async function editarFornecedor(formData: FormData) {
  await exigirGestor();
  const id = String(formData.get("id") ?? "");

  const parsed = fornecedorSchema.safeParse(lerFornecedorDoForm(formData));
  if (!parsed.success) redirect(`/fornecedores/${id}?erro=dados-invalidos`);

  const alvo = await prisma.fornecedor.findUnique({ where: { id } });
  if (!alvo) redirect("/fornecedores?erro=nao-encontrado");

  await prisma.fornecedor.update({ where: { id }, data: { ...parsed.data } });

  revalidatePath("/fornecedores");
  revalidatePath(`/fornecedores/${id}`);
  redirect(`/fornecedores/${id}?ok=editado`);
}

export async function alternarAtivoFornecedor(formData: FormData) {
  await exigirGestor();
  const id = String(formData.get("id") ?? "");
  const alvo = await prisma.fornecedor.findUnique({ where: { id } });
  if (!alvo) redirect("/fornecedores?erro=nao-encontrado");

  await prisma.fornecedor.update({ where: { id }, data: { ativo: !alvo.ativo } });

  revalidatePath("/fornecedores");
  redirect("/fornecedores?ok=atualizado");
}
