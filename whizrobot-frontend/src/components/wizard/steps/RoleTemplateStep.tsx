type OrgData = {
  name: string;
  region: string;
  type: string;
};

type Role = {
  name: string;
  capabilities: string[];
};

type RoleTemplateStepProps = {
  roles: Role[];
  setRoles: (roles: Role[]) => void;
  orgData?: OrgData;
  setOrgData?: (data: OrgData) => void;
};

const ROLE_TEMPLATES: Array<{ name: string; defaultCapabilities: string[] }> = [
  {
    name: "Organization Admin",
    defaultCapabilities: ["MANAGE_ORG", "UPLOAD_CONTENT", "ASSIGN_COURSES"],
  },
  {
    name: "Content Manager",
    defaultCapabilities: ["UPLOAD_CONTENT"],
  },
  {
    name: "Viewer",
    defaultCapabilities: [],
  },
  {
    name: "Robot",
    defaultCapabilities: ["MANAGE_ROBOTS"],
  },
];

export default function RoleTemplateStep({
  roles,
  setRoles,
}: RoleTemplateStepProps) {
  const toggleRole = (roleName: string, defaultCapabilities: string[]) => {
    const exists = roles.find((role) => role.name === roleName);
    if (exists) {
      setRoles(roles.filter((role) => role.name !== roleName));
      return;
    }
    setRoles([...roles, { name: roleName, capabilities: defaultCapabilities }]);
  };

  return (
    <div className="space-y-4">
      {ROLE_TEMPLATES.map((role) => {
        const checked = roles.some((item) => item.name === role.name);
        return (
          <label
            key={role.name}
            className="flex items-center gap-3 text-sm text-gray-700"
          >
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={checked}
              onChange={() => toggleRole(role.name, role.defaultCapabilities)}
            />
            {role.name}
          </label>
        );
      })}
    </div>
  );
}
