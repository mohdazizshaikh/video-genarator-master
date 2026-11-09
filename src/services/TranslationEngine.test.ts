import axios from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TranslationEngine } from "./TranslationEngine";
afterEach(() => vi.restoreAllMocks());
describe("translation isolation and truthful failures", () => {
  it("separates full inputs and tenants while retaining same-input caching", async () => {
    const post = vi
      .spyOn(axios, "post")
      .mockResolvedValueOnce({ data: { translatedText: "private A suffix" } })
      .mockResolvedValueOnce({ data: { translatedText: "private B suffix" } })
      .mockResolvedValueOnce({
        data: { translatedText: "other tenant result" },
      });
    const engine = new TranslationEngine("https://translation.example.invalid");
    const prefix = "Shared introduction ".repeat(4);
    expect(
      (await engine.translate(prefix + "A", "hi", "en", "A")).translated,
    ).toBe("private A suffix");
    expect(
      (await engine.translate(prefix + "B", "hi", "en", "A")).translated,
    ).toBe("private B suffix");
    expect(
      (await engine.translate(prefix + "A", "hi", "en", "B")).translated,
    ).toBe("other tenant result");
    expect((await engine.translate(prefix + "A", "hi", "en", "A")).engine).toBe(
      "cache",
    );
    expect(post).toHaveBeenCalledTimes(3);
  });
  it("does not present a language prefix or unchanged source as successful fallback", async () => {
    vi.spyOn(axios, "post").mockRejectedValue(new Error("upstream offline"));
    await expect(
      new TranslationEngine().translate("An actual sentence", "hi", "en", "A"),
    ).rejects.toThrow("not translated");
  });
  it("rejects invalid and excessive requests before any upstream call", async () => {
    const post = vi.spyOn(axios, "post");
    const engine = new TranslationEngine();
    await expect(
      engine.translate("x".repeat(5001), "hi", "en", "A"),
    ).rejects.toThrow(/5000/);
    await expect(
      engine.translateBatch(Array(31).fill("text"), "hi", "en", "A"),
    ).rejects.toThrow(/1–30/);
    expect(post).not.toHaveBeenCalled();
  });
});
