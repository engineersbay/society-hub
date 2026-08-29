export type MysqlConnectOptions = {
  uri: string;
  ssl?: { rejectUnauthorized: true };
};

/** TiDB Cloud requires TLS. Local MySQL Workbench / Docker does not. */
export function mysqlConnectOptions(url: string): MysqlConnectOptions {
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    return { uri: url };
  }
  if (host.endsWith("tidbcloud.com")) {
    return { uri: url, ssl: { rejectUnauthorized: true } };
  }
  return { uri: url };
}
