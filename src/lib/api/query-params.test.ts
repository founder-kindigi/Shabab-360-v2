import { describe, expect, it } from "vitest";
import {
  optionalDateOnly,
  optionalQueryText,
  paginatedQuerySchema,
  queryParamsToObject,
} from "./query-params";

const listSchema = paginatedQuerySchema().extend({
  search: optionalQueryText(),
});

describe("list query parameters", () => {
  it("uses safe defaults for omitted pagination", () => {
    const result = listSchema.safeParse(queryParamsToObject(new URLSearchParams()));

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ page: 1, pageSize: 20 });
    }
  });

  it("rejects malformed pagination instead of passing NaN to Prisma", () => {
    const result = listSchema.safeParse(
      queryParamsToObject(new URLSearchParams("page=not-a-number&pageSize=0"))
    );

    expect(result.success).toBe(false);
  });

  it("trims short searches and rejects oversized searches", () => {
    const valid = listSchema.safeParse(
      queryParamsToObject(new URLSearchParams("search=%20ali%20"))
    );
    const tooLong = listSchema.safeParse(
      queryParamsToObject(new URLSearchParams(`search=${"a".repeat(101)}`))
    );

    expect(valid.success && valid.data.search).toBe("ali");
    expect(tooLong.success).toBe(false);
  });

  it("accepts calendar dates but rejects impossible dates", () => {
    const dateSchema = paginatedQuerySchema().extend({ date: optionalDateOnly() });
    const valid = dateSchema.safeParse(
      queryParamsToObject(new URLSearchParams("date=2024-02-29"))
    );
    const invalid = dateSchema.safeParse(
      queryParamsToObject(new URLSearchParams("date=2024-02-30"))
    );

    expect(valid.success).toBe(true);
    expect(invalid.success).toBe(false);
  });
});
