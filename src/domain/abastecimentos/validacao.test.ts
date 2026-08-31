import { describe, it, expect } from "vitest";
import {
  abastecimentoSchema,
  lerAbastecimentoDoForm,
  calcularValorTotal,
} from "./validacao";

function fd(dados: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(dados)) f.set(k, v);
  return f;
}

describe("abastecimento — leitura do formulário", () => {
  it("lê e converte campos em formato brasileiro", () => {
    const dados = lerAbastecimentoDoForm(
      fd({
        cavaloId: "cav1",
        viagemId: "via1",
        data: "2026-07-15",
        posto: "Posto Ipiranga",
        cidade: "Curitiba",
        km: "480.000",
        litros: "250,5",
        valorLitro: "6,29",
        tipoCombustivel: "Diesel S10",
        tanqueCheio: "true",
      }),
    );
    expect(dados.cavaloId).toBe("cav1");
    expect(dados.viagemId).toBe("via1");
    expect(dados.km).toBe(480000);
    expect(dados.litros).toBe(250.5);
    expect(dados.valorLitro).toBe(6.29);
    expect(dados.tanqueCheio).toBe(true);
  });

  it("viagemId vazio vira null; tanque parcial vira false", () => {
    const dados = lerAbastecimentoDoForm(
      fd({ cavaloId: "cav1", viagemId: "", litros: "100", valorLitro: "6" }),
    );
    expect(dados.viagemId).toBeNull();
    expect(dados.tanqueCheio).toBe(false);
  });

  it("valida um abastecimento correto", () => {
    const r = abastecimentoSchema.safeParse(
      lerAbastecimentoDoForm(
        fd({
          cavaloId: "cav1",
          data: "2026-07-15",
          km: "480000",
          litros: "250",
          valorLitro: "6,29",
          tanqueCheio: "true",
        }),
      ),
    );
    expect(r.success).toBe(true);
  });

  it("rejeita sem veículo e sem litros", () => {
    const semCavalo = abastecimentoSchema.safeParse(
      lerAbastecimentoDoForm(fd({ cavaloId: "", litros: "100", valorLitro: "6" })),
    );
    expect(semCavalo.success).toBe(false);

    const semLitros = abastecimentoSchema.safeParse(
      lerAbastecimentoDoForm(fd({ cavaloId: "cav1", litros: "", valorLitro: "6" })),
    );
    expect(semLitros.success).toBe(false);
  });
});

describe("abastecimento — valor total", () => {
  it("calcula litros × valor por litro com 2 casas", () => {
    expect(calcularValorTotal(250, 6.29)).toBe(1572.5);
    expect(calcularValorTotal(100, 5.999)).toBe(599.9);
  });
});
