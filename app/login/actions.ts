"use server";

import { AuthError } from "next-auth";
import { signIn, signOut, TooManyLoginAttempts } from "@/auth";

export type LoginState =
  | {
      error: string;
      email: string;
      // Set when locked out. `issuedAt` tells two lockouts in a row apart.
      lockout?: { retryAfterSeconds: number; issuedAt: number };
    }
  | undefined;

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get("email");

  try {
    await signIn("credentials", {
      email,
      password: formData.get("password"),
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        error: loginErrorMessage(error),
        // Sent back so the form can refill it after React resets the form.
        email: typeof email === "string" ? email : "",
        lockout:
          error instanceof TooManyLoginAttempts
            ? {
                retryAfterSeconds: error.retryAfterSeconds,
                issuedAt: Date.now(),
              }
            : undefined,
      };
    }
    throw error;
  }
}

function loginErrorMessage(error: AuthError) {
  if (error instanceof TooManyLoginAttempts) {
    const minutes = Math.ceil(error.retryAfterSeconds / 60);
    return `Muitas tentativas de login. Tente novamente em ${minutes} min.`;
  }
  if (error.type === "CredentialsSignin") return "E-mail ou senha inválidos.";
  return "Não foi possível entrar. Tente novamente.";
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}
