import { describe, expect, it } from "vitest";
import {
  listContentTemplates,
  pickTemplateChrome,
  resolveContentTemplate,
} from "./ContentTemplateEngine";

const scenes = (texts: string[]): Array<{ text: string }> =>
  texts.map((text) => ({ text }));

describe("ContentTemplateEngine", () => {
  it("resolves breaking template from content signals", () => {
    const template = resolveContentTemplate({
      category: "News",
      scenes: scenes(["Breaking news just in - urgent update on the election results."]),
    });
    expect(template.structure).toBe("breaking");
    expect(template.introFlash).toBe(true);
    expect(template.introFlashText).toBe("BREAKING");
  });

  it("resolves listicle from numbered list pattern and keywords", () => {
    const template = resolveContentTemplate({
      category: "Finance",
      scenes: scenes([
        "Top 5 ways to save money this year.",
        "1. Start with a budget. 2. Cut subscriptions. 3. Automate savings.",
      ]),
    });
    expect(template.structure).toBe("listicle");
    expect(template.chromeKind).toBe("step-chip");
  });

  it("resolves listicle from bare numbering without list keywords", () => {
    const template = resolveContentTemplate({
      category: "Tech",
      scenes: scenes(["1. Use a password manager. 2. Enable 2FA everywhere."]),
    });
    expect(template.structure).toBe("listicle");
  });

  it("resolves quiz from signal keywords", () => {
    const template = resolveContentTemplate({
      category: "Education",
      scenes: scenes(["Quiz time - can you guess the correct answer?"]),
    });
    expect(template.structure).toBe("quiz");
    expect(template.chromeKind).toBe("countdown");
  });

  it("resolves beforeafter from comparison signals", () => {
    const template = resolveContentTemplate({
      category: "Health",
      scenes: scenes(["The before and after transformation of this workout plan."]),
    });
    expect(template.structure).toBe("beforeafter");
    expect(template.chromeKind).toBe("split-label");
  });

  it("resolves brainrot for addictive-format content", () => {
    const template = resolveContentTemplate({
      category: "Entertainment",
      scenes: scenes(["Oddly satisfying remix that loops forever."]),
    });
    expect(template.structure).toBe("brainrot");
  });

  it("falls back to family preference when no signals match", () => {
    const sports = resolveContentTemplate({
      category: "Sports",
      scenes: scenes(["The team won the final match tonight."]),
    });
    expect(sports.structure).toBe("listicle");

    const tech = resolveContentTemplate({
      category: "Tech",
      scenes: scenes(["A new chip architecture is coming."]),
    });
    expect(tech.structure).toBe("explainer");

    const news = resolveContentTemplate({
      category: "News",
      scenes: scenes(["A general update on the world today."]),
    });
    expect(news.structure).toBe("breaking");
  });

  it("resolves marketing content to the brand showcase template", () => {
    const template = resolveContentTemplate({
      category: "Marketing",
      family: "Marketing",
      scenes: [
        { headline: "Digital solutions for business growth", text: "Aaditech Solution helps businesses with practical digital services.", subcategory: "Company profile" },
      ],
    });
    expect(template.id).toBe("marketing");
    expect(template.structure).toBe("marketing");
  });

  it("falls back to story for unknown genre", () => {
    const template = resolveContentTemplate({
      category: "Random",
      scenes: scenes(["Something without any known structure."]),
    });
    expect(template.structure).toBe("story");
  });

  it("allows explicit override", () => {
    const template = resolveContentTemplate({
      category: "News",
      scenes: scenes(["Plain text, no signals."]),
      override: "quiz",
    });
    expect(template.structure).toBe("quiz");
  });

  it("picker produces correct chrome for step-chip counts", () => {
    const listicle = resolveContentTemplate({
      category: "Finance",
      scenes: scenes(["Top 5 tips."]),
    });
    expect(pickTemplateChrome(listicle, 2, 5)).toMatchObject({
      showChip: true,
      chipText: "TOP 3/5",
    });
    expect(pickTemplateChrome(listicle, 0, 5).introFlashText).toBe("TOP");
  });

  it("listContentTemplates returns all known templates", () => {
    const ids = listContentTemplates().map((t) => t.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "breaking",
        "listicle",
        "quiz",
        "beforeafter",
        "brainrot",
        "explainer",
        "marketing",
        "story",
      ]),
    );
  });
});