import { AGE_GROUPS, AGE_GROUP_LABELS, type AgeGroup } from "@/lib/age-groups";
import { inputClass } from "@/components/styles";

export function AgeGroupSelect({
  id,
  defaultValue,
}: {
  id: string;
  defaultValue?: AgeGroup | null;
}) {
  return (
    <select id={id} name={id} defaultValue={defaultValue ?? ""} className={inputClass}>
      <option value="">Não informado</option>
      {AGE_GROUPS.map((group) => (
        <option key={group} value={group}>
          {AGE_GROUP_LABELS[group]}
        </option>
      ))}
    </select>
  );
}
