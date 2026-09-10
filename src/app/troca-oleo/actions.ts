"use server";

/**
 * Ações do controle de Troca de óleo. Verificam admin/gestor no servidor.
 */
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/infrastructure/prisma";
import { exigirGestor } from "@/infrastructure/auth/sessao";
import { paraInteiro, paraData } from "@/shared/parse";

/** Salva a configuração de troca de óleo do caminhão (intervalo + última troca). */
export async function salvarConfigOleo(formData: FormData) {
  await exigirGestor();
  const cavaloId = String(formData.get("cavaloId") ?? "").trim();
  if (!cavaloId) redirect("/troca-oleo?erro=dados-invalidos");

  const intervalo = paraInteiro(formData.get("intervaloOleoKm"));
  const kmUltima = paraInteiro(formData.get("kmUltimaTrocaOleo"));
  const dataUltima = paraData(formData.get("dataUltimaTrocaOleo"));

  const cavalo = await prisma.cavalo.findUnique({ where: { id: cavaloId }, select: { id: true } });
  if (!cavalo) redirect("/troca-oleo?erro=veiculo-invalido");

  await prisma.cavalo.update({
    where: { id: cavaloId },
    data: {
      intervaloOleoKm: intervalo,
      kmUltimaTrocaOleo: kmUltima,
      dataUltimaTrocaOleo: dataUltima,
    },
  });

  revalidatePath("/troca-oleo");
  revalidatePath("/");
  redirect("/troca-oleo?ok=config");
}

/** Registra a troca de óleo AGORA: usa o km atual do caminhão e a data de hoje. */
export async function registrarTrocaOleo(formData: FormData) {
  await exigirGestor();
  const cavaloId = String(formData.get("cavaloId") ?? "").trim();

  const cavalo = await prisma.cavalo.findUnique({
    where: { id: cavaloId },
    select: { id: true, kmAtual: true },
  });
  if (!cavalo) redirect("/troca-oleo?erro=veiculo-invalido");

  await prisma.cavalo.update({
    where: { id: cavaloId },
    data: {
      kmUltimaTrocaOleo: cavalo.kmAtual ?? undefined,
      dataUltimaTrocaOleo: new Date(),
    },
  });

  revalidatePath("/troca-oleo");
  revalidatePath("/");
  redirect("/troca-oleo?ok=trocado");
}
