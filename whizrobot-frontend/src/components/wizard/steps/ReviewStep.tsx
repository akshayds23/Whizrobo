import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/services/api";
import { CAPABILITIES } from "@/config/capabilities";

type OrgData = {
  name: string;
  region: string;
  type: string;
};

type ReviewStepProps = {
  orgData: OrgData;
  roles: { name: string; capabilities: string[] }[];
  setOrgData?: (data: OrgData) => void;
};

export default function ReviewStep({ orgData, roles }: ReviewStepProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    setError("");
    setLoading(true);

    const rolesWithPermissions = roles.map((role) => ({
      name: role.name,
      permissions: role.capabilities.flatMap(
        (capability) => CAPABILITIES[capability].permissions,
      ),
    }));

    try {
      await apiFetch("/organizations", {
        method: "POST",
        body: JSON.stringify({
          organization: orgData,
          roles: rolesWithPermissions,
        }),
      });
      router.push("/");
    } catch {
      setError(
        "Unable to create organization roles. Please contact support.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="text-sm text-gray-600">
        Review the organization details before creating.
      </div>
      <div className="mt-4 space-y-2 text-sm">
        <div>
          <span className="font-semibold">Name:</span> {orgData.name || "—"}
        </div>
        <div>
          <span className="font-semibold">Region:</span> {orgData.region || "—"}
        </div>
        <div>
          <span className="font-semibold">Type:</span> {orgData.type || "—"}
        </div>
        <div>
          <span className="font-semibold">Roles:</span>{" "}
          {roles.length === 0 ? "—" : ""}
        </div>
        {roles.map((role) => (
          <div key={role.name} className="ml-4">
            <div className="font-semibold">{role.name}</div>
            <div className="text-gray-600">
              {role.capabilities.length === 0
                ? "No capabilities selected"
                : role.capabilities
                    .map((capability) => CAPABILITIES[capability].label)
                    .join(", ")}
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-600 mt-4">{error}</p>}

      <button
        type="button"
        disabled={loading}
        onClick={handleCreate}
        className="mt-6 rounded bg-[#EC7B21] px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {loading ? "Creating..." : "Create Organization"}
      </button>
    </div>
  );
}
