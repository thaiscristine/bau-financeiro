import { requireSession } from "@/lib/dal";
import { listCategories } from "@/lib/categories";
import { Page } from "@/components/page";
import { ItemForm } from "../item-form";
import { createItem } from "../actions";

export default async function NewItemPage() {
  await requireSession();
  const categories = await listCategories();

  return (
    <Page title="Novo item">
      <ItemForm
        action={createItem}
        categories={categories}
        costCategories={categories.filter(
          (category) => category.allowsManualEntry && !category.requiresKid
        )}
      />
    </Page>
  );
}
