import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/dal";
import { getEntry } from "@/lib/entries";
import { listCategories } from "@/lib/categories";
import { listKids } from "@/lib/kids";
import { Page } from "@/components/page";
import { EntryForm } from "../../entry-form";
import { updateEntry, deleteEntry } from "../../actions";
import { DeleteButton } from "@/components/delete-button";

export default async function EditEntryPage({
  params,
}: PageProps<"/entries/[id]/edit">) {
  await requireSession();

  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [row, categories, kids] = await Promise.all([
    getEntry(id),
    listCategories(),
    listKids(),
  ]);
  if (!row) notFound();
  // Installment payments and restock purchases are changed from where they came from
  if (row.saleId) redirect(`/sales/${row.saleId}`);
  if (row.itemId) redirect(`/inventory/${row.itemId}`);
  const { entry } = row;

  return (
    <Page title="Editar transação">
      <div className="flex max-w-xl flex-col gap-6">
        <EntryForm
          action={updateEntry.bind(null, id)}
          categories={categories}
          kids={kids}
          entry={entry}
        />
        <DeleteButton
          action={deleteEntry.bind(null, id)}
          label="Excluir transação"
          confirmMessage="Excluir esta transação? Não dá para desfazer."
        />
      </div>
    </Page>
  );
}
