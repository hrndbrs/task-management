"use client";

import { useActionState } from "react";
import { login } from "@/app/actions/auth";

const inputClass =
  "mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 shadow-sm sm:text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 aria-invalid:border-red-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-300 dark:focus:ring-zinc-300";

export function LoginForm({ from }: { from?: string }) {
  const [state, action, pending] = useActionState(login, undefined);
  const emailError = state?.errors?.email?.[0];
  const passwordError = state?.errors?.password?.[0];
  const formMessage = !emailError && !passwordError ? state?.message : undefined;

  return (
    <form action={action} className="mt-8 space-y-5" noValidate>
      {from && <input type="hidden" name="from" value={from} />}

      {formMessage && (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {formMessage}
        </p>
      )}

      <div>
        <label htmlFor="email" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state?.email}
          aria-invalid={!!emailError}
          aria-describedby={emailError ? "email-error" : undefined}
          className={inputClass}
        />
        {emailError && (
          <p id="email-error" className="mt-1 text-sm text-red-600 dark:text-red-400">
            {emailError}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={!!passwordError}
          aria-describedby={passwordError ? "password-error" : undefined}
          className={inputClass}
        />
        {passwordError && (
          <p id="password-error" className="mt-1 text-sm text-red-600 dark:text-red-400">
            {passwordError}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
