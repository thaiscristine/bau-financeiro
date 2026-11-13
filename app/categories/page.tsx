import { requireSession } from "@/lib/dal";
import { listCategoriesWithUsage } from "@/lib/categories";
import { Page } from "@/components/page";
import { DeleteButton } from "@/components/delete-button";
import { tableHeadCell, tableHeadRow, tableRow } from "@/components/styles";
import {
  createCategory,
  deleteCategory,
  renameCategory,
  setCategoryRule,
} from "./actions";
import { NewCategoryForm, RenameCategoryForm, RuleToggle } from "./category-forms";

export default async function CategoriesPage() {
  await requireSession();
  const rows = await listCategoriesWithUsage();

  return (
    <Page title="Categorias">
      <p className="max-w-xl text-sm text-zinc-500">
        De onde vem ou para onde vai o dinheiro. As categorias são usadas nos
        lançamentos e nos itens do estoque.
      </p>
      <ul className="max-w-xl list-disc pl-5 text-sm text-zinc-500">
        <li>
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Exige bandeirante</span>:
          o lançamento precisa dizer de qual bandeirante veio o dinheiro, como na
          contribuição mensal.
        </li>
        <li>
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            Só pela tela Vendas
          </span>
          : não aparece no novo lançamento, para que toda venda atualize o estoque.
        </li>
      </ul>

      <NewCategoryForm action={createCategory} />

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className={tableHeadRow}>
              <th className={tableHeadCell}>Nome</th>
              <th className={`${tableHeadCell} text-center`}>Exige bandeirante</th>
              <th className={`${tableHeadCell} text-center`}>Só pela tela Vendas</th>
              <th className={tableHeadCell}>Em uso</th>
              <th className="py-2">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((category) => {
              const inUse = category.entryCount + category.itemCount > 0;
              return (
                <tr key={category.id} className={tableRow}>
                  <td className="py-2 pr-4">
                    <RenameCategoryForm
                      action={renameCategory.bind(null, category.id)}
                      name={category.name}
                    />
                  </td>
                  <td className="py-2 pr-4">
                    <div className="flex justify-center">
                      <RuleToggle
                        action={setCategoryRule.bind(
                          null,
                          category.id,
                          "requiresKid",
                          !category.requiresKid
                        )}
                        checked={category.requiresKid}
                        label={`${category.name}: exige bandeirante`}
                      />
                    </div>
                  </td>
                  <td className="py-2 pr-4">
                    <div className="flex justify-center">
                      <RuleToggle
                        action={setCategoryRule.bind(
                          null,
                          category.id,
                          "allowsManualEntry",
                          !category.allowsManualEntry
                        )}
                        checked={!category.allowsManualEntry}
                        label={`${category.name}: só pela tela Vendas`}
                      />
                    </div>
                  </td>
                  <td className="py-2 pr-4 whitespace-nowrap text-zinc-500">
                    {usageLabel(category.entryCount, category.itemCount)}
                  </td>
                  <td className="py-2 text-right whitespace-nowrap">
                    {!inUse && (
                      <DeleteButton
                        action={deleteCategory.bind(null, category.id)}
                        label="Excluir"
                        confirmMessage={`Excluir a categoria "${category.name}"?`}
                        variant="link"
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Page>
  );
}

function usageLabel(entryCount: number, itemCount: number) {
  const parts = [];
  if (entryCount > 0) {
    parts.push(`${entryCount} ${entryCount === 1 ? "lançamento" : "lançamentos"}`);
  }
  if (itemCount > 0) {
    parts.push(`${itemCount} ${itemCount === 1 ? "item" : "itens"}`);
  }
  return parts.length > 0 ? parts.join(", ") : "Não";
}
