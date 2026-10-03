import { describe, expect, it } from "bun:test";
import { applyDiscountToPaise } from "./platform-coupon";

describe("applyDiscountToPaise", () => {
  it("keeps integer paise for percent off", () => {
    expect(
      applyDiscountToPaise({ amountPaise: 49900, percentOff: 10, flatOffPaise: null }),
    ).toBe(44910);
  });

  it("applies flat paise without going negative", () => {
    expect(
      applyDiscountToPaise({ amountPaise: 500, percentOff: null, flatOffPaise: 800 }),
    ).toBe(0);
  });

  it("prefers percent when both are set", () => {
    expect(
      applyDiscountToPaise({ amountPaise: 10000, percentOff: 50, flatOffPaise: 100 }),
    ).toBe(5000);
  });
});
