import { describe, it, expect } from "vitest";
import { gerarHashSenha, verificarSenha } from "./password";

describe("password (argon2id)", () => {
  it("gera um hash diferente da senha em texto", async () => {
    const senha = "SenhaForte@123";
    const hash = await gerarHashSenha(senha);
    expect(hash).not.toBe(senha);
    expect(hash.startsWith("$argon2id$")).toBe(true);
  });

  it("gera hashes diferentes para a mesma senha (sal aleatório)", async () => {
    const a = await gerarHashSenha("MesmaSenha@1");
    const b = await gerarHashSenha("MesmaSenha@1");
    expect(a).not.toBe(b);
  });

  it("verifica corretamente a senha certa", async () => {
    const hash = await gerarHashSenha("SenhaForte@123");
    expect(await verificarSenha(hash, "SenhaForte@123")).toBe(true);
  });

  it("rejeita a senha errada", async () => {
    const hash = await gerarHashSenha("SenhaForte@123");
    expect(await verificarSenha(hash, "senhaErrada")).toBe(false);
  });

  it("não lança e retorna false para hash inválido", async () => {
    expect(await verificarSenha("hash-invalido", "qualquer")).toBe(false);
  });
});
