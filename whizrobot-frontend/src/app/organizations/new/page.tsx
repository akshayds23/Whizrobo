"use client";

import { useState } from "react";
import WizardShell from "@/components/wizard/WizardShell";
import OrgDetailsStep from "@/components/wizard/steps/OrgDetailsStep";
import RoleTemplateStep from "@/components/wizard/steps/RoleTemplateStep";
import CapabilityStep from "@/components/wizard/steps/CapabilityStep";
import ReviewStep from "@/components/wizard/steps/ReviewStep";

const steps = [
  { id: 1, title: "Organization Details", component: OrgDetailsStep },
  { id: 2, title: "Role Templates", component: RoleTemplateStep },
  { id: 3, title: "Capabilities", component: CapabilityStep },
  { id: 4, title: "Review & Create", component: ReviewStep },
];

export default function NewOrganizationWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [orgData, setOrgData] = useState({
    name: "",
    region: "",
    type: "",
  });
  const [roles, setRoles] = useState([
    {
      name: "Organization Admin",
      capabilities: ["MANAGE_ORG", "UPLOAD_CONTENT", "ASSIGN_COURSES"],
    },
  ]);
  const totalSteps = steps.length;

  const step = steps[currentStep - 1];
  const StepComponent = step.component;

  return (
    <WizardShell
      currentStep={currentStep}
      totalSteps={totalSteps}
      title="New Organization Setup"
    >
      <div className="mb-8">
        <h2 className="text-lg font-semibold">{step.title}</h2>
        <p className="text-sm text-gray-600 mt-1">
          Follow the steps to set up a new organization.
        </p>
      </div>

      <StepComponent
        orgData={orgData}
        setOrgData={setOrgData}
        roles={roles}
        setRoles={setRoles}
      />

      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          className="rounded border border-gray-200 px-4 py-2 text-sm text-gray-700 disabled:opacity-50"
          onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
          disabled={currentStep === 1}
        >
          Back
        </button>
        <button
          type="button"
          className="rounded bg-[#EC7B21] px-4 py-2 text-sm text-white disabled:opacity-50"
          onClick={() =>
            setCurrentStep((prev) => Math.min(totalSteps, prev + 1))
          }
          disabled={currentStep === totalSteps}
        >
          Next
        </button>
      </div>
    </WizardShell>
  );
}
