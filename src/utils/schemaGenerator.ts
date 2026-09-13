/**
 * Client-side utility for generating JSON Schema (Draft 7) and TypeScript types
 * directly from raw JSON data.
 */

export function generateJsonSchema(data: any): string {
  function inferSchema(val: any): any {
    if (val === null) {
      return { type: 'null' };
    }

    if (Array.isArray(val)) {
      if (val.length === 0) {
        return {
          type: 'array',
          items: {},
        };
      }
      // Infer item schema based on array elements
      const itemSchemas = val.map(inferSchema);
      // If all items share the same single type, simplify
      const types = Array.from(new Set(itemSchemas.map((s) => s.type)));
      if (types.length === 1 && types[0] !== 'object') {
        return {
          type: 'array',
          items: itemSchemas[0],
        };
      }
      return {
        type: 'array',
        items: itemSchemas[0] || {},
      };
    }

    const type = typeof val;

    if (type === 'object') {
      const properties: Record<string, any> = {};
      const required: string[] = [];

      for (const [k, v] of Object.entries(val)) {
        properties[k] = inferSchema(v);
        required.push(k);
      }

      return {
        type: 'object',
        properties,
        required,
        additionalProperties: true,
      };
    }

    if (type === 'number') {
      return { type: Number.isInteger(val) ? 'integer' : 'number' };
    }

    if (type === 'string') {
      // Check for ISO date string
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
        return { type: 'string', format: 'date-time' };
      }
      if (/^https?:\/\//.test(val)) {
        return { type: 'string', format: 'uri' };
      }
      return { type: 'string' };
    }

    if (type === 'boolean') {
      return { type: 'boolean' };
    }

    return { type: 'string' };
  }

  const rootSchema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'GeneratedSchema',
    ...inferSchema(data),
  };

  return JSON.stringify(rootSchema, null, 2);
}

export function generateTypeScriptTypes(data: any, rootName = 'Root'): string {
  const interfaces: string[] = [];
  const visitedNames = new Set<string>();

  function toPascalCase(str: string): string {
    return str
      .replace(/[^a-zA-Z0-9_]/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join('') || 'Type';
  }

  function getUniqueName(baseName: string): string {
    let name = toPascalCase(baseName);
    if (!visitedNames.has(name)) {
      visitedNames.add(name);
      return name;
    }
    let counter = 2;
    while (visitedNames.has(`${name}${counter}`)) {
      counter++;
    }
    const unique = `${name}${counter}`;
    visitedNames.add(unique);
    return unique;
  }

  function inferType(val: any, propName: string): string {
    if (val === null) return 'null';
    if (val === undefined) return 'any';

    if (Array.isArray(val)) {
      if (val.length === 0) return 'any[]';
      const itemType = inferType(val[0], propName.endsWith('s') ? propName.slice(0, -1) : `${propName}Item`);
      return itemType.includes(' | ') ? `(${itemType})[]` : `${itemType}[]`;
    }

    if (typeof val === 'object') {
      const interfaceName = getUniqueName(propName);
      const lines: string[] = [];

      for (const [k, v] of Object.entries(val)) {
        const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : JSON.stringify(k);
        const childType = inferType(v, k);
        lines.push(`  ${safeKey}: ${childType};`);
      }

      interfaces.push(`export interface ${interfaceName} {\n${lines.join('\n')}\n}`);
      return interfaceName;
    }

    if (typeof val === 'number') return 'number';
    if (typeof val === 'boolean') return 'boolean';
    if (typeof val === 'string') return 'string';

    return 'any';
  }

  inferType(data, rootName);

  return interfaces.join('\n\n');
}
