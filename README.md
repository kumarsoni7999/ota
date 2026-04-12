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

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
