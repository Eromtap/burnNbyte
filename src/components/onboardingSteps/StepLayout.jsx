export default function StepLayout({ stepNumber, totalSteps, title, description, children }) {
  return (
    <section className="onboard-step">
      <div className="onboard-step-head">
        <div className="section-badge">Step {stepNumber} of {totalSteps}</div>
        {title && <h2 className="page-title onboard-step-title">{title}</h2>}
        {description && <p className="page-hero-text onboard-step-copy">{description}</p>}
      </div>
      <div className="onboard-step-body">{children}</div>
    </section>
  );
}
