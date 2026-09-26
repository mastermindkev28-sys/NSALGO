import * as React from "react";

/**
 * Restricted Markdown → React renderer for CMS content. It never emits raw
 * HTML (no dangerouslySetInnerHTML), so editor content cannot inject script.
 * Supported: ## / ### headings, paragraphs, - and 1. lists, > quotes, tables,
 * **bold**, *italic*, `code`, [links](https://…) with a safe-scheme allowlist.
 */
export function safeHref(href: string): string | null {
  const h = href.trim();
  if (/^(https?:)?\/\//i.test(h) || h.startsWith("/") || h.startsWith("#") || /^mailto:/i.test(h)) {
    if (/^\/\//.test(h)) return `https:${h}`;
    return h;
  }
  return null;
}

function inline(text: string, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)\s]+)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = `${keyBase}-${i++}`;
    if (m[2]) out.push(<strong key={k}>{m[2]}</strong>);
    else if (m[4]) out.push(<em key={k}>{m[4]}</em>);
    else if (m[6]) out.push(<code key={k}>{m[6]}</code>);
    else if (m[8] && m[9]) {
      const href = safeHref(m[9]);
      out.push(
        href ? (
          <a key={k} href={href} {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer nofollow" } : {})}>
            {m[8]}
          </a>
        ) : (
          m[8]
        ),
      );
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function renderMarkdown(src: string): React.ReactNode {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (!line.trim()) {
      i++;
      continue;
    }
    const k = `b${key++}`;
    if (line.startsWith("### ")) {
      blocks.push(<h3 key={k}>{inline(line.slice(4), k)}</h3>);
      i++;
    } else if (line.startsWith("## ")) {
      blocks.push(<h2 key={k}>{inline(line.slice(3), k)}</h2>);
      i++;
    } else if (/^\s*[-*] /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*] /.test(lines[i]!)) items.push(lines[i++]!.replace(/^\s*[-*] /, ""));
      blocks.push(
        <ul key={k}>
          {items.map((t, j) => (
            <li key={j}>{inline(t, `${k}-${j}`)}</li>
          ))}
        </ul>,
      );
    } else if (/^\s*\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\. /.test(lines[i]!)) items.push(lines[i++]!.replace(/^\s*\d+\. /, ""));
      blocks.push(
        <ol key={k}>
          {items.map((t, j) => (
            <li key={j}>{inline(t, `${k}-${j}`)}</li>
          ))}
        </ol>,
      );
    } else if (line.startsWith("> ")) {
      const q: string[] = [];
      while (i < lines.length && lines[i]!.startsWith("> ")) q.push(lines[i++]!.slice(2));
      blocks.push(<blockquote key={k}>{inline(q.join(" "), k)}</blockquote>);
    } else if (line.trim().startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i]!.trim().startsWith("|")) {
        const cells = lines[i]!
          .trim()
          .replace(/^\||\|$/g, "")
          .split("|")
          .map((c) => c.trim());
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells);
        i++;
      }
      const [head, ...body] = rows;
      blocks.push(
        <div key={k} className="overflow-x-auto">
          <table>
            {head ? (
              <thead>
                <tr>
                  {head.map((c, j) => (
                    <th key={j}>{inline(c, `${k}-h${j}`)}</th>
                  ))}
                </tr>
              </thead>
            ) : null}
            <tbody>
              {body.map((r, ri) => (
                <tr key={ri}>
                  {r.map((c, j) => (
                    <td key={j}>{inline(c, `${k}-${ri}-${j}`)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
    } else {
      const para: string[] = [];
      while (i < lines.length && lines[i]!.trim() && !/^(#{2,3} |\s*[-*] |\s*\d+\. |> |\|)/.test(lines[i]!)) para.push(lines[i++]!);
      blocks.push(<p key={k}>{inline(para.join(" "), k)}</p>);
    }
  }
  return <>{blocks}</>;
}
