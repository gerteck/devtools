export interface TextStats {
  lines: number;
  words: number;
  chars: number;
  bytes: number;
  readingTime: string;
}

export function getTextStats(text: string): TextStats {
  if (!text) {
    return { lines: 0, words: 0, chars: 0, bytes: 0, readingTime: '0 min' };
  }

  const lines = text.split(/\r\n|\r|\n/).length;
  const wordsMatch = text.match(/\S+/g);
  const words = wordsMatch ? wordsMatch.length : 0;
  const chars = text.length;
  const bytes = new TextEncoder().encode(text).length;
  const minutes = Math.ceil(words / 200);
  const readingTime = minutes <= 1 ? '< 1 min' : `${minutes} min`;

  return { lines, words, chars, bytes, readingTime };
}

// Case Conversions
export function toUpperCase(text: string): string {
  return text.toUpperCase();
}

export function toLowerCase(text: string): string {
  return text.toLowerCase();
}

export function toTitleCase(text: string): string {
  return text.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
  );
}

export function toCamelCase(text: string): string {
  return text
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (letter, index) =>
      index === 0 ? letter.toLowerCase() : letter.toUpperCase()
    )
    .replace(/[\s\-_]+/g, '');
}

export function toSnakeCase(text: string): string {
  return text
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s\-]+/g, '_')
    .toLowerCase();
}

export function toKebabCase(text: string): string {
  return text
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

// Line Utilities
export function sortLinesAsc(text: string): string {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  return text
    .split(eol)
    .sort((a, b) => a.localeCompare(b))
    .join(eol);
}

export function sortLinesDesc(text: string): string {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  return text
    .split(eol)
    .sort((a, b) => b.localeCompare(a))
    .join(eol);
}

export function removeDuplicateLines(text: string): string {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(eol);
  return Array.from(new Set(lines)).join(eol);
}

export function stripEmptyLines(text: string): string {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  return text
    .split(eol)
    .filter((line) => line.trim().length > 0)
    .join(eol);
}

export function trimWhitespace(text: string): string {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  return text
    .split(eol)
    .map((line) => line.trim())
    .join(eol);
}

export function reverseLines(text: string): string {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  return text.split(eol).reverse().join(eol);
}

// Encoding / Decoding Utilities
export function base64Encode(text: string): string {
  try {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  } catch (err) {
    throw new Error('Base64 encoding failed: ' + (err instanceof Error ? err.message : String(err)));
  }
}

export function base64Decode(text: string): string {
  try {
    const binary = atob(text.trim());
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch (err) {
    throw new Error('Invalid Base64 input: ' + (err instanceof Error ? err.message : String(err)));
  }
}

export function urlEncode(text: string): string {
  return encodeURIComponent(text);
}

export function urlDecode(text: string): string {
  try {
    return decodeURIComponent(text);
  } catch (err) {
    throw new Error('Invalid URL-encoded string: ' + (err instanceof Error ? err.message : String(err)));
  }
}
