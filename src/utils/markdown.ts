/**
 * Lightweight, zero-dependency Markdown to HTML parser
 * Sanitizes raw HTML input to avoid XSS vulnerabilities.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function parseInline(text: string): string {
  let out = escapeHtml(text);

  // Inline code: `code`
  out = out.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-surface-container font-mono text-[12px] text-primary border border-outline-variant">$1</code>');

  // Bold & Italic: ***text*** or ___text___
  out = out.replace(/(\*\*\*|___)(.*?)\1/g, '<strong><em>$2</em></strong>');

  // Bold: **text** or __text__
  out = out.replace(/(\*\*|__)(.*?)\1/g, '<strong class="font-semibold text-on-surface">$2</strong>');

  // Italic: *text* or _text_
  out = out.replace(/(\*|_)(.*?)\1/g, '<em class="italic">$2</em>');

  // Strikethrough: ~~text~~
  out = out.replace(/~~(.*?)~~/g, '<del class="line-through opacity-70">$1</del>');

  // Checkbox items: [ ] or [x]
  out = out.replace(/^\[ \]\s+/g, '<input type="checkbox" disabled class="mr-2 align-middle accent-primary" /> ');
  out = out.replace(/^\[x\]\s+/gi, '<input type="checkbox" checked disabled class="mr-2 align-middle accent-primary" /> ');

  // Links: [text](url)
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:opacity-80 inline-flex items-center gap-0.5">$1</a>');

  return out;
}

export function renderMarkdown(md: string): string {
  if (!md || !md.trim()) return '<p class="text-on-surface-variant italic">Empty note</p>';

  const lines = md.split(/\r\n|\r|\n/);
  const result: string[] = [];
  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeLines: string[] = [];
  let inUl = false;
  let inOl = false;
  let inTable = false;
  let tableRows: string[] = [];

  function closeLists() {
    if (inUl) {
      result.push('</ul>');
      inUl = false;
    }
    if (inOl) {
      result.push('</ol>');
      inOl = false;
    }
  }

  function flushTable() {
    if (!inTable) return;
    if (tableRows.length > 0) {
      let html = '<div class="overflow-x-auto my-3"><table class="w-full text-left text-xs font-mono border-collapse border border-outline-variant">';
      tableRows.forEach((row, idx) => {
        const cols = row.split('|').filter((_, cIdx, arr) => cIdx > 0 && cIdx < arr.length - 1);
        if (idx === 0) {
          html += '<thead><tr class="bg-surface-container border-b border-outline-variant">';
          cols.forEach((col) => {
            html += `<th class="px-3 py-2 font-semibold text-on-surface">${parseInline(col.trim())}</th>`;
          });
          html += '</tr></thead><tbody>';
        } else if (idx === 1 && row.includes('---')) {
          // delimiter row, ignore
        } else {
          html += '<tr class="border-b border-outline-variant/60 hover:bg-surface-container/50">';
          cols.forEach((col) => {
            html += `<td class="px-3 py-2 text-on-surface-variant">${parseInline(col.trim())}</td>`;
          });
          html += '</tr>';
        }
      });
      html += '</tbody></table></div>';
      result.push(html);
    }
    tableRows = [];
    inTable = false;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Fenced Code Block start/end
    if (line.trim().startsWith('```')) {
      closeLists();
      flushTable();
      if (inCodeBlock) {
        // End code block
        const escapedCode = escapeHtml(codeLines.join('\n'));
        const langHeader = codeBlockLang
          ? `<div class="bg-surface-container-high px-3 py-1 text-[10px] font-mono text-on-surface-variant border-b border-outline-variant font-medium">${escapeHtml(codeBlockLang)}</div>`
          : '';
        result.push(
          `<div class="my-3 rounded-lg overflow-hidden border border-outline-variant bg-surface-container-lowest font-mono text-xs">` +
            langHeader +
            `<pre class="p-3 overflow-x-auto text-on-surface leading-relaxed"><code>${escapedCode}</code></pre>` +
          `</div>`
        );
        inCodeBlock = false;
        codeLines = [];
        codeBlockLang = '';
      } else {
        inCodeBlock = true;
        codeBlockLang = line.trim().slice(3).trim();
        codeLines = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // Markdown Table Detection
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      closeLists();
      inTable = true;
      tableRows.push(line.trim());
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Headings (#, ##, ###, ####, #####, ######)
    const headerMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headerMatch) {
      closeLists();
      const level = headerMatch[1].length;
      const text = parseInline(headerMatch[2]);
      const classes = [
        '',
        'text-2xl font-bold tracking-tight text-on-surface mt-6 mb-3 pb-1 border-b border-outline-variant font-mono',
        'text-xl font-bold text-on-surface mt-5 mb-2.5 font-mono',
        'text-lg font-semibold text-on-surface mt-4 mb-2 font-mono',
        'text-base font-semibold text-on-surface mt-3 mb-1.5 font-mono',
        'text-sm font-semibold text-on-surface mt-3 mb-1 font-mono',
        'text-xs font-semibold text-on-surface-variant mt-2 mb-1 uppercase tracking-wider font-mono',
      ][level];
      result.push(`<h${level} class="${classes}">${text}</h${level}>`);
      continue;
    }

    // Horizontal Rule
    if (/^(---|___|\*\*\*)\s*$/.test(line.trim())) {
      closeLists();
      result.push('<hr class="my-6 border-t border-outline-variant" />');
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      closeLists();
      const quoteText = parseInline(line.slice(2));
      result.push(`<blockquote class="border-l-4 border-primary pl-4 py-1 my-2 text-on-surface-variant italic text-sm">${quoteText}</blockquote>`);
      continue;
    }

    // Unordered List (- or *)
    const ulMatch = line.match(/^(\s*)[-*]\s+(.*)$/);
    if (ulMatch) {
      if (inOl) {
        result.push('</ol>');
        inOl = false;
      }
      if (!inUl) {
        result.push('<ul class="list-disc list-inside space-y-1 my-2 text-sm text-on-surface">');
        inUl = true;
      }
      result.push(`<li class="leading-relaxed">${parseInline(ulMatch[2])}</li>`);
      continue;
    }

    // Ordered List (1. )
    const olMatch = line.match(/^(\s*)\d+\.\s+(.*)$/);
    if (olMatch) {
      if (inUl) {
        result.push('</ul>');
        inUl = false;
      }
      if (!inOl) {
        result.push('<ol class="list-decimal list-inside space-y-1 my-2 text-sm text-on-surface">');
        inOl = true;
      }
      result.push(`<li class="leading-relaxed">${parseInline(olMatch[2])}</li>`);
      continue;
    }

    // If blank line
    if (!line.trim()) {
      closeLists();
      continue;
    }

    // Paragraph
    closeLists();
    result.push(`<p class="my-2 leading-relaxed text-sm text-on-surface">${parseInline(line)}</p>`);
  }

  closeLists();
  flushTable();

  // If unclosed code block
  if (inCodeBlock && codeLines.length > 0) {
    const escapedCode = escapeHtml(codeLines.join('\n'));
    result.push(
      `<div class="my-3 rounded-lg overflow-hidden border border-outline-variant bg-surface-container-lowest font-mono text-xs">` +
        `<pre class="p-3 overflow-x-auto text-on-surface leading-relaxed"><code>${escapedCode}</code></pre>` +
      `</div>`
    );
  }

  return result.join('\n');
}
