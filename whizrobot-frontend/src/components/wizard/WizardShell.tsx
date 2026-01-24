type WizardShellProps = {
  currentStep: number;
  totalSteps: number;
  title: string;
  children: React.ReactNode;
};

export default function WizardShell({
  currentStep,
  totalSteps,
  title,
  children,
}: WizardShellProps) {
  const progress = Math.round((currentStep / totalSteps) * 100);

  return (
    <div className="min-h-screen bg-white flex justify-center">
      <div className="w-full max-w-3xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-[#EC7B21]">{title}</h1>
          <p className="text-sm text-gray-600 mt-1">
            Step {currentStep} of {totalSteps}
          </p>
          <div className="mt-4 h-2 w-full rounded bg-gray-100">
            <div
              className="h-2 rounded bg-[#EC7B21]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
