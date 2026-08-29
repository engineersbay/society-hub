import { describe, expect, test } from "bun:test";
import { mysqlConnectOptions } from "./mysql-connect";

describe("mysqlConnectOptions", () => {
  test("keeps local MySQL as a URI without TLS", () => {
    const url = "mysql://root:secret@127.0.0.1:3306/societyhub";
    expect(mysqlConnectOptions(url)).toEqual({ uri: url });
  });

  test("enables TLS for TiDB Cloud hosts", () => {
    const url =
      "mysql://user:pass@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/societyhub";
    expect(mysqlConnectOptions(url)).toEqual({
      uri: url,
      ssl: { rejectUnauthorized: true },
    });
  });
});
