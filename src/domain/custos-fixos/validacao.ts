/**
 * Validação de custos fixos (camada de domínio, testável).
 *
 * Custos fixos NÃO entram automaticamente como despesa de uma viagem. Eles são
 * considerados no resultado MENSAL, com rateio "valor fixo por caminhão"
 * (decisão do plano). Aqui tratamos apenas do cadastro e da mensalização.
 */
import { z } from "zod";
import { paraDecimal, paraData } from "@/shared/parse";
import { arredondarComercial, type Centavos } from "@/shared/dinheiro";

export const CATEGORIAS_CUSTO_FIXO = [
  "financiamento",
  "seguro",
  "rastreador",
  "camera",
  "gerenciamento_risco",
  "salario",
  "encargos",
  "contabilidade",
  "impostos",
  "estacionamento",
  "licenciamento",
  "manutencao_preventiva",
  "outros",
] as const;

export const ROTULO_CATEGORIA_CUSTO: Record<string, string> = {
  financiamento: "Financiamento",
  seguro: "Seguro",
  rastreador: "Rastreador",
  camera: "Câmera",
  gerenciamento_risco: "Gerenciamento de risco",
  salario: "Salário",
  encargos: "Encargos",
  contabilidade: "Contabilidade",
  impostos: "Impostos",
  estacionamento: "Estacionamento",
  licenciamento: "Licenciamento",
  manutencao_preventiva: "Manutenção preventiva",
  outros: "Outros",
};

export const PERIODICIDADES = ["mensal", "anual", "unico"] as const;

export const ROTULO_PERIODICIDADE: Record<string, string> = {
  mensal: "Mensal",
  anual: "Anual",
  unico: "Único",
};

export const custoFixoSchema = z
  .object({
    escopo: z.enum(["empresa", "veiculo"]),
    cavaloId: z.string().nullable(),
    categoria: z.enum(CATEGORIAS_CUSTO_FIXO),
    valor: z.number().positive("Informe o valor.").max(99_999_999),
    periodicidade: z.enum(PERIODICIDADES),
    vigenciaInicio: z.date().nullable(),
    vigenciaFim: z.date().nullable(),
  })
  .refine((d) => d.escopo !== "veiculo" || !!d.cavaloId, {
    message: "Selecione o veículo para um custo por veículo.",
    path: ["cavaloId"],
  });
export type CustoFixoInput = z.infer<typeof custoFixoSchema>;

/** Lê um custo fixo do formulário. Custo da empresa nunca fica ligado a cavalo. */
export function lerCustoFixoDoForm(fd: FormData) {
  const escopo = String(fd.get("escopo") ?? "empresa");
  const cavaloBruto = String(fd.get("cavaloId") ?? "").trim();
  return {
    escopo,
    cavaloId: escopo === "veiculo" && cavaloBruto !== "" ? cavaloBruto : null,
    categoria: fd.get("categoria"),
    valor: paraDecimal(fd.get("valor")) ?? 0,
    periodicidade: fd.get("periodicidade"),
    vigenciaInicio: paraData(fd.get("vigenciaInicio")),
    vigenciaFim: paraData(fd.get("vigenciaFim")),
  };
}

/**
 * Valor mensalizado (em centavos): mensal = valor; anual = valor/12;
 * único = 0 (não é recorrente, entra só no mês em que ocorre — tratado à parte).
 */
export function custoMensalizado(
  valor: Centavos,
  periodicidade: string,
): Centavos {
  if (periodicidade === "anual") return arredondarComercial(valor / 12);
  if (periodicidade === "unico") return 0;
  return valor;
}
