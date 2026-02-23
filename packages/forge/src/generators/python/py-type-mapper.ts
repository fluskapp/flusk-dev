/**
 * TypeScript-to-Python type mapping utilities.
 */

/** Map TypeScript type strings to Python type annotations */
export function toPyType(tsType: string): string {
  return tsType
    .replace(/number\[\]/g, 'list[float]')
    .replace(/string\[\]/g, 'list[str]')
    .replace(/number/g, 'float')
    .replace(/string/g, 'str')
    .replace(/boolean/g, 'bool')
    .replace(/unknown/g, 'Any')
    .replace(/T\[\]/g, 'list[T]')
    .replace(/T \| undefined/g, 'Optional[T]')
    .replace(/undefined/g, 'None')
    .replace(/"[^"]+"/g, 'str')
    .replace(/Map<[^>]+>/g, 'dict');
}
