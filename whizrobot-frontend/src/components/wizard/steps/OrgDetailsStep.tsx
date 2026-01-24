type OrgData = {
  name: string;
  region: string;
  type: string;
};

type OrgDetailsStepProps = {
  orgData: OrgData;
  setOrgData: (data: OrgData) => void;
  roles?: { name: string; capabilities: string[] }[];
  setRoles?: (roles: { name: string; capabilities: string[] }[]) => void;
};

export default function OrgDetailsStep({
  orgData,
  setOrgData,
}: OrgDetailsStepProps) {
  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder="Organization Name"
        className="w-full border px-4 py-2 rounded"
        value={orgData.name}
        onChange={(e) => setOrgData({ ...orgData, name: e.target.value })}
      />

      <input
        type="text"
        placeholder="Region"
        className="w-full border px-4 py-2 rounded"
        value={orgData.region}
        onChange={(e) => setOrgData({ ...orgData, region: e.target.value })}
      />

      <select
        className="w-full border px-4 py-2 rounded bg-white"
        value={orgData.type}
        onChange={(e) => setOrgData({ ...orgData, type: e.target.value })}
      >
        <option value="">Select Type</option>
        <option value="Education">Education</option>
        <option value="Corporate">Corporate</option>
        <option value="Other">Other</option>
      </select>
    </div>
  );
}
