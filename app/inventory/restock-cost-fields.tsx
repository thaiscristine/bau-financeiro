import type { Category } from "@/db/schema";
import { Field } from "@/components/form";
import { hintClass, inputClass, panelClass } from "@/components/styles";

// What the organization paid for a restock. `categories` are the ones a cost
// entry can use.
export function RestockCostFields({
  categories,
  costLabel = "Valor pago (R$)",
}: {
  categories: Category[];
  costLabel?: string;
}) {
  const defaultCostCategory =
    categories.find((category) => category.name === "Fornecedores") ??
    categories[0];

  return (
    <div className={panelClass}>
      <p className={hintClass}>
        Se a organização pagou por estes itens, informe o valor: a saída é
        registrada nas transações. Deixe em branco para itens doados.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="cost" label={costLabel}>
          <input
            id="cost"
            name="cost"
            type="number"
            step="0.01"
            min="0.01"
            className={inputClass}
          />
        </Field>
        <Field id="supplier" label="Fornecedor">
          <input id="supplier" name="supplier" className={inputClass} />
        </Field>
      </div>
      <Field id="costCategoryId" label="Categoria da saída">
        <select
          id="costCategoryId"
          name="costCategoryId"
          defaultValue={defaultCostCategory?.id}
          className={inputClass}
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </Field>
    </div>
  );
}
