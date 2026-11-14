import { logout } from "@/app/login/actions";

export function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="text-[15px] text-ink transition-colors hover:text-muted"
      >
        Sair
      </button>
    </form>
  );
}
