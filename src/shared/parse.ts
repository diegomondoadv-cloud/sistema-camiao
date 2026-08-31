/**
 * Conversão de texto de formulários (formato brasileiro) para tipos.
 * Camada compartilhada, pura e testável.
 */
import { z } from "zod";

/** Texto → inteiro, ignorando separadores. "" → null. Ex.: "480.000" → 480000. */
export function paraInteiro(v: unknown): number | null {
  const t = String(v ?? "").replace(/\D/g, "");
  if (t === "") return null;
  const n = parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * Texto → decimal aceitando formato brasileiro (vírgula = decimal, ponto =
 * separador de milhar). Exemplos:
 *   "8.500,00" → 8500 ; "2,5" → 2.5 ; "10.000" → 10000 ; "1.200.000" → 1200000
 *   "2500.50" → 2500.5 (ponto com 2 casas é tratado como decimal) ; "" → null
 *
 * Regra do ponto quando NÃO há vírgula:
 * - um único ponto seguido de 1 ou 2 dígitos → separador decimal ("1.5", "2500.50");
 * - caso contrário (3+ dígitos, ou vários pontos) → separador de milhar.
 */
export function paraDecimal(v: unknown): number | null {
  let t = String(v ?? "").replace(/[^\d.,-]/g, "").trim();
  if (t === "") return null;

  if (t.includes(",")) {
    // pt-BR: a vírgula é o separador decimal; os pontos são de milhar.
    t = t.replace(/\./g, "").replace(",", ".");
  } else if (t.includes(".")) {
    const partes = t.split(".");
    const ultima = partes[partes.length - 1] ?? "";
    const ehDecimal =
      partes.length === 2 && (ultima.length === 1 || ultima.length === 2);
    if (!ehDecimal) t = partes.join(""); // pontos = separador de milhar
  }

  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/**
 * Texto "AAAA-MM-DD" (input type=date) → Date ao meio-dia UTC.
 * O meio-dia UTC evita deslocamento de dia ao exibir em fuso brasileiro.
 * "" ou formato inválido → null.
 */
export function paraData(v: unknown): Date | null {
  const s = String(v ?? "").trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Date → "AAAA-MM-DD" para preencher input type=date. null → "". */
export function dataParaInput(d: Date | null | undefined): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

/** Campo de texto opcional: aparado, no máx. 200 chars, vazio vira null. */
export const textoOpcional = z
  .string()
  .trim()
  .max(200)
  .optional()
  .nullable()
  .transform((s) => (s ? s : null));
