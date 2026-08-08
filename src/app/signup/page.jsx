'use client';
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, name: name.trim(), termsAccepted }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "We couldn’t create your account. Please try again.");
        return;
      }
      router.replace("/signin");
    } catch {
      setError("The account service is temporarily unavailable. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="bn-auth-page">
      <section className="bn-auth-story">
        <div className="bn-auth-brand">
          <div className="bn-auth-logo">
            <Image
              src="/logo.png"
              alt="burnNbyte logo"
              width={1024}
              height={1024}
              priority
            />
          </div>
          <span>burnNbyte</span>
        </div>
        <div className="bn-auth-copy">
          <div className="eyebrow">Build the system</div>
          <h1>Make the plan.<br /><em>Keep the promise.</em></h1>
          <p>A practical home for the work you do in the gym and the choices you make around it.</p>
        </div>
        <div className="bn-auth-signal">
          <span>01</span>
          <strong>Train</strong>
          <span>02</span>
          <strong>Fuel</strong>
          <span>03</span>
          <strong>Repeat</strong>
        </div>
      </section>

      <section className="bn-auth-panel">
        <div className="bn-auth-form-wrap">
          <div className="bn-auth-form-head">
            <div className="eyebrow">Start here</div>
            <h2>Create your account.</h2>
            <p>Your plan gets personal after this.</p>
          </div>
          <form onSubmit={handleSubmit} className="form bn-auth-form" aria-busy={submitting}>
            <label>
              <span>Name</span>
              <input type="text" autoComplete="name" value={name} onChange={e => setName(e.target.value)} required maxLength={80} disabled={submitting} />
            </label>
            
            <label>
              <span>Email</span>
              <input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required disabled={submitting} />
            </label>

            <label>
              <span>Password</span>
              <input type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} maxLength={72} disabled={submitting} aria-describedby="signup-password-help" />
              <small id="signup-password-help" className="bn-auth-field-help">Use at least 8 characters.</small>
            </label>

            <label className="bn-auth-terms">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                required
                disabled={submitting}
              />
              <span>
                I agree to the <Link href="/terms">Terms &amp; Conditions</Link>.
              </span>
            </label>

            {error ? <div className="bn-auth-message is-error" role="alert">{error}</div> : null}
            <button type="submit" className="btn btn-primary" disabled={!termsAccepted || submitting}>
              {submitting ? <><LoaderCircle size={16} aria-hidden /> Creating account…</> : "Create account"}
            </button>
            <div className="bn-auth-switch">Already have an account? <Link href="/signin">Sign in</Link></div>
          </form>
        </div>
      </section>
    </main>
  );
}
