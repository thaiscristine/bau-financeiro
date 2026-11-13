import Link from "next/link";
import { LogoutButton } from "./logout-button";

export function Nav() {
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3">
        <nav className="flex gap-4 text-sm font-medium">
          <Link href="/dashboard">Painel</Link>
          <Link href="/entries">Lançamentos</Link>
          <Link href="/entries/new">Novo lançamento</Link>
        </nav>
        <LogoutButton />
      </div>
    </header>
  );
}
