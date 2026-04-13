/**
 * PM2 — production only: `next start` on port 3015.
 *
 * Do NOT use `npm run dev` under PM2 (webpack HMR, wrong behavior in “prod”).
 *
 * First deploy / after git pull:
 *   npm ci && npm run build
 *
 * Start or reload:
 *   pm2 start ecosystem.config.cjs
 *   pm2 reload ecosystem.config.cjs
 *
 * Logs: pm2 logs ota-update
 */
const path = require("node:path");

module.exports = {
  apps: [
    {
      name: "ota-update",
      cwd: __dirname,
      script: path.join(__dirname, "node_modules/next/dist/bin/next"),
      args: ["start", "-p", "3015"],
      interpreter: "node",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: "3015",
        AUTH_SECRET: "y9F3kLx8Qw2Zp7MnR5tVbC4sD1eH6JkUuA0XcWmN9GqTzYfP3rL8oI2aS7dE5BvH",
      },
    },
  ],
};
