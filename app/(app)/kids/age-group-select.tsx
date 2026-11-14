"use client";

import { useState } from "react";
import { AGE_GROUPS, AGE_GROUP_LABELS, type AgeGroup } from "@/lib/age-groups";
import { AgeGroupSwatch } from "@/components/age-group";
import { inputClass } from "@/components/styles";

export function AgeGroupSelect({
  id,
  defaultValue,
  onChange,
}: {
  id: string;
  defaultValue?: AgeGroup | null;
  onChange?: (ageGroup: AgeGroup | null) => void;
}) {
  const [ageGroup, setAgeGroup] = useState(defaultValue ?? null);

  return (
    // The chosen age group's color shows inside the select, before its name
    <div className="relative">
      {ageGroup && (
        <AgeGroupSwatch
          ageGroup={ageGroup}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
        />
      )}
      <select
        id={id}
        name={id}
        defaultValue={defaultValue ?? ""}
        onChange={(event) => {
          const value = (event.target.value || null) as AgeGroup | null;
          setAgeGroup(value);
          onChange?.(value);
        }}
        className={`${inputClass} w-full ${ageGroup ? "pl-8" : ""}`}
      >
        <option value="">Não informado</option>
        {AGE_GROUPS.map((group) => (
          <option key={group} value={group}>
            {AGE_GROUP_LABELS[group]}
          </option>
        ))}
      </select>
    </div>
  );
}
