import ResetPasswordForm from "@/components/ResetPasswordForm";

export default async function ResetPasswordPage({ searchParams }) {
  const params = await searchParams;
  const token = typeof params?.token === "string" ? params.token : "";

  return (
    <main className="bn-auth-page">
      <section className="bn-auth-panel">
        <div className="bn-auth-form-wrap">
          <div className="bn-auth-form-head">
            <div className="eyebrow">Account recovery</div>
            <h1>Choose a new password.</h1>
            <p>Your reset link is single-use and expires after one hour.</p>
          </div>
          <ResetPasswordForm token={token} />
        </div>
      </section>
    </main>
  );
}
