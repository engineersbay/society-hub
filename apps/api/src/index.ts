import { env } from "./config";
import { createApp } from "./app";

const app = createApp().listen(env.port);

console.log(
  `SocietyHub API listening on http://localhost:${app.server?.port} (OpenAPI /docs)`,
);

export type { App } from "./app";
