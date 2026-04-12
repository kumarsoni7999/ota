"use client";

import Image from "next/image";
import { useState } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";

type Tab = "signin" | "register";

type Props = {
  initialTab: Tab;
};

export function AuthTabs({ initialTab }: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <div className="flex flex-col items-center gap-3">
        <Image
          src="/app-icon.png"
          alt="Sthanave OTA"
          width={72}
          height={72}
          priority
          className="h-[72px] w-[72px] rounded-2xl object-contain shadow-sm"
        />
        <p className="text-center text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Sthanave OTA
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Account"
        className="flex rounded-full border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-700 dark:bg-zinc-800"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "signin"}
          className={`flex-1 rounded-full px-4 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-100 dark:focus-visible:ring-offset-zinc-800 ${
            tab === "signin"
              ? "brand-cta shadow-sm"
              : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          }`}
          onClick={() => setTab("signin")}
        >
          Sign in
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "register"}
          className={`flex-1 rounded-full px-4 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-100 dark:focus-visible:ring-offset-zinc-800 ${
            tab === "register"
              ? "brand-cta shadow-sm"
              : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          }`}
          onClick={() => setTab("register")}
        >
          Register
        </button>
      </div>

      {tab === "signin" ? <LoginForm /> : <RegisterForm />}
    </div>
  );
}
