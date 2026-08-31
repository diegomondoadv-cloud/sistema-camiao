import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Entrar · Sistema Transportadora",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ senhaAlterada?: string }>;
}) {
  const sessao = await auth();
  if (sessao?.user) redirect("/");

  const { senhaAlterada } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-slate-800">
            Sistema Transportadora
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Acesse com suas credenciais.
          </p>
        </div>

        {senhaAlterada && (
          <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-center text-sm text-emerald-800">
            Senha alterada com sucesso! Por segurança, entre novamente com a
            sua nova senha.
          </p>
        )}

        <LoginForm />
      </div>
    </main>
  );
}
