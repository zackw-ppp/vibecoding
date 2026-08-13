import { describe, expect, it } from "vitest";

import { ImportResultSchema } from "@mise/platform-contracts";

import {
  fixtureMediaTextByPath,
  fixtureScenarioDescriptors,
  richImportResultFixture,
  richRecipeFixture,
  richReviewIssuesFixture,
  richSourceBundleFixture,
} from "../src/index";

describe("fixture catalog", () => {
  it("contains the eight PRD regression scenarios exactly once", () => {
    expect(fixtureScenarioDescriptors).toHaveLength(8);
    expect(
      new Set(fixtureScenarioDescriptors.map((scenario) => scenario.id)).size,
    ).toBe(8);
    expect(fixtureScenarioDescriptors.map((scenario) => scenario.id)).toEqual(
      expect.arrayContaining([
        "zh-short-ocr-led",
        "zh-short-narration-led",
        "en-tiktok-style",
        "xiaohongshu-image-post",
        "missing-quantities",
        "multiple-recipes",
        "rapid-cuts-repeated-scenes",
        "long-form-video",
      ]),
    );
  });
});

describe("rich frozen fixture", () => {
  it("validates as a complete import result", () => {
    expect(ImportResultSchema.safeParse(richImportResultFixture).success).toBe(
      true,
    );
    expect(richRecipeFixture.versions).toHaveLength(2);
    expect(richSourceBundleFixture.keyframes).toHaveLength(3);
    expect(richReviewIssuesFixture).toHaveLength(2);
  });

  it("is recursively frozen and keeps unknown amounts null", () => {
    expect(Object.isFrozen(richRecipeFixture)).toBe(true);
    expect(Object.isFrozen(richRecipeFixture.versions[0])).toBe(true);
    const working = richRecipeFixture.versions.find(
      (version) => version.kind === "working",
    );
    const salt = working?.ingredients.find(
      (ingredient) => ingredient.canonicalKey === "salt",
    );
    expect(salt?.quantity.minimum).toBeNull();
    expect(salt?.quantity.originalText).toBe("适量");
    expect(salt?.quantity.suggestedValue).toBeNull();
  });

  it("ships only textual fixture media stand-ins", () => {
    expect(Object.values(fixtureMediaTextByPath)).not.toHaveLength(0);
    for (const payload of Object.values(fixtureMediaTextByPath)) {
      expect(typeof payload).toBe("string");
      expect(payload.length).toBeLessThan(2_000);
    }
  });
});
