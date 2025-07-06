// StepLayout.jsx (shared)
export default function StepLayout({ stepNumber, totalSteps, title, children }) {
  return (
    <div className="max-w-xl mx-auto bg-black text-white p-8 rounded-2xl shadow-lg border border-red-600">
      <div className="text-sm text-red-400 text-right mb-2">
        Step {stepNumber} of {totalSteps}
      </div>
      <h2 className="text-3xl font-bold mb-6 text-red-500">{title}</h2>
      <div className="space-y-5">{children}</div>
    </div>
  );
}