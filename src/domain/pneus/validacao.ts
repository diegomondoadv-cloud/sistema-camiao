/**
 * Validação de pneus (camada de domínio, testável) + custo por km.
 */
import { z } from "zod";
import { paraDecimal, paraInteiro, paraData, textoOpcional } from "@/shared/parse";

export const SITUACOES_PNEU = ["em_uso", "estoque", "reforma", "descartado"] as const;

export const ROTULO_SITUACAO_PNEU: Record<string, string> = {
  em_uso: "Em uso",
  estoque: "Em estoque",
  reforma: "Em reforma",
  descartado: "Descartado",
};

export const COR_SITUACAO_PNEU: Record<string, string> = {
  em_uso: "bg-emerald-50 text-emerald-700",
  estoque: "bg-slate-100 text-slate-600",
  reforma: "bg-amber-50 text-amber-700",
  descartado: "bg-red-50 text-red-700",
};

export const pneuSchema = z.object({
  numeroIdentificacao: z.string().trim().min(1, "Informe o número de identificação.").max(60),
  marca: textoOpcional,
  modelo: textoOpcional,
  medida: textoOpcional,
  dataCompra: z.date().nullable(),
  valor: z.number().min(0).max(99_999_999).nullable(),
  cavaloId: z.string().nullable(),
  posicao: textoOpcional,
  kmInstalacao: z.number().int().min(0).max(9_999_999).nullable(),
  kmAtual: z.number().int().min(0).max(9_999_999).nullable(),
  situacao: z.enum(SITUACOES_PNEU),
});
export type PneuInput = z.infer<typeof pneuSchema>;

export function lerPneuDoForm(fd: FormData) {
  const cavaloId = String(fd.get("cavaloId") ?? "").trim();
  return {
    numeroIdentificacao: String(fd.get("numeroIdentificacao") ?? "").trim(),
    marca: fd.get("marca"),
    modelo: fd.get("modelo"),
    medida: fd.get("medida"),
    dataCompra: paraData(fd.get("dataCompra")),
    valor: paraDecimal(fd.get("valor")),
    cavaloId: cavaloId === "" ? null : cavaloId,
    posicao: fd.get("posicao"),
    kmInstalacao: paraInteiro(fd.get("kmInstalacao")),
    kmAtual: paraInteiro(fd.get("kmAtual")),
    situacao: fd.get("situacao"),
  };
}

/**
 * Custo por km rodado do pneu = valor / (km atual − km de instalação).
 * Sem km suficiente ou sem valor, devolve null (não inventa).
 */
export function custoPorKmPneu(
  valor: number | null | undefined,
  kmInstalacao: number | null | undefined,
  kmAtual: number | null | undefined,
): number | null {
  if (valor == null || valor <= 0) return null;
  if (kmInstalacao == null || kmAtual == null) return null;
  const rodados = kmAtual - kmInstalacao;
  if (rodados <= 0) return null;
  return valor / rodados;
}
