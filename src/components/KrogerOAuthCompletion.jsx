function safeReturnTo(value) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")
    ? value
    : "/groceries";
}

export default function KrogerOAuthCompletion({ status, reason, returnTo }) {
  const destination = safeReturnTo(returnTo);
  const connected = status === "connected";

  return (
    <main className="bn-auth-page bn-auth-page-signin">
      <section className="bn-auth-panel">
        <div className="bn-auth-form-wrap stack">
          <div className="eyebrow">Kroger connection</div>
          <h1>{connected ? "Kroger is connected." : "Kroger was not connected."}</h1>
          <p className="muted">
            {connected
              ? "Return to BurnNByte to continue building your grocery cart."
              : reason === "authorization_denied"
                ? "You declined the Kroger authorization request. No connection was saved."
                : "The authorization could not be completed. Return to BurnNByte and try again."}
          </p>
          <div className="grocery-inline-actions">
            <a className="btn btn-primary" href={destination}>Continue to BurnNByte</a>
          </div>
        </div>
      </section>
    </main>
  );
}
