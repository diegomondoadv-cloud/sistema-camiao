/**
 * Carrega as opções (cavalos, carretas, motoristas, clientes) para os
 * dropdowns do formulário de viagem. Uso apenas no servidor.
 */
import { prisma } from "@/infrastructure/prisma";
import type { Opcao } from "./viagem-form";

export async function carregarOpcoes(): Promise<{
  cavalos: Opcao[];
  carretas: Opcao[];
  motoristas: Opcao[];
  clientes: Opcao[];
}> {
  const [cavalos, carretas, motoristas, clientes] = await Promise.all([
    prisma.cavalo.findMany({
      orderBy: { placa: "asc" },
      select: { id: true, placa: true, marca: true, modelo: true },
    }),
    prisma.carreta.findMany({
      orderBy: { placa: "asc" },
      select: { id: true, placa: true, tipoCarroceria: true },
    }),
    prisma.motorista.findMany({
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
    prisma.cliente.findMany({
      orderBy: { razaoSocial: "asc" },
      select: { id: true, razaoSocial: true },
    }),
  ]);

  return {
    cavalos: cavalos.map((c) => ({
      id: c.id,
      rotulo: [c.placa, c.marca, c.modelo].filter(Boolean).join(" "),
    })),
    carretas: carretas.map((c) => ({
      id: c.id,
      rotulo: [c.placa, c.tipoCarroceria].filter(Boolean).join(" "),
    })),
    motoristas: motoristas.map((m) => ({ id: m.id, rotulo: m.nome })),
    clientes: clientes.map((c) => ({ id: c.id, rotulo: c.razaoSocial })),
  };
}
