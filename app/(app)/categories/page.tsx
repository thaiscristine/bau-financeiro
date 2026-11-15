import { requireSession } from "@/lib/dal";
import { listCategoriesWithUsage } from "@/lib/categories";
import {
  EVENTS_CATEGORY_NAME,
  FIXED_COSTS_CATEGORY_NAME,
  LOCKED_CATEGORY_NAMES,
  SCREEN_CATEGORIES,
  SHOP_CATEGORY_NAME,
} from "@/lib/category-names";
import { Page } from "@/components/page";
import { DeleteButton } from "@/components/delete-button";
import {
  tableCell,
  tableClass,
  tableHeadCell,
  tableHeadRow,
  tableRow,
  tableWrapClass,
} from "@/components/styles";
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
      <div className="flex max-w-2xl flex-col gap-4 font-serif text-[17px] leading-relaxed text-muted">
        <p>
          De onde vem ou para onde vai o dinheiro. Os itens do estoque são todos
          da categoria {SHOP_CATEGORY_NAME}, e o que entra e sai dos eventos
          fica em {EVENTS_CATEGORY_NAME}, assim como os pagamentos dos custos
          fixos ficam em {FIXED_COSTS_CATEGORY_NAME}. Por isso essas três não
          podem ser renomeadas nem excluídas.
        </p>
        <ul className="flex flex-col gap-2">
          <li>
            <span className="text-ink">Exige bandeirante</span>:
            é a contribuição mensal, paga mês a mês na página de cada
            bandeirante. Só uma categoria pode ter esta marca.
          </li>
          <li>
            <span className="text-ink">Só pela tela Lojinha</span>
            : não aparece na nova transação, para que toda venda atualize o estoque.
          </li>
        </ul>
      </div>

      <NewCategoryForm action={createCategory} />

      <div className={tableWrapClass}>
        <table className={tableClass}>
          <thead>
            <tr className={tableHeadRow}>
              <th className={tableHeadCell}>Nome</th>
              <th className={`${tableHeadCell} text-center`}>Exige bandeirante</th>
              <th className={`${tableHeadCell} text-center`}>Só pela tela Lojinha</th>
              <th className={tableHeadCell}>Em uso</th>
              <th className={tableHeadCell}>
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((category) => {
              const isLocked = LOCKED_CATEGORY_NAMES.includes(category.name);
              // Recorded only from its own screen, so its rules don't change
              const screen = SCREEN_CATEGORIES[category.name];
              const inUse = category.entryCount + category.itemCount > 0;
              return (
                <tr key={category.id} className={tableRow}>
                  <td className={tableCell}>
                    {isLocked ? (
                      category.name
                    ) : (
                      <RenameCategoryForm
                        action={renameCategory.bind(null, category.id)}
                        name={category.name}
                      />
                    )}
                  </td>
                  {screen ? (
                    <td colSpan={2} className={`${tableCell} text-center text-muted`}>
                      Só pela tela {screen.screen}
                    </td>
                  ) : (
                    <>
                      <td className={tableCell}>
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
                            disabled={
                              !category.requiresKid &&
                              rows.some((other) => other.requiresKid)
                            }
                          />
                        </div>
                      </td>
                      <td className={tableCell}>
                        <div className="flex justify-center">
                          <RuleToggle
                            action={setCategoryRule.bind(
                              null,
                              category.id,
                              "allowsManualEntry",
                              !category.allowsManualEntry
                            )}
                            checked={!category.allowsManualEntry}
                            label={`${category.name}: só pela tela Lojinha`}
                          />
                        </div>
                      </td>
                    </>
                  )}
                  <td className={`${tableCell} whitespace-nowrap text-muted`}>
                    {usageLabel(category.entryCount, category.itemCount)}
                  </td>
                  <td className={`${tableCell} text-right whitespace-nowrap`}>
                    {!inUse && !isLocked && (
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
    parts.push(`${entryCount} ${entryCount === 1 ? "transação" : "transações"}`);
  }
  if (itemCount > 0) {
    parts.push(`${itemCount} ${itemCount === 1 ? "item" : "itens"}`);
  }
  return parts.length > 0 ? parts.join(", ") : "Não";
}
