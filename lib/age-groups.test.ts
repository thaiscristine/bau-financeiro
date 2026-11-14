import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAgeGroupFilter } from "./age-groups";

test("parseAgeGroupFilter reads age groups and the no-group filter", () => {
  assert.equal(parseAgeGroupFilter("b1"), "b1");
  assert.equal(parseAgeGroupFilter("coordenacao"), "coordenacao");
  assert.equal(parseAgeGroupFilter("sem"), "sem");
  assert.equal(parseAgeGroupFilter(["guias", "b2"]), "guias");
});

test("parseAgeGroupFilter falls back to everyone", () => {
  for (const value of [undefined, "", "B1", "todos", "toString", []]) {
    assert.equal(parseAgeGroupFilter(value), null, `value: ${JSON.stringify(value)}`);
  }
});
