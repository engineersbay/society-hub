import { describe, expect, test } from "bun:test";
import { STATUS_LABELS, TYPE_LABELS, statusBadgeClass } from "./complaint-labels";

describe("complaint labels", () => {
  test("maps friendly status copy", () => {
    expect(STATUS_LABELS.open).toBe("In queue");
    expect(STATUS_LABELS.assigned).toBe("Acknowledged");
    expect(TYPE_LABELS.plumbing).toBe("Plumbing");
  });

  test("statusBadgeClass marks open as danger", () => {
    expect(statusBadgeClass("open")).toContain("badge-danger");
    expect(statusBadgeClass("resolved")).toContain("badge-success");
  });
});
