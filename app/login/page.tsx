import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16">
      <div className="flex w-full max-w-sm flex-col gap-8 border border-line bg-surface p-8">
        <div className="flex flex-col items-center gap-4">
          <Logo className="h-32" />
          <h1 className="text-[32px] leading-none tracking-[-0.04em]">
            Baú Financeiro
          </h1>
        </div>
        <LoginForm />
      </div>
      <ThemeToggle />
    </main>
  );
}
