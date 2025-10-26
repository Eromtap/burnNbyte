// StepLayout.jsx (shared)
export default function StepLayout({ stepNumber, totalSteps, title, children }) {
  return (
    <div className="card" style={{ margin: '0 auto' }}>
      <div className="muted" style={{ textAlign: 'right', marginBottom: 8, fontSize: 12 }}>
        Step {stepNumber} of {totalSteps}
      </div>
      <h2 className="page-title" style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>{title}</h2>
      <div className="space-y-5">{children}</div>
    </div>
  );
}
