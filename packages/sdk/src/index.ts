import type {
  AuthTokens,
  ComplaintDto,
  FlatDto,
  Paginated,
  UserDto,
  ApiErrorBody,
} from "@society-hub/types";

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public body: ApiErrorBody,
  ) {
    super(body.message);
  }
}

export type SocietyHubClientOptions = {
  baseUrl: string;
  getAccessToken?: () => string | null;
  getRefreshToken?: () => string | null;
  onTokens?: (tokens: AuthTokens) => void;
};

export function createSocietyHubClient(opts: SocietyHubClientOptions) {
  async function request<T>(
    path: string,
    init: RequestInit = {},
    auth = true,
  ): Promise<T> {
    const headers = new Headers(init.headers);
    if (!headers.has("Content-Type") && !(init.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }
    if (auth) {
      const token = opts.getAccessToken?.();
      if (token) headers.set("Authorization", `Bearer ${token}`);
    }

    let res = await fetch(`${opts.baseUrl}${path}`, { ...init, headers });

    if (res.status === 401 && auth && opts.getRefreshToken) {
      const refreshed = await tryRefresh();
      if (refreshed) {
        headers.set("Authorization", `Bearer ${refreshed.accessToken}`);
        res = await fetch(`${opts.baseUrl}${path}`, { ...init, headers });
      }
    }

    if (!res.ok) {
      let body: ApiErrorBody = {
        code: "http_error",
        message: res.statusText,
      };
      try {
        body = (await res.json()) as ApiErrorBody;
      } catch {
        /* ignore */
      }
      throw new ApiClientError(res.status, body);
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  async function tryRefresh(): Promise<AuthTokens | null> {
    const refreshToken = opts.getRefreshToken?.();
    if (!refreshToken) return null;
    try {
      const tokens = await request<AuthTokens>(
        "/v1/auth/refresh",
        {
          method: "POST",
          body: JSON.stringify({ refreshToken }),
        },
        false,
      );
      opts.onTokens?.(tokens);
      return tokens;
    } catch {
      return null;
    }
  }

  return {
    requestOtp: (phone: string) =>
      request<{ ok: true; devCode?: string }>(
        "/v1/auth/otp/request",
        { method: "POST", body: JSON.stringify({ phone }) },
        false,
      ),
    verifyOtp: (phone: string, code: string) =>
      request<{ user: UserDto; tokens: AuthTokens }>(
        "/v1/auth/otp/verify",
        { method: "POST", body: JSON.stringify({ phone, code }) },
        false,
      ),
    loginPin: (phone: string, pin: string) =>
      request<{ user: UserDto; tokens: AuthTokens }>(
        "/v1/auth/pin/login",
        { method: "POST", body: JSON.stringify({ phone, pin }) },
        false,
      ),
    loginPassword: (email: string, password: string) =>
      request<{ user: UserDto; tokens: AuthTokens }>(
        "/v1/auth/password/login",
        { method: "POST", body: JSON.stringify({ email, password }) },
        false,
      ),
    forgotPassword: (email: string) =>
      request<{ ok: true; devCode?: string }>(
        "/v1/auth/password/forgot",
        { method: "POST", body: JSON.stringify({ email }) },
        false,
      ),
    resetPassword: (email: string, code: string, newPassword: string) =>
      request<{ ok: true }>(
        "/v1/auth/password/reset",
        {
          method: "POST",
          body: JSON.stringify({ email, code, newPassword }),
        },
        false,
      ),
    changePassword: (currentPassword: string, newPassword: string) =>
      request<{ ok: true }>("/v1/auth/password/change", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
    loginGoogle: (idToken: string) =>
      request<{ user: UserDto; tokens: AuthTokens }>(
        "/v1/auth/google",
        { method: "POST", body: JSON.stringify({ idToken }) },
        false,
      ),
    setPin: (pin: string) =>
      request<{ ok: true }>("/v1/auth/pin", {
        method: "POST",
        body: JSON.stringify({ pin }),
      }),
    refresh: (refreshToken: string) =>
      request<AuthTokens>(
        "/v1/auth/refresh",
        { method: "POST", body: JSON.stringify({ refreshToken }) },
        false,
      ),
    me: () => request<UserDto>("/v1/auth/me"),
    logout: (refreshToken: string) =>
      request<{ ok: true }>("/v1/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      }),
    listFlats: () => request<FlatDto[]>("/v1/admin/flats"),
    onboardResident: (body: {
      name: string;
      phone: string;
      flatId: string;
      email?: string | null;
    }) =>
      request<{ user: UserDto }>("/v1/admin/residents", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    listComplaints: (page = 1, limit = 20) =>
      request<Paginated<ComplaintDto>>(
        `/v1/complaints?page=${page}&limit=${limit}`,
      ),
    getComplaint: (id: string) =>
      request<ComplaintDto>(`/v1/complaints/${id}`),
    createComplaint: (body: {
      title: string;
      type: string;
      typeOtherText?: string | null;
      description: string;
    }) =>
      request<ComplaintDto>("/v1/complaints", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    updateComplaintStatus: (id: string, status: string) =>
      request<ComplaintDto>(`/v1/complaints/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    uploadAttachment: async (complaintId: string, file: File) => {
      const form = new FormData();
      form.append("file", file);
      return request<ComplaintDto>(
        `/v1/complaints/${complaintId}/attachments`,
        { method: "POST", body: form },
      );
    },
  };
}

export type SocietyHubClient = ReturnType<typeof createSocietyHubClient>;
