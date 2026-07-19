import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { ZodError } from "zod";
import { env } from "./config";
import { AppError, toErrorBody } from "./lib/errors";
import { authRoutes } from "./modules/auth/routes";
import { adminRoutes, teamRoutes } from "./modules/admin/routes";
import { complaintRoutes, mediaRoutes } from "./modules/complaints/routes";
import {
  buildingRoutes,
  flatRoutes,
  societyRoutes,
  wingRoutes,
} from "./modules/societies/routes";
import { invitationRoutes } from "./modules/invitations/routes";
import { billRoutes } from "./modules/bills/routes";
import { paymentRoutes } from "./modules/payments/routes";
import { noticeRoutes } from "./modules/notices/routes";
import { notificationRoutes } from "./modules/notifications/routes";
import { dashboardRoutes } from "./modules/dashboard/routes";
import { auditAliasRoutes, auditRoutes } from "./modules/audit/routes";
import { profileRoutes } from "./modules/profile/routes";
import {
  assetRoutes,
  bookingRoutes,
  eventRoutes,
  parkingRoutes,
  vendorRoutes,
  visitorRoutes,
} from "./modules/misc/routes";

const app = new Elysia()
  .use(
    cors({
      origin: env.corsOrigin,
      credentials: true,
    }),
  )
  .use(
    swagger({
      path: "/docs",
      documentation: {
        info: {
          title: "SocietyHub API",
          version: "1.0.0",
          description:
            "Mobile-ready JSON API (/v1). Use Authorization: Bearer <accessToken>.",
        },
      },
    }),
  )
  .onError(({ error, set }) => {
    if (error instanceof ZodError) {
      set.status = 400;
      return {
        code: "validation_error",
        message: "Invalid request",
        details: error.flatten(),
      };
    }
    if (error instanceof AppError) {
      set.status = error.status;
      return {
        code: error.code,
        message: error.message,
        details: error.details,
      };
    }
    const mapped = toErrorBody(error);
    set.status = mapped.status;
    return mapped.body;
  })
  .get("/health", () => ({ ok: true, service: "society-hub-api" }))
  .use(authRoutes)
  .use(adminRoutes)
  .use(teamRoutes)
  .use(complaintRoutes)
  .use(mediaRoutes)
  .use(societyRoutes)
  .use(buildingRoutes)
  .use(wingRoutes)
  .use(flatRoutes)
  .use(invitationRoutes)
  .use(billRoutes)
  .use(paymentRoutes)
  .use(noticeRoutes)
  .use(notificationRoutes)
  .use(dashboardRoutes)
  .use(auditRoutes)
  .use(auditAliasRoutes)
  .use(profileRoutes)
  .use(visitorRoutes)
  .use(parkingRoutes)
  .use(bookingRoutes)
  .use(assetRoutes)
  .use(vendorRoutes)
  .use(eventRoutes)
  .listen(env.port);

console.log(
  `SocietyHub API listening on http://localhost:${app.server?.port} (OpenAPI /docs)`,
);

export type App = typeof app;
