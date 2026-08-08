import { requireAppSession } from "@/lib/auth";
import SuggestionsPageClient from "@/components/SuggestionsPageClient";

export default async function SuggestionsPage() {
  await requireAppSession();

  return (
    <main className="bn-route-page bn-suggestions-page">
      <div className="page-shell stack">
        <section className="hero-card suggestions-page-hero bn-route-hero bn-suggestions-hero">
          <div className="suggestions-page-inner">
            <div className="eyebrow">Suggestion box</div>
            <h1 className="page-hero-title suggestions-page-title">Send additions and change requests without leaving the app.</h1>
            <p className="page-hero-text suggestions-page-text">
              You can submit up to 5 suggestions per day. Use this page for additions you&apos;d like to see or changes you&apos;d like made.
            </p>
            <SuggestionsPageClient />
          </div>
        </section>
      </div>
    </main>
  );
}
