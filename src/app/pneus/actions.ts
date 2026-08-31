"use server";

/**
 * Ações de Pneus. Verificam admin/gestor no servidor.
 */
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/infrastructure/prisma";
import { exigirGestor } from "@/infrastructure/auth/sessao";
import { pneuSchema, lerPneuDoForm } from "@/domain/pneus/validacao";

export async function criarPneu(formData: FormData) {
  await exigirGestor();

  const parsed = pneuSchema.safeParse(lerPneuDoForm(formData));
  if (!parsed.success) redirect("/pneus?erro=dados-invalidos");

  try {
    await prisma.pneu.create({ data: { ...parsed.data } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      redirect("/pneus?erro=numero-existe");
    }
    throw e;
  }

  revalidatePath("/pneus");
  redirect("/pneus?ok=criado");
}

export async function editarPneu(formData: FormData) {
  await exigirGestor();
  const id = String(formData.get("id") ?? "");

  const parsed = pneuSchema.safeParse(lerPneuDoForm(formData));
  if (!parsed.success) redirect(`/pneus/${id}?erro=dados-invalidos`);

  const alvo = await prisma.pneu.findUnique({ where: { id } });
  if (!alvo) redirect("/pneus?erro=nao-encontrado");

  try {
    await prisma.pneu.update({ where: { id }, data: { ...parsed.data } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      redirect(`/pneus/${id}?erro=numero-existe`);
    }
    throw e;
  }

  revalidatePath("/pneus");
  revalidatePath(`/pneus/${id}`);
  redirect(`/pneus/${id}?ok=editado`);
}
