/**
 * Cálculo de consumo de combustível — camada de DOMÍNIO (puro e testável).
 * Conforme seção 6.4 do PLANO_DO_SISTEMA.md.
 *
 * Método "tanque cheio a tanque cheio": entre dois abastecimentos de tanque
 * cheio consecutivos (ordenados por km), os litros consumidos nos km
 * percorridos são a SOMA de todas as abastecidas nesse trecho — as PARCIAIS do
 * meio MAIS a que completou o tanque no fim. (Para o tanque voltar a ficar
 * cheio, foi preciso repor exatamente o que se gastou; logo todo o combustível
 * colocado entre um cheio e o próximo cheio foi queimado naquela distância.)
 *
 * PRINCÍPIO: quando não houver dados suficientes/consistentes, devolve
 * `suficiente: false` com um motivo — NUNCA inventa um valor.
 */

export interface AbastecimentoConsumo {
  km: number | null;
  litros: number;
  valorTotal: number;
  tanqueCheio: boolean;
  /**
   * Data da abastecida — usada para ordenar cronologicamente. Importante porque
   * abastecidas PARCIAIS podem não ter km informado, mas os litros delas devem
   * contar no trecho entre dois tanques cheios.
   */
  data?: Date | null;
}

export type ResultadoConsumoVeiculo =
  | { suficiente: false; motivo: string }
  | {
      suficiente: true;
      kmPorLitro: number;
      custoPorKm: number;
      kmRodados: number;
      litrosConsumidos: number;
      valorConsumido: number;
      intervalos: number;
    };

export function calcularConsumoDoVeiculo(
  abastecimentos: AbastecimentoConsumo[],
): ResultadoConsumoVeiculo {
  // Ordena TODAS as abastecidas cronologicamente (por data; empate por km).
  // As PARCIAIS entram mesmo sem km — o que importa é a data, pra saber em qual
  // trecho (entre dois tanques cheios COM km) os litros dela foram gastos.
  const fills = abastecimentos
    .filter((a) => a.litros > 0)
    .map((a, i) => ({
      km: a.km,
      litros: a.litros,
      valorTotal: a.valorTotal,
      cheio: a.tanqueCheio,
      ordem: a.data ? a.data.getTime() : Number.MAX_SAFE_INTEGER,
      i,
    }))
    .sort((x, y) => x.ordem - y.ordem || (x.km ?? Infinity) - (y.km ?? Infinity) || x.i - y.i);

  // Boundaries de medição = tanques cheios COM km informado.
  const boundariesComKm = fills.filter((f) => f.cheio && f.km != null).length;
  if (boundariesComKm < 2) {
    return {
      suficiente: false,
      motivo:
        "São necessários ao menos 2 abastecimentos de tanque cheio com quilometragem.",
    };
  }

  let kmRodados = 0;
  let litrosConsumidos = 0;
  let valorConsumido = 0;
  let intervalos = 0;

  // Acumula os litros/valor de tudo (parciais inclusive) desde o último tanque
  // cheio com km; ao chegar no próximo tanque cheio com km, esse acumulado é o
  // combustível gasto na distância entre os dois.
  let ultimoKm: number | null = null;
  let accLitros = 0;
  let accValor = 0;
  for (const f of fills) {
    accLitros += f.litros;
    accValor += f.valorTotal;
    if (f.cheio && f.km != null) {
      if (ultimoKm != null) {
        const dkm = f.km - ultimoKm;
        if (dkm > 0 && accLitros > 0) {
          kmRodados += dkm;
          litrosConsumidos += accLitros;
          valorConsumido += accValor;
          intervalos++;
        }
      }
      accLitros = 0;
      accValor = 0;
      ultimoKm = f.km;
    }
  }

  if (intervalos === 0 || kmRodados <= 0 || litrosConsumidos <= 0) {
    return {
      suficiente: false,
      motivo: "Dados insuficientes ou inconsistentes para calcular o consumo.",
    };
  }

  return {
    suficiente: true,
    kmPorLitro: kmRodados / litrosConsumidos,
    custoPorKm: valorConsumido / kmRodados,
    kmRodados,
    litrosConsumidos,
    valorConsumido,
    intervalos,
  };
}

/**
 * Diferença entre consumo real e esperado (km/l). Positivo = melhor que o
 * esperado. Sem esperado válido → null (não compara).
 */
export function diferencaConsumo(
  real: number,
  esperado: number | null | undefined,
): number | null {
  if (esperado == null || !Number.isFinite(esperado) || esperado <= 0) {
    return null;
  }
  return real - esperado;
}
