"use server";

/**
 * Ação para marcar a comissão do motorista de uma viagem como paga/aberta.
 * Verifica admin/gestor no servidor.
 */
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/infrastructure/prisma";
import { exigirGestor } from "@/infrastructure/auth/sessao";

export async function alternarComissaoPaga(formData: FormData) {
  await exigirGestor();
  const viagemId = String(formData.get("viagemId") ?? "");

  const viagem = await prisma.viagem.findUnique({
    where: { id: viagemId },
    select: { comissaoMotoristaPaga: true },
  });
  if (!viagem) redirect("/comissoes?erro=nao-encontrada");

  await prisma.viagem.update({
    where: { id: viagemId },
    data: { comissaoMotoristaPaga: !viagem.comissaoMotoristaPaga },
  });

  revalidatePath("/comissoes");
  redirect("/comissoes?ok=atualizada");
}
