import { describe, it, expect } from "vitest";
import {
  criarUsuarioSchema,
  editarUsuarioSchema,
  redefinirSenhaSchema,
} from "./validacao";

describe("criarUsuarioSchema", () => {
  it("aceita dados válidos e normaliza e-mail (trim + minúsculas)", () => {
    const r = criarUsuarioSchema.safeParse({
      nome: "  Maria Silva ",
      email: "  Maria@Empresa.COM  ",
      papel: "gestor",
      senha: "senhaForte1",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.email).toBe("maria@empresa.com");
      expect(r.data.nome).toBe("Maria Silva");
    }
  });

  it("rejeita e-mail inválido", () => {
    const r = criarUsuarioSchema.safeParse({
      nome: "Maria",
      email: "nao-e-email",
      papel: "gestor",
      senha: "senhaForte1",
    });
    expect(r.success).toBe(false);
  });

  it("rejeita senha curta (< 8)", () => {
    const r = criarUsuarioSchema.safeParse({
      nome: "Maria",
      email: "maria@empresa.com",
      papel: "motorista",
      senha: "123",
    });
    expect(r.success).toBe(false);
  });

  it("não permite criar administrador pela tela", () => {
    const r = criarUsuarioSchema.safeParse({
      nome: "Maria",
      email: "maria@empresa.com",
      papel: "admin",
      senha: "senhaForte1",
    });
    expect(r.success).toBe(false);
  });
});

describe("editarUsuarioSchema", () => {
  it("aceita nome e papel válidos", () => {
    expect(
      editarUsuarioSchema.safeParse({ nome: "João", papel: "motorista" }).success,
    ).toBe(true);
  });
});

describe("redefinirSenhaSchema", () => {
  it("exige mínimo de 8 caracteres", () => {
    expect(redefinirSenhaSchema.safeParse({ senha: "1234567" }).success).toBe(false);
    expect(redefinirSenhaSchema.safeParse({ senha: "12345678" }).success).toBe(true);
  });
});
