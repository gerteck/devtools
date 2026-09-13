/**
 * Pure generator for Chris Nielsen's classic JSON Table Visualization HTML.
 * Generates the exact nested HTML table structure:
 * <output class="HTML" id="jsonOutput">
 *   <table id="p0" class="OBJ">
 *     <caption>[-] Object, N properties</caption>
 *     <tbody>
 *       <tr id="px1"><th>key</th><td><span id="p1" title="String" class="STRING">val</span></td></tr>
 *     </tbody>
 *   </table>
 * </output>
 */

export interface JsonHtmlOptions {
  truncate?: boolean;
  detectDates?: boolean;
}

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(isoStr: string): string {
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;

  const pad = (n: number) => (n < 10 ? '0' + n : String(n));
  const hours = d.getHours();
  const hh12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const ampm = hours >= 12 ? 'PM' : 'AM';

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(hh12)}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${ampm}`;
}

export function generateChrisNielsenHtml(data: any, options: JsonHtmlOptions = {}): string {
  let idCounter = 0;

  function renderValue(val: any, pathId: number): string {
    if (val === null) {
      return `<span id="p${pathId}" title="null" class="NULL">null</span>`;
    }

    if (val === undefined) {
      return `<span id="p${pathId}" title="undefined" class="UNDEF">undefined</span>`;
    }

    const type = typeof val;

    if (type === 'boolean') {
      return `<span id="p${pathId}" title="Boolean" class="BOOL">${val ? 'true' : 'false'}</span>`;
    }

    if (type === 'number') {
      return `<span id="p${pathId}" title="Number" class="NUMBER">${val}</span>`;
    }

    if (type === 'string') {
      if (val.length === 0) {
        return `<span id="p${pathId}" title="String" class="EMPTY">[zero-length string]</span>`;
      }

      if (options.detectDates && ISO_DATE_REGEX.test(val)) {
        const formatted = formatDate(val);
        return `<span id="p${pathId}" title="Date" class="DATE">${escapeHtml(formatted)}</span>`;
      }

      let text = val;
      if (options.truncate && text.length > 70) {
        text = text.substring(0, 70) + '\u2026';
      }

      return `<span id="p${pathId}" title="String" class="STRING">${escapeHtml(text)}</span>`;
    }

    if (Array.isArray(val)) {
      return renderArray(val, pathId);
    }

    if (type === 'object') {
      return renderObject(val, pathId);
    }

    return `<span id="p${pathId}" title="Unknown" class="STRING">${escapeHtml(String(val))}</span>`;
  }

  function renderArray(arr: any[], tableId: number): string {
    if (arr.length === 0) {
      return `<span id="p${tableId}" title="Array" class="ARRAY">[ Empty Array ]</span>`;
    }

    const itemsCountText = `${arr.length} ${arr.length === 1 ? 'item' : 'items'}`;
    const rows: string[] = [];

    for (let i = 0; i < arr.length; i++) {
      const rowId = ++idCounter;
      const val = arr[i];
      const isComplex = val !== null && typeof val === 'object';
      const cellId = isComplex ? ++idCounter : rowId;
      const renderedCell = renderValue(val, cellId);

      rows.push(`<tr id="p${rowId}"><th>${i}</th><td>${renderedCell}</td></tr>`);
    }

    return `<table id="p${tableId}" class="ARRAY"><caption>[-] Array, ${itemsCountText}</caption><tbody>${rows.join('')}</tbody></table>`;
  }

  function renderObject(obj: Record<string, any>, tableId: number): string {
    const keys = Object.keys(obj);
    if (keys.length === 0) {
      return `<span id="p${tableId}" title="Object" class="OBJ">{ Empty Object }</span>`;
    }

    const propsCountText = `${keys.length} ${keys.length === 1 ? 'property' : 'properties'}`;
    const rows: string[] = [];

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const rowId = ++idCounter;
      const val = obj[key];
      const isComplex = val !== null && typeof val === 'object';
      const cellId = isComplex ? ++idCounter : rowId;
      const renderedCell = renderValue(val, cellId);

      rows.push(`<tr id="px${rowId}"><th>${escapeHtml(key)}</th><td>${renderedCell}</td></tr>`);
    }

    return `<table id="p${tableId}" class="OBJ"><caption>[-] Object, ${propsCountText}</caption><tbody>${rows.join('')}</tbody></table>`;
  }

  const rootId = idCounter;
  const innerHtml = renderValue(data, rootId);

  return `<output style="display: block;" for="jsonInput jsonStrict jsonEval json2HTML json2JSON jsonTrunc jsonDate jsonData jsonSpace" id="jsonOutput" class="HTML">${innerHtml}</output>`;
}

/**
 * Builds a standalone exportable HTML document with embedded CSS.
 */
export function generateStandaloneHtmlDocument(htmlBody: string, theme: 'classic' | 'modern' = 'classic'): string {
  if (theme === 'classic') {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>JSON Visualization</title>
<style>
body {
  text-align: left;
  margin: 1em;
  background-color: #193441;
  color: #FCFFF5;
  font-family: Consolas, "Courier New", monospace;
  font-size: 13px;
}
caption {
  text-align: left;
  font-family: small-caption, Consolas, sans-serif;
  margin-bottom: 2px;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
  font-size: 11px;
  color: #B0C4DE;
}
caption:hover {
  color: #FFFFFF;
  text-decoration: underline;
}
table {
  border-collapse: collapse;
  margin-bottom: 0;
  font-family: inherit;
}
th, td {
  border: 1px solid #4a6d7c;
  vertical-align: top;
  padding: 2px 6px;
  line-height: 1.4;
}
th {
  text-align: left;
  font-weight: normal;
  color: #B0C4DE;
  background-color: rgba(0, 0, 0, 0.15);
}
table.OBJ { background-color: #22353C; }
table.ARRAY { background-color: #252C47; }
tr:hover { background-color: #7B243E; }
.STRING { color: #D8FFB0; }
.NUMBER { color: #7FFF00; }
.BOOL { color: #00FFFF; }
.NULL, .UNDEF, .EMPTY { color: #91AA9D; font-style: italic; }
.DATE { color: #6495ED; }
.ARRAY { color: #91AA9D; font-style: italic; }
.OBJ { color: #91AA9D; font-style: italic; }
</style>
</head>
<body>
${htmlBody}
<script>
document.addEventListener('click', function(e) {
  var caption = e.target.closest('caption');
  if (!caption) return;
  var table = caption.parentNode;
  var isExpanded = caption.innerText.indexOf('[-]') !== -1;
  for (var i = 0; i < table.tBodies.length; i++) {
    table.tBodies[i].style.display = isExpanded ? 'none' : '';
  }
  caption.innerHTML = (isExpanded ? '[+]' : '[-]') + caption.innerHTML.substring(3);
});
</script>
</body>
</html>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>JSON Visualization</title>
<style>
body {
  margin: 1.5rem;
  background-color: #18181b;
  color: #f4f4f5;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
}
caption {
  text-align: left;
  margin-bottom: 4px;
  font-size: 11px;
  font-weight: 600;
  color: #a1a1aa;
  cursor: pointer;
  user-select: none;
}
caption:hover { color: #818cf8; }
table {
  border-collapse: collapse;
  margin-bottom: 0;
  border-radius: 6px;
  overflow: hidden;
}
th, td {
  border: 1px solid #27272a;
  vertical-align: top;
  padding: 3px 8px;
  line-height: 1.5;
}
th {
  text-align: left;
  font-weight: 500;
  color: #93c5fd;
  background-color: rgba(255, 255, 255, 0.02);
}
table.OBJ { background-color: #18181b; }
table.ARRAY { background-color: #1f1f23; }
tr:hover { background-color: rgba(99, 102, 241, 0.15); }
.STRING { color: #4ade80; }
.NUMBER { color: #f59e0b; }
.BOOL { color: #c084fc; font-weight: 600; }
.NULL, .UNDEF, .EMPTY { color: #71717a; font-style: italic; }
.DATE { color: #38bdf8; }
</style>
</head>
<body>
${htmlBody}
<script>
document.addEventListener('click', function(e) {
  var caption = e.target.closest('caption');
  if (!caption) return;
  var table = caption.parentNode;
  var isExpanded = caption.innerText.indexOf('[-]') !== -1;
  for (var i = 0; i < table.tBodies.length; i++) {
    table.tBodies[i].style.display = isExpanded ? 'none' : '';
  }
  caption.innerHTML = (isExpanded ? '[+]' : '[-]') + caption.innerHTML.substring(3);
});
</script>
</body>
</html>`;
}
