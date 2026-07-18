export const env = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl:
    process.env.DATABASE_URL ??
    "mysql://root:1900Summer%40@127.0.0.1:3306/societyhub",
  jwtSecret:
    process.env.JWT_SECRET ?? "dev-change-me-society-hub-jwt-secret-32chars",
  corsOrigin: (process.env.CORS_ORIGIN ?? "http://localhost:5173")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  uploadDir: process.env.UPLOAD_DIR ?? "./uploads",
  publicApiUrl: process.env.PUBLIC_API_URL ?? "http://localhost:3000",
  devAuth: process.env.DEV_AUTH === "true",
  devOtpCode: process.env.DEV_OTP_CODE ?? "123456",
};
