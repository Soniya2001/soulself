/**
 * Recursively sanitizes data objects intended for Firestore writes.
 * Strips out any properties that evaluate to JavaScript `undefined`,
 * while strictly preserving `null`, numbers, strings, booleans, Date instances,
 * arrays, and nested objects.
 *
 * NOTE: Does NOT obscure missing required fields—callers should validate
 * required fields before invoking database write functions.
 */
export function sanitizeFirestoreData<T extends Record<string, any>>(obj: T): Record<string, any> {
  if (obj === null || typeof obj !== "object" || obj instanceof Date) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) =>
        typeof item === "object" && item !== null && !(item instanceof Date)
          ? sanitizeFirestoreData(item)
          : item
      );
  }

  const clean: Record<string, any> = {};
  Object.entries(obj).forEach(([key, value]) => {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        clean[key] = value
          .filter((item) => item !== undefined)
          .map((item) =>
            typeof item === "object" && item !== null && !(item instanceof Date)
              ? sanitizeFirestoreData(item)
              : item
          );
      } else if (typeof value === "object" && value !== null && !(value instanceof Date)) {
        clean[key] = sanitizeFirestoreData(value);
      } else {
        clean[key] = value;
      }
    }
  });

  return clean;
}
