const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

export const AUTH_TOKEN_KEY = "cex-jwt";

type ApiErrorShape = {
  message?: string;
};

export type SignInInput = {
  username: string;
  password: string;
};

export type SignUpInput = {
  username: string;
  name: string;
  password: string;
};

export async function signInRequest(input: SignInInput) {
  const response = await fetch(`${API_BASE_URL}/signin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const payload = await parseJson<ApiErrorShape & { jwt?: string }>(response);

  if (!response.ok || !payload.jwt) {
    throw new Error(payload.message ?? "Unable to log in");
  }

  return payload.jwt;
}

export async function signUpRequest(input: SignUpInput) {
  const response = await fetch(`${API_BASE_URL}/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const payload = await parseJson<ApiErrorShape & { message?: string }>(response);

  if (!response.ok) {
    throw new Error(payload.message ?? "Unable to sign up");
  }

  return payload.message ?? "Account created successfully. Please log in.";
}

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!text) {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}
