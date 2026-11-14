import { requireSession } from "@/lib/dal";
import { listActiveUsers } from "@/lib/users";
import { Page, Section } from "@/components/page";
import { DeleteButton } from "@/components/delete-button";
import {
  tableCell,
  tableClass,
  tableHeadCell,
  tableHeadRow,
  tableRow,
  tableWrapClass,
} from "@/components/styles";
import { createUser, deleteUser } from "./actions";
import { NewUserForm } from "./new-user-form";

export default async function UsersPage() {
  const session = await requireSession();
  const rows = await listActiveUsers();
  const currentUserId = Number(session.user.id);

  return (
    <Page title="Usuários">
      <p className="max-w-2xl font-serif text-[17px] leading-relaxed text-muted">
        Quem pode entrar no sistema. Ao excluir um usuário, ele perde o acesso na
        hora, mas as transações e vendas que registrou continuam no histórico.
      </p>

      <div className={tableWrapClass}>
        <table className={tableClass}>
          <thead>
            <tr className={tableHeadRow}>
              <th className={tableHeadCell}>Nome</th>
              <th className={`${tableHeadCell} max-sm:hidden`}>E-mail</th>
              <th className={tableHeadCell}>
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((user) => (
              <tr key={user.id} className={tableRow}>
                <td className={tableCell}>
                  {user.name}
                  {/* On phones the e-mail goes under the name instead of its own column */}
                  <span className="block text-[13px] break-all text-muted sm:hidden">
                    {user.email}
                  </span>
                </td>
                <td className={`${tableCell} text-muted max-sm:hidden`}>{user.email}</td>
                <td className={`${tableCell} text-right whitespace-nowrap`}>
                  {user.id === currentUserId ? (
                    <span className="text-muted">Você</span>
                  ) : (
                    <DeleteButton
                      action={deleteUser.bind(null, user.id)}
                      label="Excluir"
                      confirmMessage={`Excluir o usuário "${user.name}"? Ele não vai mais conseguir entrar.`}
                      variant="link"
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Section title="Novo usuário">
        <NewUserForm action={createUser} />
      </Section>
    </Page>
  );
}
