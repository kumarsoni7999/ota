"use client";

import { useState } from "react";

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]!.charAt(0)}${parts[parts.length - 1]!.charAt(0)}`.toUpperCase();
  }
  const one = parts[0] ?? "?";
  return one.slice(0, 2).toUpperCase() || "?";
}

type Props = {
  name: string;
  profilePhoto: string;
  /** Tailwind size class e.g. h-16 w-16 */
  className?: string;
  size?: number;
};

/**
 * Renders profile image when set and loadable; otherwise a default initials plate
 * matching the app brand gradient.
 */
export function UserAvatar({
  name,
  profilePhoto,
  className = "h-16 w-16",
  size = 64,
}: Props) {
  const [useFallback, setUseFallback] = useState(false);
  const photo = profilePhoto.trim();
  const showPhoto = photo.length > 0 && !useFallback;

  if (showPhoto) {
    return (
      <div
        className={`relative shrink-0 overflow-hidden rounded-full bg-zinc-200 ring-2 ring-white dark:bg-zinc-700 dark:ring-zinc-800 ${className}`}
      >
        {/* User-controlled URL; next/image would require remotePatterns for arbitrary hosts */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo}
          alt={`${name} profile`}
          width={size}
          height={size}
          className="h-full w-full object-cover"
          onError={() => setUseFallback(true)}
        />
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={`${name} (default avatar)`}
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#ff8c42] to-[#f04a23] text-sm font-semibold text-white shadow-sm ring-2 ring-white dark:ring-zinc-800 ${className}`}
    >
      {initialsFromName(name)}
    </div>
  );
}
