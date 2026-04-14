import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buildService } from "@/server/services/build.service";
import { projectService } from "@/server/services/project.service";

export const metadata: Metadata = {
  title: "Build download",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

function formatCreated(ts: string): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

export default async function PublicBuildDownloadPage({ params }: PageProps) {
  const { id } = await params;
  const build = await buildService.findById(id);
  if (!build || build.uploadStatus !== "success" || build.active === false) {
    notFound();
  }
  const project = await projectService.findById(build.projectId);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-4 py-12">
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Download Build
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {project?.name ?? "Project"} — {build.platform.toUpperCase()} {build.type.toUpperCase()}
        </p>
        <div className="mt-6 grid grid-cols-1 gap-3 text-sm text-zinc-700 dark:text-zinc-300 md:grid-cols-2">
          <p><strong>Version:</strong> {build.version}</p>
          <p><strong>Build #:</strong> {build.buildNumber}</p>
          <p><strong>Env:</strong> {build.env}</p>
          <p><strong>Created:</strong> {formatCreated(build.createdAt)}</p>
        </div>
        <div className="mt-6">
          <Link
            href={`/api/public/builds/${build.id}/download`}
            className="inline-flex rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Download file
          </Link>
        </div>
      </div>
    </main>
  );
}

