import { describe, it, expect } from "vitest";
import { dedupeCitations, Citation } from "./legal-agent.service";

const citation = (url: string, title = url): Citation => ({ url, title } as Citation);

describe("dedupeCitations", () => {
  it("removes citations that repeat the same URL", () => {
    const result = dedupeCitations([
      citation("https://a.gov.in/1"),
      citation("https://a.gov.in/1"),
      citation("https://a.gov.in/2"),
    ]);
    expect(result.map((c) => c.url)).toEqual(["https://a.gov.in/1", "https://a.gov.in/2"]);
  });

  it("keeps the first occurrence when a URL repeats", () => {
    const first = citation("https://a.gov.in/1", "First title");
    const dup = citation("https://a.gov.in/1", "Different title, same URL");
    const result = dedupeCitations([first, dup]);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("First title");
  });

  it("caps the result at 5 citations", () => {
    const many = Array.from({ length: 12 }, (_, i) => citation(`https://a.gov.in/${i}`));
    const result = dedupeCitations(many);
    expect(result).toHaveLength(5);
  });

  it("returns an empty array unchanged", () => {
    expect(dedupeCitations([])).toEqual([]);
  });

  it("passes through citations that are already unique", () => {
    const unique = [citation("https://a.gov.in/1"), citation("https://a.gov.in/2")];
    expect(dedupeCitations(unique)).toEqual(unique);
  });
});
