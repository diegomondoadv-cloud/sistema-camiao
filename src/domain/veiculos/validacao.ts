/**
 * Validação e conversão de dados de veículos (camada de domínio, testável).
 * Converte texto dos formulários (formato brasileiro) em números e valida.
 */
import { z } from "zod";
// Conversores numéricos vêm da camada compartilhada (fonte única de verdade).
import { paraInteiro, paraDecimal } from "@/shared/parse";

export { paraInteiro, paraDecimal };

/** Situações possíveis (iguais para cavalo e carreta). */
export const SITUACOES_VEICULO = [
  "ativo",
  "manutencao",
  "inativo",
  "vendido",
] as const;

/** Normaliza a placa: maiúsculas, só letras e números. Ex.: "abc-1d23" → "ABC1D23". */
export function normalizarPlaca(v: unknown): string {
  return String(v ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

const textoOpcional = z
  .string()
  .trim()
  .max(200)
  .optional()
  .nullable()
  .transform((s) => (s ? s : null));

export const cavaloSchema = z.object({
  placa: z.string().min(5, "Placa inválida (mínimo 5 caracteres).").max(8),
  marca: textoOpcional,
  modelo: textoOpcional,
  ano: z.number().int().min(1950).max(2100).nullable(),
  kmAtual: z.number().int().min(0).max(9_999_999).nullable(),
  mediaConsumoEsperada: z.number().min(0).max(99).nullable(),
  capacidade: textoOpcional,
  situacao: z.enum(SITUACOES_VEICULO),
  valorParcela: z.number().min(0).max(99_999_999).nullable(),
  vencimentoParcela: z.number().int().min(1).max(31).nullable(),
  seguro: textoOpcional,
  rastreador: textoOpcional,
  observacoes: textoOpcional,
});
export type CavaloInput = z.infer<typeof cavaloSchema>;

export const carretaSchema = z.object({
  placa: z.string().min(5, "Placa inválida (mínimo 5 caracteres).").max(8),
  tipoCarroceria: textoOpcional,
  numeroEixos: z.number().int().min(1).max(12).nullable(),
  situacao: z.enum(SITUACOES_VEICULO),
  observacoes: textoOpcional,
});
export type CarretaInput = z.infer<typeof carretaSchema>;

/** Monta o objeto de cavalo a partir do FormData (texto → tipos). */
export function lerCavaloDoForm(fd: FormData) {
  return {
    placa: normalizarPlaca(fd.get("placa")),
    marca: fd.get("marca"),
    modelo: fd.get("modelo"),
    ano: paraInteiro(fd.get("ano")),
    kmAtual: paraInteiro(fd.get("kmAtual")),
    mediaConsumoEsperada: paraDecimal(fd.get("mediaConsumoEsperada")),
    capacidade: fd.get("capacidade"),
    situacao: fd.get("situacao"),
    valorParcela: paraDecimal(fd.get("valorParcela")),
    vencimentoParcela: paraInteiro(fd.get("vencimentoParcela")),
    seguro: fd.get("seguro"),
    rastreador: fd.get("rastreador"),
    observacoes: fd.get("observacoes"),
  };
}

/** Monta o objeto de carreta a partir do FormData. */
export function lerCarretaDoForm(fd: FormData) {
  return {
    placa: normalizarPlaca(fd.get("placa")),
    tipoCarroceria: fd.get("tipoCarroceria"),
    numeroEixos: paraInteiro(fd.get("numeroEixos")),
    situacao: fd.get("situacao"),
    observacoes: fd.get("observacoes"),
  };
}
