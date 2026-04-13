"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PasswordField } from "@/components/auth/PasswordField";
import { isValidEmail, isValidMobile } from "@/lib/validation/contact";
import {
  REGISTER_NAME_MAX_LEN,
  REGISTER_NAME_MIN_LEN,
  REGISTER_PASSWORD_MAX_LEN,
  REGISTER_PASSWORD_MIN_LEN,
} from "@/lib/validation/register-fields";

type ApiSuccess<T> = { success: true; data: T };
type ApiFailure = {
  success: false;
  error: { code: string; message: string };
};

type AvailabilityPayload = {
  emailAvailable?: boolean;
  mobileAvailable?: boolean;
};

function SpinnerIcon() {
  return (
    <span
      className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"
      aria-hidden
    >
      <span
        className="block h-5 w-5 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600 dark:border-zinc-600 dark:border-t-zinc-300"
        role="presentation"
      />
    </span>
  );
}

function GreenCheckIcon() {
  return (
    <span
      className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-600 dark:text-emerald-400"
      aria-hidden
    >
      <svg
        className="h-5 w-5"
        viewBox="0 0 20 20"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clipRule="evenodd"
        />
      </svg>
    </span>
  );
}

const inputWithIconClass =
  "w-full rounded-lg border border-zinc-300 bg-white py-2 pl-3 pr-10 text-base text-zinc-900 outline-none ring-zinc-400 placeholder:text-zinc-400 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500";

export function RegisterForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [mobileAvailable, setMobileAvailable] = useState<boolean | null>(null);
  const [emailChecking, setEmailChecking] = useState(false);
  const [mobileChecking, setMobileChecking] = useState(false);

  useEffect(() => {
    const emailTrim = email.trim();
    if (!emailTrim) {
      setEmailAvailable(null);
      setEmailChecking(false);
      return;
    }
    if (!isValidEmail(emailTrim)) {
      setEmailAvailable(null);
      setEmailChecking(false);
      return;
    }

    setEmailAvailable(null);
    setEmailChecking(true);

    const ac = new AbortController();
    const handle = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/auth/availability?email=${encodeURIComponent(emailTrim)}`,
          { signal: ac.signal },
        );
        const json = (await res.json()) as
          | ApiSuccess<AvailabilityPayload>
          | ApiFailure;
        if (ac.signal.aborted) {
          return;
        }
        if (json.success && typeof json.data.emailAvailable === "boolean") {
          setEmailAvailable(json.data.emailAvailable);
        } else {
          setEmailAvailable(null);
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        if (!ac.signal.aborted) {
          setEmailAvailable(null);
        }
      } finally {
        if (!ac.signal.aborted) {
          setEmailChecking(false);
        }
      }
    }, 420);

    return () => {
      ac.abort();
      window.clearTimeout(handle);
      setEmailChecking(false);
    };
  }, [email]);

  useEffect(() => {
    const mobileTrim = mobile.trim();
    if (!mobileTrim) {
      setMobileAvailable(null);
      setMobileChecking(false);
      return;
    }
    if (!isValidMobile(mobileTrim)) {
      setMobileAvailable(null);
      setMobileChecking(false);
      return;
    }

    setMobileAvailable(null);
    setMobileChecking(true);

    const ac = new AbortController();
    const handle = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/auth/availability?mobile=${encodeURIComponent(mobileTrim)}`,
          { signal: ac.signal },
        );
        const json = (await res.json()) as
          | ApiSuccess<AvailabilityPayload>
          | ApiFailure;
        if (ac.signal.aborted) {
          return;
        }
        if (json.success && typeof json.data.mobileAvailable === "boolean") {
          setMobileAvailable(json.data.mobileAvailable);
        } else {
          setMobileAvailable(null);
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        if (!ac.signal.aborted) {
          setMobileAvailable(null);
        }
      } finally {
        if (!ac.signal.aborted) {
          setMobileChecking(false);
        }
      }
    }, 420);

    return () => {
      ac.abort();
      window.clearTimeout(handle);
      setMobileChecking(false);
    };
  }, [mobile]);

  function validateClient(): string | null {
    const nameTrim = name.trim();
    if (!nameTrim) {
      return "Enter your name.";
    }
    if (nameTrim.length < REGISTER_NAME_MIN_LEN) {
      return `Name must be at least ${REGISTER_NAME_MIN_LEN} characters.`;
    }
    if (nameTrim.length > REGISTER_NAME_MAX_LEN) {
      return `Name must be at most ${REGISTER_NAME_MAX_LEN} characters.`;
    }
    const emailTrim = email.trim();
    const mobileTrim = mobile.trim();
    if (!emailTrim && !mobileTrim) {
      return "Enter an email or a mobile number.";
    }
    if (emailTrim && !isValidEmail(emailTrim)) {
      return "That email does not look valid.";
    }
    if (mobileTrim && !isValidMobile(mobileTrim)) {
      return "Enter a valid 10-digit mobile (e.g. 9876543210 or +91 98765 43210).";
    }
    if (!password) {
      return "Enter your password.";
    }
    if (password.length < REGISTER_PASSWORD_MIN_LEN) {
      return `Password must be at least ${REGISTER_PASSWORD_MIN_LEN} characters.`;
    }
    if (password.length > REGISTER_PASSWORD_MAX_LEN) {
      return `Password must be at most ${REGISTER_PASSWORD_MAX_LEN} characters.`;
    }
    if (password !== confirmPassword) {
      return "Password and confirmation must match.";
    }
    return null;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const clientErr = validateClient();
    if (clientErr) {
      setError(clientErr);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || undefined,
          mobile: mobile.trim() || undefined,
          password,
          confirmPassword,
        }),
      });
      const json = (await res.json()) as ApiSuccess<{ user: unknown }> | ApiFailure;
      if (!json.success) {
        setError(json.error.message);
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      method="post"
      action="/?tab=register"
      onSubmit={onSubmit}
      className="flex w-full flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
        Full name
        <input
          name="name"
          type="text"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jane Doe"
          minLength={REGISTER_NAME_MIN_LEN}
          maxLength={REGISTER_NAME_MAX_LEN}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 outline-none ring-zinc-400 placeholder:text-zinc-400 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500"
        />
      </label>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="register-email"
          className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
        >
          Email
        </label>
        <div className="relative">
          <input
            id="register-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            className={inputWithIconClass}
            aria-busy={emailChecking}
          />
          {emailChecking ? (
            <SpinnerIcon />
          ) : emailAvailable === true ? (
            <GreenCheckIcon />
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="register-mobile"
          className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
        >
          Mobile
        </label>
        <div className="relative">
          <input
            id="register-mobile"
            name="mobile"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            placeholder="9876543210 or +91 98765 43210"
            className={inputWithIconClass}
            aria-busy={mobileChecking}
          />
          {mobileChecking ? (
            <SpinnerIcon />
          ) : mobileAvailable === true ? (
            <GreenCheckIcon />
          ) : null}
        </div>
      </div>

      <PasswordField
        label="Password"
        name="password"
        value={password}
        onChange={setPassword}
        placeholder={`${REGISTER_PASSWORD_MIN_LEN}–${REGISTER_PASSWORD_MAX_LEN} characters`}
        autoComplete="new-password"
        minLength={REGISTER_PASSWORD_MIN_LEN}
        maxLength={REGISTER_PASSWORD_MAX_LEN}
        required
      />

      <PasswordField
        label="Confirm password"
        name="confirmPassword"
        value={confirmPassword}
        onChange={setConfirmPassword}
        placeholder="Re-enter your password"
        autoComplete="new-password"
        minLength={REGISTER_PASSWORD_MIN_LEN}
        maxLength={REGISTER_PASSWORD_MAX_LEN}
        required
      />

      {error ? (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="brand-cta mt-1 inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-medium shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/90 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-900"
      >
        {loading ? "Please wait…" : "Create account"}
      </button>
    </form>
  );
}
