import VerifyEmailForm from "@/components/VerifyEmailForm";

export default async function VerifyEmailPage({ searchParams }) {
  const params = await searchParams;
  const token = typeof params?.token === "string" ? params.token : "";
  const deliveryFailed = params?.delivery === "failed";

  return (
    <main className="bn-auth-page">
      <section className="bn-auth-panel">
        <div className="bn-auth-form-wrap">
          <div className="bn-auth-form-head">
            <div className="eyebrow">One last step</div>
            <h1>Verify your email.</h1>
            <p>
              {deliveryFailed
                ? "Your account was created, but we could not send its verification email. Try sending a new link."
                : "Check your inbox for a verification link. You must verify your address before signing in."}
            </p>
          </div>
          <VerifyEmailForm token={token} deliveryFailed={deliveryFailed} />
        </div>
      </section>
    </main>
  );
}
