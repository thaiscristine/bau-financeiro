import Link from "next/link";
import { LogoutButton } from "./logout-button";

export function Nav() {
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-3">
        <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium">
          <Link href="/dashboard">Painel</Link>
          <Link href="/entries">Lançamentos</Link>
          <Link href="/sales">Vendas</Link>
          <Link href="/inventory">Estoque</Link>
          <Link href="/kids">Bandeirantes</Link>
          <Link href="/categories">Categorias</Link>
        </nav>
        <LogoutButton />
      </div>
    </header>
  );
}
