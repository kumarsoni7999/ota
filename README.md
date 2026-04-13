# Sthanave OTA

**Sthanave OTA** — app on the air update. [Next.js](https://nextjs.org) 16 (App Router) with **TypeScript**, sign-in / registration at `/`, and a **typed JSON API envelope** (`success` + `data` | `error` + `meta`) for API responses.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) for the auth UI (`?tab=register` opens the register tab).

Example API: [http://localhost:3000/api/health](http://localhost:3000/api/health) returns the standard envelope with `Content-Language`, `X-Request-Id`, and `X-Api-Version` headers.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Production (self‑hosted)

Deployed behavior matches local only if the **runtime** and **environment** match what you use on your machine.

1. **Run a production server** — `npm ci && npm run build` then `npm run start` (or the included `Dockerfile`). Do **not** run `npm run dev` in production (that enables webpack HMR and wrong tooling). With **PM2**, use `ecosystem.config.cjs` (`pm2 start ecosystem.config.cjs`) — it runs `next start` on port **3015**, not `npm run dev`.

2. **Set `AUTH_SECRET`** — Required in production (see `auth-secret.ts`). Use a long random string and **keep it stable** across deploys or every user is logged out and tokens become invalid.

3. **HTTPS** — Session cookies use the `Secure` flag in production. The site must be served over **HTTPS** in the browser, or sign-in will not persist.

4. **Persisted data** — Users, projects, and uploads live under `data/`, `uploads/`, and `storage/` relative to the app (or under `OTA_DATA_DIR` if set). On Docker or ephemeral hosts, **mount a volume** and set `OTA_DATA_DIR` to that path, or data resets when the container restarts (unlike local disk).

5. **Optional `CORS_ORIGINS`** — If you call the API from another origin, list those origins (comma-separated). Wrong values break cross-origin API use.

See `.env.example` for variable names. Local check: `npm run preview` runs a production build on your machine.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
