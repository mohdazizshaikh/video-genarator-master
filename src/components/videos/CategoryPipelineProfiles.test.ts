import { describe, expect, it } from "vitest";
import { CATEGORY_PIPELINE_PROFILES, resolveCategoryPipeline } from "./CategoryPipelineProfiles";

const canonicalCategories = [
  "Tech", "Finance", "Health", "Food", "Fitness", "Travel", "Education",
  "Entertainment", "Sports", "Motivation", "Business", "Science", "Gaming",
  "Beauty", "Parenting", "News", "General", "Marketing", "ITServices",
] as const;

describe("CategoryPipelineProfiles", () => {
  it("covers every canonical category", () => {
    for (const category of canonicalCategories) {
      const profile = resolveCategoryPipeline(category);
      expect(profile.category).toBe(category);
      expect(profile.template).toBeTruthy();
      expect(profile.mediaPrefixes.length).toBeGreaterThan(0);
      expect(profile.ctaStyle).toBeTruthy();
    }
  });

  it("resolves Technology alias without using the News profile", () => {
    expect(resolveCategoryPipeline("Technology").category).toBe("Tech");
    expect(resolveCategoryPipeline("Technology").overlayMode).not.toBe("news");
  });

  it("resolves IT services aliases to the dedicated product showcase", () => {
    expect(resolveCategoryPipeline("IT services").category).toBe("ITServices");
    expect(resolveCategoryPipeline("SaaS marketing").overlayMode).toBe("it-showcase");
    expect(resolveCategoryPipeline("IT products").mediaPrefixes).toContain("software product");
    expect(CATEGORY_PIPELINE_PROFILES.News.overlayMode).toBe("news");
    for (const category of canonicalCategories.filter((value) => value !== "News")) {
      expect(CATEGORY_PIPELINE_PROFILES[category].overlayMode).not.toBe("news");
    }
  });
});
