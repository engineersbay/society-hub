/** Parse a simple CSV (header row required). Supports quoted fields. */
export function parseCsv(text: string): Record<string, string>[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]!).map((h) =>
    h.trim().toLowerCase().replace(/\s+/g, ""),
  );
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = (cells[i] ?? "").trim();
    });
    return row;
  });
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

const HEADER_ALIASES: Record<string, string> = {
  name: "name",
  residentname: "name",
  phone: "phone",
  mobile: "phone",
  email: "email",
  flat: "flatNumber",
  flatnumber: "flatNumber",
  flatno: "flatNumber",
  wing: "wingName",
  wingname: "wingName",
  floor: "floor",
  parking: "parkingSlot",
  parkingslot: "parkingSlot",
  parkingslotnumber: "parkingSlot",
  isowner: "isOwner",
  owner: "isOwner",
  emergencycontact: "emergencyContact",
  emergency: "emergencyContact",
  vehicle: "vehicleNumber",
  vehiclenumber: "vehicleNumber",
  vehicle_no: "vehicleNumber",
};

function parseBool(value: string | undefined): boolean | undefined {
  if (value == null || value === "") return undefined;
  const v = value.trim().toLowerCase();
  if (["1", "true", "yes", "y", "owner"].includes(v)) return true;
  if (["0", "false", "no", "n", "tenant"].includes(v)) return false;
  return undefined;
}

export type ResidentCsvRow = {
  name: string;
  phone: string;
  email?: string | null;
  flatNumber: string;
  wingName?: string | null;
  floor?: number | null;
  parkingSlot?: string | null;
  isOwner?: boolean;
  emergencyContact?: string | null;
  vehicleNumber?: string | null;
};

export type ResidentCsvParseResult = {
  rows: ResidentCsvRow[];
  errors: Array<{ row: number; message: string }>;
};

/** Map raw CSV rows into API import shape with client-side validation. */
export function mapResidentCsvRows(
  raw: Record<string, string>[],
): ResidentCsvParseResult {
  const rows: ResidentCsvRow[] = [];
  const errors: Array<{ row: number; message: string }> = [];

  raw.forEach((rawRow, idx) => {
    const rowNum = idx + 2; // header is line 1
    const mapped: Record<string, string> = {};
    for (const [key, value] of Object.entries(rawRow)) {
      const canon = HEADER_ALIASES[key.replace(/\s+/g, "").toLowerCase()];
      if (canon) mapped[canon] = value;
    }

    if (!mapped.name) {
      errors.push({ row: rowNum, message: "Missing name" });
      return;
    }
    if (!mapped.phone || mapped.phone.replace(/\D/g, "").length < 10) {
      errors.push({ row: rowNum, message: "Phone must be at least 10 digits" });
      return;
    }
    if (!mapped.flatNumber) {
      errors.push({ row: rowNum, message: "Missing flat number" });
      return;
    }
    if (mapped.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mapped.email)) {
      errors.push({ row: rowNum, message: "Invalid email" });
      return;
    }

    let floor: number | null = null;
    if (mapped.floor) {
      const n = Number(mapped.floor);
      if (!Number.isInteger(n) || n < 0) {
        errors.push({ row: rowNum, message: "Floor must be a non-negative integer" });
        return;
      }
      floor = n;
    }

    const isOwner = parseBool(mapped.isOwner);

    const row: ResidentCsvRow = {
      name: mapped.name,
      phone: mapped.phone.replace(/\D/g, "").slice(-12),
      email: mapped.email || null,
      flatNumber: mapped.flatNumber,
      wingName: mapped.wingName || null,
      floor,
      parkingSlot: mapped.parkingSlot || null,
      isOwner: isOwner ?? true,
    };
    if (mapped.emergencyContact !== undefined && mapped.emergencyContact !== "") {
      row.emergencyContact = mapped.emergencyContact;
    }
    if (mapped.vehicleNumber !== undefined && mapped.vehicleNumber !== "") {
      row.vehicleNumber = mapped.vehicleNumber;
    }
    rows.push(row);
  });

  return { rows, errors };
}
