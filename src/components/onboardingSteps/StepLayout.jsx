export default function StepLayout({ stepNumber, totalSteps, title, description, children }) {
  return (
    <section className="onboard-step">
      <div className="onboard-step-head">
        <div className="onboard-step-kicker">
          <span>STEP {String(stepNumber).padStart(2, '0')}</span>
          <i>{stepNumber} of {totalSteps}</i>
        </div>
        {title && <h2 className="page-title onboard-step-title">{title}</h2>}
        {description && <p className="page-hero-text onboard-step-copy">{description}</p>}
      </div>
      <div className="onboard-step-body">{children}</div>
    </section>
  );
}
