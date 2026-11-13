import { requireSession } from "@/lib/dal";
import { listCategories } from "@/lib/categories";
import { listKids } from "@/lib/kids";
import { Page } from "@/components/page";
import { EntryForm } from "../entry-form";
import { createEntry } from "../actions";

export default async function NewEntryPage() {
  await requireSession();
  const [categories, kids] = await Promise.all([listCategories(), listKids()]);

  return (
    <Page title="Novo lançamento">
      <EntryForm action={createEntry} categories={categories} kids={kids} />
    </Page>
  );
}
