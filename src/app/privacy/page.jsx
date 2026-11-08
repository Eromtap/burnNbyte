import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy',
  description: 'How BurnNByte collects, uses, shares, retains, and deletes personal information.',
};

const privacyEmail = 'support@burnnbyte.com';

export default function PrivacyPage() {
  return (
    <main className="bn-route-page bn-legal-page bn-privacy-page">
      <div className="page-shell">
        <div className="stack bn-legal-wrap">
          <nav aria-label="Legal navigation" className="admin-user-count-actions">
            <Link className="btn btn-outline" href="/">Back to BurnNByte</Link>
            <Link className="btn btn-outline" href="/terms">Terms &amp; Conditions</Link>
          </nav>
          <article className="card bn-legal-card">
            <header className="card-head">
              <div>
                <h1>BurnNByte Privacy Policy</h1>
                <p className="sub">Effective November 8, 2026</p>
              </div>
            </header>
            <div className="stack">
              <section>
                <h2>About this policy</h2>
                <p>This policy covers the BurnNByte website and mobile app and explains how we handle information when you use BurnNByte. It is available without creating an account or signing in.</p>
                <p>For privacy questions or requests about your information, contact <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a>.</p>
              </section>

              <section>
                <h2>Information we collect</h2>
                <ul>
                  <li><strong>Account information:</strong> your name, email address, account identifier, account creation date, and terms-acceptance record. Email/password accounts store a password hash rather than a readable password. If you choose Google sign-in, we receive your Google account identifier, email address, verification status, and basic profile information, such as your name. We do not receive your Google password.</li>
                  <li><strong>Fitness and nutrition information:</strong> details you enter, such as birthday, gender, height, weight and weight history, goals, activity level, workout schedule, equipment, exercise logs, food preferences, allergies, calorie and nutrient targets, food logs, meal feedback, recipes, and grocery lists. Some of this is sensitive health-related information.</li>
                  <li><strong>Content you submit:</strong> food photos and descriptions when you use photo analysis, recipe text or links you import, and suggestions, support messages, or other information you choose to provide.</li>
                  <li><strong>Billing and access records:</strong> subscription status, billing-provider identifiers, transaction or subscription events, and manual access grants. Stripe processes web checkout payment details; our app does not store your full payment-card number.</li>
                  <li><strong>Technical information:</strong> our hosting and service providers process information such as IP address, browser and device details, request times, errors, and security logs. We may use a time zone inferred by our host from your IP address to organize dates. BurnNByte does not request GPS location for these features.</li>
                </ul>
              </section>

              <section>
                <h2>How we use information</h2>
                <p>We use information to create and secure accounts; personalize training and meal recommendations; calculate nutrition targets; save plans, logs, progress, and preferences; prepare grocery lists; manage subscriptions and access; respond to support and privacy requests; moderate uploads; and troubleshoot and improve the service. Fitness and nutrition information supports these app features, rather than medical diagnosis or treatment.</p>
              </section>

              <section>
                <h2>AI processing and food photos</h2>
                <p>When you request an AI-powered feature, we send relevant inputs to OpenAI. Depending on the feature, these can include body measurements, gender, goals, activity and exercise history, dietary preferences, allergies, nutrition targets, meal feedback, recipe text, and food descriptions. Food photos you submit are sent to OpenAI for content moderation and meal analysis.</p>
                <p>Generated plans and analysis results are saved to your account where needed to provide the feature. The current food-photo feature processes the uploaded image without adding the original photo to a persistent BurnNByte photo library. Our service providers may retain submitted data or logs under their own service and retention terms. Do not include unrelated sensitive information in images or free-text submissions.</p>
              </section>

              <section>
                <h2>Service providers and sharing</h2>
                <p>We disclose information to providers as needed for the features you use:</p>
                <ul>
                  <li><strong>Vercel and Neon:</strong> website/server hosting, request processing, operational logs, and storage of account and app records.</li>
                  <li><strong>OpenAI:</strong> the AI generation, moderation, and analysis described above.</li>
                  <li><strong>Google:</strong> Google sign-in if selected, Google Play app distribution, and YouTube exercise-demo searches. Searching for or opening YouTube content can disclose search terms, IP/device information, and usage to Google or YouTube.</li>
                  <li><strong>Stripe:</strong> web billing, including account email, our account identifier, payment information provided at checkout, and subscription records.</li>
                  <li><strong>Recipe websites and external services:</strong> importing a recipe link causes our server to request that page. When you open an external link, that service handles information under its own privacy practices.</li>
                </ul>
                <p>Authorized administrators may access records needed to manage accounts, app access, support, and operations. We may also disclose information when required by law, to protect users and the service, or as part of a business transfer subject to applicable protections. BurnNByte does not sell personal information or use fitness and nutrition information to target advertisements. The current app does not include an advertising SDK.</p>
                <p>Provider information: <a href="https://vercel.com/legal/privacy-policy">Vercel</a>, <a href="https://neon.tech/privacy-policy">Neon</a>, <a href="https://openai.com/policies/privacy-policy/">OpenAI</a>, <a href="https://policies.google.com/privacy">Google</a>, and <a href="https://stripe.com/privacy">Stripe</a>.</p>
              </section>

              <section>
                <h2>Cookies and information on your device</h2>
                <p>We use cookies for sign-in sessions and login security, including a short-lived challenge for native Google sign-in. Browser or app storage also saves preferences and an account-specific onboarding draft. That draft may contain profile, fitness, and dietary information and can remain on the device after logout until you finish setup or clear site/app storage. Other preferences, such as theme and dashboard display choices, may also remain.</p>
                <p>You can clear browser cookies and site storage or Android app storage through your device settings. Doing so can sign you out and remove local drafts. Logging out or uninstalling the app does not delete records stored in your online account.</p>
              </section>

              <section>
                <h2>Retention and security</h2>
                <p>We retain account details, plans, logs, and related records while they are needed to provide your account and the features you use, unless you request deletion. Retention of operational logs and backups depends on the providers and settings in use. Some records may need to be retained for billing, legal obligations, fraud prevention, security, or resolving disputes; backup copies may remain until replaced or expired.</p>
                <p>We use HTTPS for production connections, password hashing for password accounts, and authentication and access controls for protected features. No storage or transmission method can guarantee complete security. Service providers may process information in countries other than where you live, including the United States.</p>
              </section>

              <section id="deletion">
                <h2>Your choices and deletion requests</h2>
                <p>You can review and update profile preferences and use deletion controls available for individual saved items. To request access to, correction of, or deletion of your account and associated personal information, email <a href={`mailto:${privacyEmail}?subject=BurnNByte%20account%20and%20data%20deletion`}>{privacyEmail}</a> from your account email address with the subject “BurnNByte account and data deletion.” You can make this request without logging into the app. Do not send your password or payment-card details.</p>
                <p>We may need to verify ownership before acting on a request. We will explain any information that must be retained and the reason. You may have additional privacy rights under the law where you live. Deleting your account and canceling a paid subscription are separate actions: manage any active subscription through its billing provider as well.</p>
              </section>

              <section>
                <h2>Age requirements</h2>
                <p>BurnNByte is intended for adults aged 18 or older, or the age of majority where they live. We do not knowingly collect information from children. Contact us if you believe a child has provided information so we can investigate and address it.</p>
              </section>

              <section>
                <h2>Changes and contact</h2>
                <p>We will update this policy when our practices change and show a new effective date. Where required, we will provide additional notice or ask for consent before a material change in how we use your information. For questions, contact <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a>.</p>
              </section>
            </div>
          </article>
        </div>
      </div>
    </main>
  );
}
