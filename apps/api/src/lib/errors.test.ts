import { describe, expect, test } from "bun:test";
import { AppError, toErrorBody } from "./errors";

describe("errors", () => {
  test("AppError carries status and code", () => {
    const err = new AppError(400, "bad_request", "Nope", { field: "x" });
    expect(err.status).toBe(400);
    expect(err.code).toBe("bad_request");
    expect(err.message).toBe("Nope");
    expect(err.details).toEqual({ field: "x" });
  });

  test("toErrorBody maps AppError", () => {
    const mapped = toErrorBody(new AppError(404, "not_found", "Missing"));
    expect(mapped.status).toBe(404);
    expect(mapped.body.code).toBe("not_found");
  });

  test("toErrorBody maps unknown errors to 500", () => {
    const mapped = toErrorBody(new Error("boom"));
    expect(mapped.status).toBe(500);
    expect(mapped.body.code).toBe("internal_error");
  });
});
