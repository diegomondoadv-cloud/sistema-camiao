"use server";

/**
 * Ações de Metas (por caminhão/mês). Verificam admin/gestor no servidor.
 */
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/infrastructure/prisma";
import { exigirGestor } from "@/infrastructure/auth/sessao";
import { metaSchema, lerMetaDoForm } from "@/domain/metas/validacao";

export async function salvarMeta(formData: FormData) {
  await exigirGestor();

  const parsed = metaSchema.safeParse(lerMetaDoForm(formData));
  if (!parsed.success) {
    const mes = String(formData.get("mes") ?? "");
    const ano = String(formData.get("ano") ?? "");
    redirect(`/metas?mes=${mes}&ano=${ano}&erro=dados-invalidos`);
  }

  const d = parsed.data;
  const cavalo = await prisma.cavalo.findUnique({ where: { id: d.cavaloId } });
  if (!cavalo) redirect("/metas?erro=veiculo-invalido");

  const filial = await prisma.filial.findFirst();

  await prisma.meta.upsert({
    where: {
      escopo_cavaloId_ano_mes: {
        escopo: "veiculo",
        cavaloId: d.cavaloId,
        ano: d.ano,
        mes: d.mes,
      },
    },
    create: {
      escopo: "veiculo",
      cavaloId: d.cavaloId,
      ano: d.ano,
      mes: d.mes,
      metaFaturamento: d.metaFaturamento,
      metaLucro: d.metaLucro,
      metaConsumo: d.metaConsumo,
      metaKm: d.metaKm,
      filialId: filial?.id ?? null,
    },
    update: {
      metaFaturamento: d.metaFaturamento,
      metaLucro: d.metaLucro,
      metaConsumo: d.metaConsumo,
      metaKm: d.metaKm,
    },
  });

  revalidatePath("/metas");
  redirect(`/metas?mes=${d.mes}&ano=${d.ano}&ok=salva`);
}

export async function removerMeta(formData: FormData) {
  await exigirGestor();
  const id = String(formData.get("id") ?? "");
  const mes = String(formData.get("mes") ?? "");
  const ano = String(formData.get("ano") ?? "");

  await prisma.meta.deleteMany({ where: { id } });

  revalidatePath("/metas");
  redirect(`/metas?mes=${mes}&ano=${ano}&ok=removida`);
}
