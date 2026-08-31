/**
 * Módulo de dinheiro — camada compartilhada (shared).
 *
 * Regra fundamental: valores monetários NUNCA são representados como `float`.
 * Internamente trabalhamos com CENTAVOS inteiros para evitar erros de
 * arredondamento (ex.: 0.1 + 0.2 !== 0.3 em ponto flutuante).
 *
 * Arredondamento: comercial (metade para longe do zero), padrão no Brasil.
 */

export type Centavos = number; // sempre inteiro

/** Arredonda metade para longe do zero (2,5 -> 3 ; -2,5 -> -3). */
export function arredondarComercial(valor: number): number {
  return Math.sign(valor) * Math.round(Math.abs(valor));
}

/** Converte reais (número) para centavos inteiros. Ex.: 19.99 -> 1999 */
export function reaisParaCentavos(reais: number): Centavos {
  if (!Number.isFinite(reais)) {
    throw new Error("Valor em reais inválido.");
  }
  return arredondarComercial(reais * 100);
}

/** Converte centavos inteiros para reais (número). Ex.: 1999 -> 19.99 */
export function centavosParaReais(centavos: Centavos): number {
  return centavos / 100;
}

/** Soma uma lista de valores em centavos. */
export function somar(...valores: Centavos[]): Centavos {
  return valores.reduce((total, v) => total + v, 0);
}

/** Subtrai: a - b (em centavos). */
export function subtrair(a: Centavos, b: Centavos): Centavos {
  return a - b;
}

/**
 * Aplica um percentual sobre um valor em centavos, arredondando o resultado.
 * Ex.: 10% de R$ 100,00 (10000 centavos) -> 1000 centavos.
 */
export function aplicarPercentual(base: Centavos, percentual: number): Centavos {
  if (!Number.isFinite(percentual)) {
    throw new Error("Percentual inválido.");
  }
  return arredondarComercial((base * percentual) / 100);
}

/**
 * Formata centavos como moeda brasileira. Ex.: 1234567 -> "R$ 12.345,67"
 * Usa Intl para respeitar o locale pt-BR.
 */
export function formatarBRL(centavos: Centavos): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(centavosParaReais(centavos));
}

/**
 * Interpreta uma string digitada pelo usuário (formato brasileiro ou simples)
 * e devolve centavos. Aceita "1.234,56", "1234,56", "1234.56", "R$ 10,00".
 */
export function parseBRLParaCentavos(texto: string): Centavos {
  const limpo = texto
    .replace(/\s|R\$/gi, "")
    .trim();

  if (limpo === "") {
    throw new Error("Valor monetário vazio.");
  }

  let normalizado: string;
  if (limpo.includes(",")) {
    // Formato brasileiro: ponto = milhar, vírgula = decimal
    normalizado = limpo.replace(/\./g, "").replace(",", ".");
  } else {
    // Sem vírgula: ponto (se houver) é decimal
    normalizado = limpo;
  }

  const numero = Number(normalizado);
  if (!Number.isFinite(numero)) {
    throw new Error(`Valor monetário inválido: "${texto}"`);
  }
  return reaisParaCentavos(numero);
}
