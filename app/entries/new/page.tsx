import { requireSession } from "@/lib/dal";
import { listCategories } from "@/lib/categories";
import { listKids } from "@/lib/kids";
import { Nav } from "@/components/nav";
import { EntryForm } from "../entry-form";
import { createEntry } from "../actions";

export default async function NewEntryPage() {
  await requireSession();
  const [categories, kids] = await Promise.all([listCategories(), listKids()]);

  return (
    <>
      <Nav />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
        <h1 className="text-2xl font-semibold">Novo lançamento</h1>
        <EntryForm action={createEntry} categories={categories} kids={kids} />
      </main>
    </>
  );
}
