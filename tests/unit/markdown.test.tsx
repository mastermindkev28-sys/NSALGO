import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { renderMarkdown, safeHref } from "@/lib/markdown";

describe("CMS markdown renderer", () => {
  it("renders headings, lists, emphasis and tables", () => {
    const html = renderToStaticMarkup(<>{renderMarkdown("## Title\n\n- **bold** item\n- `code`\n\n| a | b |\n|---|---|\n| 1 | 2 |")}</>);
    expect(html).toContain("<h2>Title</h2>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<td>1</td>");
  });

  it("never emits raw HTML or script", () => {
    const html = renderToStaticMarkup(<>{renderMarkdown("<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>")}</>);
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;script&gt;");
  });

  it("blocks javascript: links", () => {
    expect(safeHref("javascript:alert(1)")).toBeNull();
    const html = renderToStaticMarkup(<>{renderMarkdown("[x](javascript:alert(1)) [ok](https://sec.gov)")}</>);
    expect(html).not.toContain("javascript:");
    expect(html).toContain('href="https://sec.gov"');
  });
});
