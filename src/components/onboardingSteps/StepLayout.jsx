// StepLayout.jsx (shared)
export default function StepLayout({ stepNumber, totalSteps, title, children }) {
  return (
    <section>
      {title && (
        <h2 className="page-title" style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{title}</h2>
      )}
      <div className="space-y-5">{children}</div>
    </section>
  );
}
