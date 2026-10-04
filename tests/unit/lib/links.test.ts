import { describe, expect, it } from "vitest";

import { findLinks, linkLabel } from "@/lib/links";

describe("findLinks", () => {
  it("finds an http and an https link", () => {
    expect(findLinks("a http://a.com/x and https://b.org")).toEqual([
      "http://a.com/x",
      "https://b.org",
    ]);
  });

  it("adds https to a bare www link", () => {
    expect(findLinks("see www.example.com/page")).toEqual([
      "https://www.example.com/page",
    ]);
  });

  it("leaves out the punctuation that ends a sentence", () => {
    expect(findLinks("Go to https://a.com/x.")).toEqual(["https://a.com/x"]);
    expect(findLinks("https://a.com/x, then https://b.com!")).toEqual([
      "https://a.com/x",
      "https://b.com",
    ]);
  });

  it("drops a closing bracket the link never opened", () => {
    expect(findLinks("(see https://a.com/x)")).toEqual(["https://a.com/x"]);
  });

  it("keeps a closing bracket that belongs to the link", () => {
    expect(findLinks("https://en.wikipedia.org/wiki/Foo_(bar)")).toEqual([
      "https://en.wikipedia.org/wiki/Foo_(bar)",
    ]);
  });

  it("lists a repeated link once", () => {
    expect(findLinks("https://a.com https://a.com")).toEqual(["https://a.com"]);
  });

  it("ignores other schemes and plain text", () => {
    expect(findLinks("javascript:alert(1) ftp://a.com mailto:a@b.c")).toEqual(
      [],
    );
    expect(findLinks("")).toEqual([]);
  });

  it("finds a link on its own line of a longer note", () => {
    expect(findLinks("Buy milk\nhttps://shop.example/milk\nthanks")).toEqual([
      "https://shop.example/milk",
    ]);
  });
});

describe("linkLabel", () => {
  it("shows host and path without the scheme or www", () => {
    expect(linkLabel("https://www.example.com/a/b")).toBe("example.com/a/b");
  });

  it("drops a trailing slash", () => {
    expect(linkLabel("https://example.com/")).toBe("example.com");
    expect(linkLabel("https://example.com/a/")).toBe("example.com/a");
  });

  it("shortens a long link", () => {
    const label = linkLabel(`https://example.com/${"a".repeat(80)}`);
    expect(label).toHaveLength(40);
    expect(label.endsWith("…")).toBe(true);
  });
});
