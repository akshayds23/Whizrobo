type OrgData = {
  name: string;
  region: string;
  type: string;
};

type CapabilityStepProps = {
  roles: { name: string; capabilities: string[] }[];
  setRoles: (roles: { name: string; capabilities: string[] }[]) => void;
  orgData?: OrgData;
  setOrgData?: (data: OrgData) => void;
};

import { CAPABILITIES } from "@/config/capabilities";

export default function CapabilityStep({
  roles,
  setRoles,
}: CapabilityStepProps) {
  const toggleCapability = (roleName: string, capabilityKey: string) => {
    setRoles(
      roles.map((role) => {
        if (role.name !== roleName) {
          return role;
        }
        const has = role.capabilities.includes(capabilityKey);
        return {
          ...role,
          capabilities: has
            ? role.capabilities.filter((cap) => cap !== capabilityKey)
            : [...role.capabilities, capabilityKey],
        };
      }),
    );
  };

  const capabilityEntries = Object.entries(CAPABILITIES);

  if (roles.length === 0) {
    return (
      <div className="text-sm text-gray-600">Select at least one role.</div>
    );
  }

  return (
    <div className="space-y-6">
      {roles.map((role) => (
        <div key={role.name}>
          <div className="text-sm font-semibold text-gray-800">{role.name}</div>
          <div className="mt-3 space-y-2">
            {capabilityEntries.map(([key, capability]) => {
              const checked = role.capabilities.includes(key);
              return (
                <label
                  key={key}
                  className="flex items-center gap-3 text-sm text-gray-700"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={checked}
                    onChange={() => toggleCapability(role.name, key)}
                  />
                  {capability.label}
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
