import { notFound } from "next/navigation";
import { requireSession } from "@/lib/dal";
import { getEntry } from "@/lib/entries";
import { Nav } from "@/components/nav";
import { EntryForm } from "../../entry-form";
import { updateEntry, deleteEntry } from "../../actions";
import { DeleteEntryButton } from "../../delete-entry-button";

export default async function EditEntryPage({
  params,
}: PageProps<"/entries/[id]/edit">) {
  await requireSession();

  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const entry = await getEntry(id);
  if (!entry) notFound();

  return (
    <>
      <Nav />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
        <h1 className="text-2xl font-semibold">Editar lançamento</h1>
        <EntryForm action={updateEntry.bind(null, id)} entry={entry} />
        <DeleteEntryButton action={deleteEntry.bind(null, id)} />
      </main>
    </>
  );
}
