"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/services/api";

type Organization = {
  id: number;
  name: string;
  region: string;
  type: string;
};

export default function OrganizationsPage() {
  const { user, loading } = useAuth();
  const permissions = user?.permissions ?? [];
  const isSuperadmin = Boolean(user?.is_superadmin);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) {
      return;
    }
    apiFetch("/organizations")
      .then(setOrgs)
      .catch(() => setError("Unable to load organizations."));
  }, [user]);

  if (loading) {
    return <div className="p-8">Loading organizations...</div>;
  }

  if (!user) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return null;
  }

  return (
    <AppShell permissions={permissions} isSuperadmin={isSuperadmin}>
      <h2 className="text-2xl font-semibold mb-6">Organizations</h2>
      <div className="rounded-lg border border-gray-200 bg-white">
        {error ? (
          <div className="p-6 text-sm text-red-600">{error}</div>
        ) : orgs.length === 0 ? (
          <div className="p-6 text-sm text-gray-600">No organizations found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Region</th>
                <th className="px-4 py-3 font-semibold">Type</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((org) => (
                <tr key={org.id} className="border-b border-gray-100">
                  <td className="px-4 py-3">{org.name}</td>
                  <td className="px-4 py-3 text-gray-700">{org.region}</td>
                  <td className="px-4 py-3 text-gray-700">{org.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppShell>
  );
}
