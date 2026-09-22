import Link from "next/link";
import { redirect } from "next/navigation";
import { assertAdminAccess, isAdminBypassEnabled } from "@/lib/admin";
import { listReviewQueue } from "@/lib/content-review";
import { getSessionUser } from "@/lib/session-user";
import { AdminReviewBoard } from "@/components/AdminReviewBoard";

export default async function AdminReviewPage() {
  const user = await getSessionUser();
  const access = assertAdminAccess({
    email: user?.email,
    bypass: isAdminBypassEnabled(),
  });

  if (!access.ok) {
    if (access.status === 401) {
      redirect("/sign-in");
    }
    return (
      <main className="mx-auto max-w-lg px-4 py-16" data-testid="admin-forbidden">
        <h1 className="font-display text-2xl font-semibold">Admin only</h1>
        <p className="mt-2 text-ink-muted">{access.error}</p>
        <Link href="/" className="btn-primary mt-6 inline-flex">
          Home
        </Link>
      </main>
    );
  }

  const items = listReviewQueue("pending").slice(0, 40);

  return (
    <main className="mx-auto min-h-screen w-full max-w-lg px-4 py-8">
      <header className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-primary">
            Admin
          </p>
          <h1 className="font-display text-3xl font-semibold text-ink">
            Content review
          </h1>
        </div>
        <Link href="/" className="text-sm font-bold text-ink-muted">
          Map
        </Link>
      </header>
      <AdminReviewBoard
        initialItems={items}
        bypass={isAdminBypassEnabled() && !user?.email}
      />
    </main>
  );
}
