import { z } from "zod";

export const MAX_LIST_PAGE = 10_000;
export const MAX_LIST_OFFSET = 1_000_000;
export const MAX_SEARCH_QUERY_LENGTH = 100;
export const MAX_IDENTIFIER_LENGTH = 128;

function emptyStringToUndefined(value: unknown) {
  return typeof value === "string" && value.trim() === "" ? undefined : value;
}

export function optionalQueryText(maxLength = MAX_SEARCH_QUERY_LENGTH) {
  return z.preprocess(
    emptyStringToUndefined,
    z.string().trim().min(1).max(maxLength).optional()
  );
}

export function optionalIdentifier() {
  return optionalQueryText(MAX_IDENTIFIER_LENGTH);
}

export function optionalInteger(minimum: number, maximum: number) {
  return z.preprocess(
    emptyStringToUndefined,
    z.coerce.number().int().min(minimum).max(maximum).optional()
  );
}

export function optionalDateOnly() {
  return z.preprocess(
    emptyStringToUndefined,
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a date in YYYY-MM-DD format")
      .refine(isCalendarDate, "Expected a valid calendar date")
      .optional()
  );
}

export function paginatedQuerySchema(options?: {
  defaultPageSize?: number;
  maxPageSize?: number;
}) {
  const defaultPageSize = options?.defaultPageSize ?? 20;
  const maxPageSize = options?.maxPageSize ?? 100;

  return z.object({
    page: z.preprocess(
      emptyStringToUndefined,
      z.coerce.number().int().min(1).max(MAX_LIST_PAGE).default(1)
    ),
    pageSize: z.preprocess(
      emptyStringToUndefined,
      z.coerce.number().int().min(1).max(maxPageSize).default(defaultPageSize)
    ),
  });
}

export function queryParamsToObject(searchParams: URLSearchParams) {
  return Object.fromEntries(searchParams.entries());
}

export function queryValidationError(error: z.ZodError) {
  return {
    error: "Invalid query parameters",
    fields: error.flatten().fieldErrors,
  };
}

function isCalendarDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}
