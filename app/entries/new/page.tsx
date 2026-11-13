import { requireSession } from "@/lib/dal";
import { Nav } from "@/components/nav";
import { EntryForm } from "./entry-form";

export default async function NewEntryPage() {
  await requireSession();

  return (
    <>
      <Nav />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
        <h1 className="text-2xl font-semibold">Novo lançamento</h1>
        <EntryForm />
      </main>
    </>
  );
}
