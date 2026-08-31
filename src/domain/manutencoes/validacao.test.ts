import { describe, it, expect } from "vitest";
import {
  manutencaoSchema,
  lerManutencaoDoForm,
  statusAlertaData,
  statusAlertaKm,
  statusAlertaManutencao,
} from "./validacao";

function fd(dados: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(dados)) f.set(k, v);
  return f;
}

describe("manutenção — leitura e validação", () => {
  it("valida uma manutenção com valor total", () => {
    const r = manutencaoSchema.safeParse(
      lerManutencaoDoForm(
        fd({ cavaloId: "cav1", data: "2026-07-10", valor: "1.200,00", oficina: "Auto Diesel" }),
      ),
    );
    expect(r.success).toBe(true);
  });

  it("calcula o valor a partir de peças + mão de obra quando total vazio", () => {
    const dados = lerManutencaoDoForm(
      fd({ cavaloId: "cav1", pecas: "800,00", maoDeObra: "400,00", valor: "" }),
    );
    expect(dados.valor).toBe(1200);
    expect(manutencaoSchema.safeParse(dados).success).toBe(true);
  });

  it("rejeita sem veículo e sem nenhum valor", () => {
    expect(
      manutencaoSchema.safeParse(lerManutencaoDoForm(fd({ cavaloId: "", valor: "" }))).success,
    ).toBe(false);
    expect(
      manutencaoSchema.safeParse(lerManutencaoDoForm(fd({ cavaloId: "cav1", valor: "" }))).success,
    ).toBe(false);
  });
});

describe("alertas de manutenção", () => {
  const hoje = new Date("2026-08-02T12:00:00Z");

  it("por data: vencida / próxima / ok / null", () => {
    expect(statusAlertaData(new Date("2026-07-01T12:00:00Z"), hoje)).toBe("vencida");
    expect(statusAlertaData(new Date("2026-08-20T12:00:00Z"), hoje)).toBe("proxima");
    expect(statusAlertaData(new Date("2026-12-01T12:00:00Z"), hoje)).toBe("ok");
    expect(statusAlertaData(null, hoje)).toBeNull();
  });

  it("por km: vencida / próxima / ok / null", () => {
    expect(statusAlertaKm(480000, 485000, 5000)).toBe("vencida"); // já passou
    expect(statusAlertaKm(490000, 486000, 5000)).toBe("proxima"); // faltam 4000
    expect(statusAlertaKm(500000, 480000, 5000)).toBe("ok");
    expect(statusAlertaKm(null, 480000)).toBeNull();
  });

  it("combina data + km pegando o mais urgente", () => {
    // data ok, km vencida → vencida
    expect(
      statusAlertaManutencao(new Date("2026-12-01T12:00:00Z"), 480000, 485000, hoje),
    ).toBe("vencida");
    // data próxima, km ok → proxima
    expect(
      statusAlertaManutencao(new Date("2026-08-20T12:00:00Z"), 500000, 480000, hoje),
    ).toBe("proxima");
    // nada informado → null
    expect(statusAlertaManutencao(null, null, null, hoje)).toBeNull();
  });
});
