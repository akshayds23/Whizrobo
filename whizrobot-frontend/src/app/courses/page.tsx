"use client";

import AppShell from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";

export default function CoursesPage() {
  const { user, loading } = useAuth();
  const permissions = user?.permissions ?? [];
  const isSuperadmin = Boolean(user?.is_superadmin);

  if (loading) {
    return <div className="p-8">Loading courses...</div>;
  }

  if (!user) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return null;
  }

  return (
    <AppShell permissions={permissions} isSuperadmin={isSuperadmin}>
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600">
        Course management UI will appear here.
      </div>
    </AppShell>
  );
}
