import { requireSession } from "@/lib/dal";
import { Page } from "@/components/page";
import { KidForm } from "../kid-form";
import { createKid } from "../actions";

export default async function NewKidPage() {
  await requireSession();

  return (
    <Page title="Novo bandeirante">
      <KidForm action={createKid} />
    </Page>
  );
}
