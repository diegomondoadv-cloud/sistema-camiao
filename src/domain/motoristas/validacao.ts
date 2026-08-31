/**
 * Validação de motoristas e cálculo de status de vencimento de documentos.
 * Camada de domínio, testável.
 */
import { z } from "zod";
import { paraDecimal, paraData, textoOpcional } from "@/shared/parse";

export const FORMAS_REMUNERACAO = ["salario", "comissao", "misto"] as const;

export const motoristaSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do motorista."),
  telefone: textoOpcional,
  cpf: textoOpcional,
  cnh: textoOpcional,
  categoriaCnh: textoOpcional,
  vencCnh: z.date().nullable(),
  vencToxicologico: z.date().nullable(),
  formaRemuneracao: z.enum(FORMAS_REMUNERACAO),
  salario: z.number().min(0).max(9_999_999).nullable(),
  percentualComissao: z.number().min(0).max(100).nullable(),
  observacoes: textoOpcional,
});
export type MotoristaInput = z.infer<typeof motoristaSchema>;

/** Monta o objeto de motorista a partir do FormData. */
export function lerMotoristaDoForm(fd: FormData) {
  return {
    nome: fd.get("nome"),
    telefone: fd.get("telefone"),
    cpf: fd.get("cpf"),
    cnh: fd.get("cnh"),
    categoriaCnh: fd.get("categoriaCnh"),
    vencCnh: paraData(fd.get("vencCnh")),
    vencToxicologico: paraData(fd.get("vencToxicologico")),
    formaRemuneracao: fd.get("formaRemuneracao"),
    salario: paraDecimal(fd.get("salario")),
    percentualComissao: paraDecimal(fd.get("percentualComissao")),
    observacoes: fd.get("observacoes"),
  };
}

export type StatusVencimento = "vencido" | "proximo" | "ok";

/**
 * Status de um vencimento em relação a `hoje`.
 * - vencido: data já passou
 * - proximo: vence dentro de `diasAlerta` (inclusive)
 * - ok: falta mais que `diasAlerta`
 * - null: sem data informada
 */
export function statusVencimento(
  venc: Date | null | undefined,
  hoje: Date,
  diasAlerta = 30,
): StatusVencimento | null {
  if (!venc) return null;
  const umDia = 86_400_000;
  const inicioHoje = Date.UTC(
    hoje.getUTCFullYear(),
    hoje.getUTCMonth(),
    hoje.getUTCDate(),
  );
  const inicioVenc = Date.UTC(
    venc.getUTCFullYear(),
    venc.getUTCMonth(),
    venc.getUTCDate(),
  );
  const dias = Math.round((inicioVenc - inicioHoje) / umDia);
  if (dias < 0) return "vencido";
  if (dias <= diasAlerta) return "proximo";
  return "ok";
}
