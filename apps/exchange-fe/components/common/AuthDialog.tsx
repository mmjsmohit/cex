"use client";

import type { FormEvent } from "react";
import { useState, useTransition } from "react";

import { signInRequest, signUpRequest } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/useAuthStore";

type AuthMode = "signin" | "signup";

type AuthDialogProps = {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onOpenChange: (open: boolean) => void;
};

const COPY: Record<
  AuthMode,
  {
    title: string;
    description: string;
    submitLabel: string;
    alternatePrompt: string;
    alternateAction: string;
    alternateMode: AuthMode;
  }
> = {
  signin: {
    title: "Log in",
    description: "Access your exchange account to place and manage trades.",
    submitLabel: "Log In",
    alternatePrompt: "Need an account?",
    alternateAction: "Sign Up",
    alternateMode: "signup",
  },
  signup: {
    title: "Sign up",
    description: "Create your account, then continue into the login flow.",
    submitLabel: "Create Account",
    alternatePrompt: "Already have an account?",
    alternateAction: "Log In",
    alternateMode: "signin",
  },
};

export default function AuthDialog({
  mode,
  onModeChange,
  onOpenChange,
}: AuthDialogProps) {
  const signIn = useAuthStore((state) => state.signIn);
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const copy = COPY[mode];

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    startTransition(async () => {
      try {
        if (mode === "signin") {
          const jwt = await signInRequest({
            username,
            password,
          });
          signIn(jwt);
          setPassword("");
          onOpenChange(false);
          return;
        }

        const message = await signUpRequest({
          username,
          name,
          password,
        });

        setSuccessMessage(message);
        setPassword("");
        setName("");
        onModeChange("signin");
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Something went wrong.",
        );
      }
    });
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{copy.title}</DialogTitle>
        <DialogDescription>{copy.description}</DialogDescription>
      </DialogHeader>

      <form className="grid gap-4" onSubmit={handleSubmit}>
        {mode === "signup" ? (
          <Field>
            <FieldLabel htmlFor="auth-name">Full name</FieldLabel>
            <FieldContent>
              <Input
                id="auth-name"
                name="name"
                autoComplete="name"
                placeholder="Satoshi Nakamoto"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={isPending}
                required
              />
            </FieldContent>
          </Field>
        ) : null}

        <Field>
          <FieldLabel htmlFor="auth-username">Username</FieldLabel>
          <FieldContent>
            <Input
              id="auth-username"
              name="username"
              autoComplete="username"
              placeholder="petipack-trader"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              disabled={isPending}
              required
            />
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel htmlFor="auth-password">Password</FieldLabel>
          <FieldContent>
            <Input
              id="auth-password"
              name="password"
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isPending}
              required
            />
          </FieldContent>
        </Field>

        {successMessage ? (
          <FieldDescription className="rounded-3xl bg-muted px-4 py-3 text-foreground">
            {successMessage}
          </FieldDescription>
        ) : null}

        {errorMessage ? <FieldError>{errorMessage}</FieldError> : null}

        <DialogFooter className="mt-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Please wait..." : copy.submitLabel}
          </Button>
        </DialogFooter>
      </form>

      <p className="text-sm text-muted-foreground">
        {copy.alternatePrompt}{" "}
        <button
          type="button"
          className="font-medium text-foreground underline underline-offset-4 transition-opacity hover:opacity-70"
          onClick={() => {
            setErrorMessage("");
            setSuccessMessage("");
            onModeChange(copy.alternateMode);
          }}
          disabled={isPending}
        >
          {copy.alternateAction}
        </button>
      </p>
    </DialogContent>
  );
}
