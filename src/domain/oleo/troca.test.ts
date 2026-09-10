import { describe, it, expect } from "vitest";
import { statusTrocaOleo } from "./troca";

describe("statusTrocaOleo", () => {
  it("sem intervalo ou sem última troca = sem_config", () => {
    expect(statusTrocaOleo(null, 100000, 105000).status).toBe("sem_config");
    expect(statusTrocaOleo(10000, null, 105000).status).toBe("sem_config");
  });

  it("em dia quando ainda falta bastante", () => {
    // troca a cada 20.000; última em 100.000 -> próxima 120.000; atual 105.000
    const r = statusTrocaOleo(20000, 100000, 105000);
    expect(r.status).toBe("ok");
    expect(r.proximoKm).toBe(120000);
    expect(r.faltamKm).toBe(15000);
  });

  it("avisa 'trocar em breve' dentro da margem", () => {
    // próxima 120.000; atual 119.500 -> faltam 500 (<=1000)
    const r = statusTrocaOleo(20000, 100000, 119500);
    expect(r.status).toBe("proxima");
    expect(r.faltamKm).toBe(500);
  });

  it("'trocar agora' quando atingiu ou passou o km", () => {
    expect(statusTrocaOleo(20000, 100000, 120000).status).toBe("vencida");
    const r = statusTrocaOleo(20000, 100000, 121000);
    expect(r.status).toBe("vencida");
    expect(r.faltamKm).toBe(-1000);
  });

  it("respeita margem customizada", () => {
    // margem 500: faltam 800 -> ainda ok
    expect(statusTrocaOleo(20000, 100000, 119200, 500).status).toBe("ok");
  });

  it("sem km atual não avalia (ok), mas mostra o km alvo", () => {
    const r = statusTrocaOleo(20000, 100000, null);
    expect(r.status).toBe("ok");
    expect(r.proximoKm).toBe(120000);
    expect(r.faltamKm).toBeNull();
  });
});
