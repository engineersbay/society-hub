export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export function toErrorBody(err: unknown) {
  if (err instanceof AppError) {
    return {
      status: err.status,
      body: { code: err.code, message: err.message, details: err.details },
    };
  }
  console.error(err);
  return {
    status: 500,
    body: { code: "internal_error", message: "Something went wrong" },
  };
}
