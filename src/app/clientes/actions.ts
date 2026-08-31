"use server";

/**
 * Ações de Clientes. Verificam admin/gestor no servidor.
 */
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/infrastructure/prisma";
import { exigirGestor } from "@/infrastructure/auth/sessao";
import { clienteSchema, lerClienteDoForm } from "@/domain/clientes/validacao";

export async function criarCliente(formData: FormData) {
  await exigirGestor();

  const parsed = clienteSchema.safeParse(lerClienteDoForm(formData));
  if (!parsed.success) redirect("/clientes?erro=dados-invalidos");

  const filial = await prisma.filial.findFirst();
  await prisma.cliente.create({
    data: { ...parsed.data, filialId: filial?.id ?? null },
  });

  revalidatePath("/clientes");
  redirect("/clientes?ok=criado");
}

export async function editarCliente(formData: FormData) {
  await exigirGestor();
  const id = String(formData.get("id") ?? "");

  const parsed = clienteSchema.safeParse(lerClienteDoForm(formData));
  if (!parsed.success) redirect(`/clientes/${id}?erro=dados-invalidos`);

  const alvo = await prisma.cliente.findUnique({ where: { id } });
  if (!alvo) redirect("/clientes?erro=nao-encontrado");

  await prisma.cliente.update({ where: { id }, data: { ...parsed.data } });

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  redirect(`/clientes/${id}?ok=editado`);
}
