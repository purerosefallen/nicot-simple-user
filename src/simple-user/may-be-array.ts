export type MayBeArray<T> = T | T[];

export function makeArray<T>(value?: MayBeArray<T> | null): T[] {
  if (value == null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}
