import { describe, expect, it } from "vitest";
import { mapResidentCsvRows, parseCsv } from "./resident-csv";

describe("resident-csv", () => {
  it("parses header aliases and validates rows", () => {
    const text = `Name,Mobile,Email,Flat No,Wing,Floor,Parking
Asha,9999999999,asha@example.com,101,A,1,P-1
,8888888888,,102,A,1,
Bad,,x,103,A,2,`;
    const raw = parseCsv(text);
    expect(raw).toHaveLength(3);
    const mapped = mapResidentCsvRows(raw);
    expect(mapped.rows).toHaveLength(1);
    expect(mapped.rows[0]).toMatchObject({
      name: "Asha",
      phone: "9999999999",
      flatNumber: "101",
      wingName: "A",
      floor: 1,
      parkingSlot: "P-1",
    });
    expect(mapped.errors.length).toBeGreaterThanOrEqual(2);
  });

  it("maps owner and profile columns when present", () => {
    const text = `name,phone,flatNumber,isOwner,emergencyContact,vehicleNumber
Bala,8888888888,202,no,9111111111,MH12AB1234`;
    const mapped = mapResidentCsvRows(parseCsv(text));
    expect(mapped.errors).toEqual([]);
    expect(mapped.rows[0]).toMatchObject({
      isOwner: false,
      emergencyContact: "9111111111",
      vehicleNumber: "MH12AB1234",
    });
  });
});
