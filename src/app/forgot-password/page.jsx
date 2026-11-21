import ForgotPasswordForm from "@/components/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <main className="bn-auth-page">
      <section className="bn-auth-panel">
        <div className="bn-auth-form-wrap">
          <div className="bn-auth-form-head">
            <div className="eyebrow">Account recovery</div>
            <h1>Reset your password.</h1>
            <p>Enter your account email and we&apos;ll send a secure reset link.</p>
          </div>
          <ForgotPasswordForm />
        </div>
      </section>
    </main>
  );
}
