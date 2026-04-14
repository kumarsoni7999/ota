"use client";

import { useState } from "react";

function DocCodeBox({ title, code }: { title: string; code: string }) {
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {title}
      </p>
      <pre
        className="mt-1.5 overflow-x-auto rounded-lg border border-zinc-200 bg-white p-4 font-mono text-[11px] leading-relaxed text-zinc-800 shadow-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
        tabIndex={0}
      >
        {code.trim()}
      </pre>
    </div>
  );
}

const AUTH_HEADERS = `GET /api/projects HTTP/1.1
Host: your-ota-host.example
Cookie: ota_session=<session-token>
X-Client-Id: <24-char-hex-client-id>
Accept: application/json`;

const MULTIPART_UPLOAD_HEADERS = `POST /api/projects/{projectId}/builds HTTP/1.1
Host: your-ota-host.example
Cookie: ota_session=<session-token>
X-Client-Id: <24-char-hex-client-id>
Content-Type: multipart/form-data; boundary=----otaBoundary`;

const MULTIPART_FIELDS_JSONC = `// Sent as multipart/form-data: each key is a form field name.
// The file part must use field name "file", "buildFile", or "build" and include the binary body.
{
  "name": "MyApp",                    // required — display / manifest name
  "version": "1.2.3",                 // required — release version string
  "env": "DEV",                       // required — DEV | QA | STAGE | PROD
  "platform": "android",              // required — android | ios
  "type": "apk",                      // required — apk | aab | ipa
  "buildNumber": "42",                // required — positive int string
  "runtimeVersion": "1.0.0",          // optional — Expo-style runtime key
  "commitHash": "a1b2c3d4",           // optional
  "branch": "main",                   // optional
  "releaseNotes": "Bug fixes",        // optional
  "minSupportedVersion": "1.0.0"     // optional
}`;

const CHUNKED_UPLOAD_PHASES = `// Preferred endpoint: POST /api/builds?projectId={projectId}
// Compatible endpoint: POST /api/projects/{projectId}/builds/chunked-upload
// Use query "phase" (alias: "step") to choose the operation.
{
  "phase=init": "JSON body below; creates build with uploadStatus pending",
  "phase=chunk": "Query buildId + chunkIndex (or index); body = raw chunk bytes",
  "phase=complete": "Query buildId only; no body; finalizes artifact"
}`;

const CHUNK_INIT_HEADERS = `POST /api/builds?projectId={projectId}&phase=init HTTP/1.1
Host: your-ota-host.example
Cookie: ota_session=<session-token>
X-Client-Id: <24-char-hex-client-id>
Content-Type: application/json`;

const CHUNK_INIT_JSONC = `{
  "name": "MyApp",                    // required — display / manifest name
  "version": "1.2.3",                 // required
  "env": "DEV",                       // required — DEV | QA | STAGE | PROD
  "platform": "android",              // required — android | ios
  "type": "apk",                      // required — apk | aab | ipa
  "totalSize": 5242880,               // required — total bytes of all chunks combined
  "totalChunks": 10,                  // required — how many phase=chunk requests you will send
  "buildNumber": 42,                  // required — positive integer
  "runtimeVersion": "1.0.0",          // optional
  "commitHash": "a1b2c3d4",           // optional
  "branch": "main",                   // optional
  "releaseNotes": "Bug fixes",        // optional
  "minSupportedVersion": "1.0.0"     // optional
}`;

const CHUNK_PUT_HEADERS = `POST /api/builds?projectId={projectId}&phase=chunk&buildId={buildId}&chunkIndex=0 HTTP/1.1
Host: your-ota-host.example
Cookie: ota_session=<session-token>
X-Client-Id: <24-char-hex-client-id>
Content-Type: application/octet-stream`;

const CHUNK_PUT_BODY_NOTE = `// Body: raw bytes for this chunk only (must not be empty).
// chunkIndex: 0 .. totalChunks-1 (alias query name: index). buildId from phase=init response.`;

const CHUNK_COMPLETE_HEADERS = `POST /api/builds?projectId={projectId}&phase=complete&buildId={buildId} HTTP/1.1
Host: your-ota-host.example
Cookie: ota_session=<session-token>
X-Client-Id: <24-char-hex-client-id>`;

const CHUNK_COMPLETE_NOTE = `// No request body. Verifies chunk sizes sum to totalSize, assembles the artifact,
// writes build-manifest.json, then sets uploadStatus to success (or failed on mismatch/error).`;

const OTA_UPLOAD_HEADERS = `POST /api/ota-updates?projectId={projectId} HTTP/1.1
Host: your-ota-host.example
X-Client-Id: <24-char-hex-client-id>
Content-Type: multipart/form-data; boundary=----otaBoundary`;

const OTA_UPLOAD_FIELDS_JSONC = `// Sent as multipart/form-data.
// Required text fields: version, env, platform.
// Required file: bundle (or file/jsBundle).
// Optional files: repeat "assets" field for each asset file.
{
  "version": "1.0.1",
  "env": "DEV",                       // DEV | QA | STAGE | PROD
  "platform": "android",              // android | ios
  "runtimeVersion": "1.0.0",          // optional
  "mandatory": "true",                // optional (true/false or 1/0)
  "minVersion": "1.0.0",              // optional
  "releaseNotes": "Fix push issue",   // optional
  "bundle": "<index.bundle file>",    // required
  "assets[]": "<asset file(s)>"       // optional; send as repeated "assets" parts
}`;

const BUILD_UPLOAD_RESPONSE_201 = `{
  "success": true,
  "data": {
    "build": {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "projectId": "c3e71056-8b3f-4ea4-9da7-5bd2838af2c1",
      "env": "DEV",
      "version": "1.2.3",
      "buildNumber": 42,
      "type": "apk",
      "platform": "android",
      "filePath": "projects/a1b2c3d4e5f6/builds/android/dev/1.2.3/MyApp.apk",
      "metadata": {
        "displayName": "MyApp",
        "runtimeVersion": "1.0.0",
        "commitHash": "a1b2c3d4",
        "branch": "main",
        "releaseNotes": "Bug fixes",
        "minSupportedVersion": "1.0.0"
      },
      "createdBy": "c124a360-a8eb-4484-bc4e-0747bbde9771",
      "updatedBy": "c124a360-a8eb-4484-bc4e-0747bbde9771",
      "createdAt": "2026-04-12T10:00:00.000Z",
      "updatedAt": "2026-04-12T10:00:00.000Z",
      "active": true,
      "uploadStatus": "success"
    },
    "created": true,
    "manifestFile": "build-manifest.json"
  },
  "meta": {
    "requestId": "7f3c9a2e-1b4d-4e8a-9c0d-1234567890ab",
    "locale": "en",
    "timestamp": "2026-04-12T10:00:00.000Z",
    "apiVersion": "1"
  }
}`;

const CHUNK_INIT_RESPONSE = `{
  "success": true,
  "data": {
    "build": {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "projectId": "c3e71056-8b3f-4ea4-9da7-5bd2838af2c1",
      "env": "DEV",
      "version": "1.2.3",
      "buildNumber": 42,
      "type": "apk",
      "platform": "android",
      "uploadStatus": "pending",
      "uploadExpectedBytes": 5242880,
      "uploadExpectedChunks": 10,
      "uploadReceivedBytes": 0,
      "filePath": "projects/a1b2c3d4e5f6/builds/.pending/f47ac10b-58cc-4372-a567-0e02b2c3d479/.placeholder",
      "metadata": { "displayName": "MyApp" },
      "active": true,
      "createdAt": "2026-04-12T10:00:00.000Z",
      "updatedAt": "2026-04-12T10:00:00.000Z",
      "createdBy": "c124a360-a8eb-4484-bc4e-0747bbde9771",
      "updatedBy": "c124a360-a8eb-4484-bc4e-0747bbde9771"
    }
  },
  "meta": {
    "requestId": "7f3c9a2e-1b4d-4e8a-9c0d-1234567890ab",
    "locale": "en",
    "timestamp": "2026-04-12T10:00:00.000Z",
    "apiVersion": "1"
  }
}`;

const POST_PROJECT_JSONC = `{
  "name": "My product",               // required — max 30 chars
  "description": "Optional notes"     // optional — max 2000 chars
}`;

const PATCH_PROJECT_JSONC = `{
  "active": false                     // required boolean — deactivate / reactivate project
}`;

const LIST_QUERY_JSONC = `// Query string (no JSON body) for paginated GET endpoints:
{
  "page": "1",                        // optional — default 1
  "pageSize": "20",                  // optional — default 20, max 100 (alias: limit)
  "uploadStatus": "pending"          // GET /api/builds only — pending | success | failed | all (alias: status)
}`;

type TabId = "upload" | "other";

export default function DashboardApiDocsPage() {
  const [tab, setTab] = useState<TabId>("upload");

  return (
    <div className="w-full min-w-0">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        API docs
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Session cookie plus matching{" "}
        <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
          X-Client-Id
        </code>{" "}
        on every request (same values the dashboard uses).
      </p>

      <div
        className="mt-6 flex gap-1 rounded-lg border border-zinc-200 bg-zinc-100/80 p-1 dark:border-zinc-700 dark:bg-zinc-900/60"
        role="tablist"
        aria-label="API documentation sections"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "upload"}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
            tab === "upload"
              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
              : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          }`}
          onClick={() => setTab("upload")}
        >
          Upload build
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "other"}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
            tab === "other"
              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
              : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          }`}
          onClick={() => setTab("other")}
        >
          Others
        </button>
      </div>

      {tab === "upload" ? (
        <div
          className="mt-6 space-y-10 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300"
          role="tabpanel"
        >
          <section>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Single request (multipart)
            </h2>
            <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
              Upload or replace one artifact in a single request. Re-uploading
              the same project + env + platform + type + version replaces the
              file and{" "}
              <code className="font-mono text-[11px]">build-manifest.json</code>.
            </p>
            <DocCodeBox title="Request — headers" code={MULTIPART_UPLOAD_HEADERS} />
            <DocCodeBox
              title="Request — fields (JSON shape; send as multipart parts)"
              code={MULTIPART_FIELDS_JSONC}
            />
            <DocCodeBox title="Response — 201 Created" code={BUILD_UPLOAD_RESPONSE_201} />
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Chunked upload
            </h2>
            <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
              All steps use{" "}
              <code className="font-mono text-[11px]">POST /api/builds</code> with{" "}
              <code className="font-mono text-[11px]">projectId</code> in query (or
              the project-scoped chunked endpoint) and query{" "}
              <code className="font-mono text-[11px]">phase=init|chunk|complete</code>.
              Init creates{" "}
              <code className="font-mono text-[11px]">uploadStatus: pending</code>; chunk
              sends bytes; complete assembles the file and sets{" "}
              <code className="font-mono text-[11px]">uploadStatus</code> to{" "}
              <code className="font-mono text-[11px]">success</code> or{" "}
              <code className="font-mono text-[11px]">failed</code>.
            </p>
            <DocCodeBox title="Chunked upload — how phase works" code={CHUNKED_UPLOAD_PHASES} />
            <DocCodeBox title="1) Init — request line & headers" code={CHUNK_INIT_HEADERS} />
            <DocCodeBox title="1) Init — JSON body" code={CHUNK_INIT_JSONC} />
            <DocCodeBox title="1) Init — response" code={CHUNK_INIT_RESPONSE} />
            <DocCodeBox title="2) Chunk — request line & headers" code={CHUNK_PUT_HEADERS} />
            <DocCodeBox title="2) Chunk — body" code={CHUNK_PUT_BODY_NOTE} />
            <DocCodeBox title="3) Complete — request line & headers" code={CHUNK_COMPLETE_HEADERS} />
            <DocCodeBox title="3) Complete — body" code={CHUNK_COMPLETE_NOTE} />
          </section>
        </div>
      ) : (
        <div
          className="mt-6 space-y-10 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300"
          role="tabpanel"
        >
          <section>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Common headers
            </h2>
            <DocCodeBox title="Example" code={AUTH_HEADERS} />
            <DocCodeBox
              title="Pagination & filters (query string)"
              code={LIST_QUERY_JSONC}
            />
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Projects
            </h2>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              <code className="font-mono text-[11px]">GET /api/projects</code> — list your
              projects (paginated).{" "}
              <code className="font-mono text-[11px]">POST /api/projects</code> — create.
              <code className="font-mono text-[11px]"> PATCH /api/projects/{"{id}"}</code>{" "}
              — set active flag.{" "}
              <code className="font-mono text-[11px]">DELETE /api/projects/{"{id}"}</code>{" "}
              — permanent delete.
            </p>
            <DocCodeBox title="POST /api/projects — JSON body" code={POST_PROJECT_JSONC} />
            <DocCodeBox
              title="PATCH /api/projects/{id} — JSON body"
              code={PATCH_PROJECT_JSONC}
            />
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Builds & OTA updates
            </h2>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              <code className="font-mono text-[11px]">GET /api/builds</code> — paginated
              builds for your projects; optional{" "}
              <code className="font-mono text-[11px]">uploadStatus</code> /{" "}
              <code className="font-mono text-[11px]">status</code> filter.{" "}
              <code className="font-mono text-[11px]">GET /api/ota-updates</code> — paginated
              OTA update records.
            </p>
            <DocCodeBox title="POST /api/ota-updates — headers" code={OTA_UPLOAD_HEADERS} />
            <DocCodeBox
              title="POST /api/ota-updates — fields (JSON shape; send as multipart parts)"
              code={OTA_UPLOAD_FIELDS_JSONC}
            />
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Health
            </h2>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              <code className="font-mono text-[11px]">GET /api/health</code> — no auth.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
