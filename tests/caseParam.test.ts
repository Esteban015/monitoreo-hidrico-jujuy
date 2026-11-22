import { test } from "node:test";
import assert from "node:assert/strict";
import { caseHref, resolveCaseParam } from "../src/lib/caseParam.ts";

const IDS = ["laguna-pozuelos", "dique-las-maderas"] as const;

test("sin parámetro: comportamiento original (null)", () => {
  assert.equal(resolveCaseParam("", IDS), null);
  assert.equal(resolveCaseParam("?otro=1", IDS), null);
});

test("parámetro válido selecciona el caso", () => {
  assert.equal(resolveCaseParam("?case=dique-las-maderas", IDS), "dique-las-maderas");
  assert.equal(resolveCaseParam("case=laguna-pozuelos", IDS), "laguna-pozuelos");
});

test("parámetro inválido o vacío: caso predeterminado sin error", () => {
  assert.equal(resolveCaseParam("?case=no-existe", IDS), "laguna-pozuelos");
  assert.equal(resolveCaseParam("?case=", IDS), "laguna-pozuelos");
  assert.equal(resolveCaseParam("?case=%3Cscript%3E", IDS), "laguna-pozuelos");
  assert.equal(resolveCaseParam("?case=x", []), null);
});

test("enlaces absolutos a la demo", () => {
  assert.equal(caseHref("laguna-pozuelos"), "/demo?case=laguna-pozuelos");
});
