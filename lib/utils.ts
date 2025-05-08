import { z } from 'zod';

export const getBaseUrl = () => process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

export function getToken(headers: Headers) {
  return headers.get('authorization')?.split('Bearer ')[1];
}

export function serialize(obj: unknown) {
  if (obj === null || typeof obj !== 'object') {
    throw new TypeError('serialize: input must be a non-null object');
  }
  const str: string[] = [];
  const record = obj as Record<string, unknown>;
  for (const key in record) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      str.push(encodeURIComponent(key) + '=' + encodeURIComponent(String(record[key])));
    }
  }
  return str.join('&');
}

/*
  Parse zod schema for URLSearchParams. Doesn't throw errors for extra (unidentified) keys.
  NOTE: This will support array form like this: `?foo=bar&foo=baz`
*/
export function parseQuery<T extends z.ZodTypeAny>(sp: URLSearchParams, schema: T) {
  const obj: Record<string, string | string[]> = {};
  // parse URLSearchParams into a plain object
  // NOTE: You need to use `coerce` with zod schema to convert string to number, boolean etc..
  for (const [key, value] of sp.entries()) {
    const currentVal = obj[key];
    if (key in obj) {
      if (Array.isArray(currentVal)) {
        currentVal.push(value);
      } else {
        obj[key] = [currentVal, value];
      }
    } else {
      obj[key] = value;
    }
  }
  const result = schema.safeParse(obj);

  if (!result.success) {
    // don't flatten or format here, otherwise we will loose the ability to check instance type.
    throw result.error;
  } else {
    return result.data;
  }
}

export function parseBody<T extends z.ZodTypeAny>(body: z.infer<T> | FormData, schema: T): z.infer<T> {
  let parsedInput: unknown;

  if (body instanceof FormData) {
    const obj: Record<string, unknown> = {};
    for (const [key, value] of body.entries()) {
      // Keep basic boolean/null coercion as it's common in forms
      let processedValue: unknown = value;
      if (typeof value === 'string') {
        if (value === 'true') processedValue = true;
        else if (value === 'false') processedValue = false;
        else if (value === 'null') processedValue = null;
        // Avoid generic number conversion here - let Zod handle it via coerce/preprocess
      }

      const currentVal = obj[key];
      if (key in obj) {
        if (Array.isArray(currentVal)) {
          currentVal.push(processedValue);
        } else {
          obj[key] = [currentVal, processedValue];
        }
      } else {
        obj[key] = processedValue;
      }
    }
    parsedInput = obj;
  } else {
    // If not FormData, assume it's already the correct JSON-like structure
    parsedInput = body;
  }

  const result = schema.safeParse(parsedInput);

  if (!result.success) {
    console.error("Zod Validation Error:", result.error.format());
    console.error("Input given to Zod:", parsedInput);
    throw result.error;
  } else {
    // Explicitly cast the successful result to the inferred schema type
    return result.data as z.infer<T>;
  }
}
