/**
 * Endpoint público de "saúde" (health check).
 * Serve para um monitor externo (ex.: UptimeRobot) pingar de tempos em tempos
 * e manter o app (Render) e o banco (Supabase) ACORDADOS — evitando o cold
 * start. Faz uma consulta trivial ao banco para exercitar a conexão.
 */
import { prisma } from "@/infrastructure/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ ok: true, hora: new Date().toISOString() });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
