import Link from "next/link";

export const metadata = {
  title: "Privacy and Consumer Health Data Policy",
  description: "How BurnNByte collects, uses, protects, and discloses personal and consumer health data.",
};

const EFFECTIVE_DATE = "September 8, 2026";

export default function PrivacyPage() {
  const legalName = process.env.LEGAL_ENTITY_NAME?.trim() || "BurnNByte";
  const privacyEmail = process.env.PRIVACY_CONTACT_EMAIL?.trim() || "privacy@burnnbyte.com";
  const mailingAddress = process.env.LEGAL_MAILING_ADDRESS?.trim();

  return (
    <main className="bn-route-page bn-legal-page">
      <div className="page-shell">
        <div className="stack bn-legal-wrap">
          <section className="bn-route-intro">
            <div>
              <div className="eyebrow">Privacy and health data</div>
              <h1>Your information.<br /><em>Your choices.</em></h1>
              <p>This policy explains how BurnNByte handles personal information, including sensitive fitness and nutrition information.</p>
            </div>
            <aside>
              <span>Effective date</span>
              <strong>{EFFECTIVE_DATE}</strong>
              <small>Privacy Policy and Consumer Health Data Privacy Notice</small>
            </aside>
          </section>

          <article className="card bn-legal-card">
            <header className="card-head">
              <h1>Privacy Policy</h1>
              <div className="sub">Effective and last updated: {EFFECTIVE_DATE}</div>
            </header>

            <div className="stack bn-legal-copy">
              <section>
                <div className="planner-head">1. Scope and controller</div>
                <p className="muted">
                  This Privacy Policy applies to the BurnNByte website, mobile applications, and related services
                  (collectively, the &quot;Service&quot;). {legalName} is responsible for the personal information described
                  here. This policy does not govern third-party services that you choose to connect, including Kroger,
                  Stripe, YouTube, or an application store; their own notices govern their independent processing.
                </p>
              </section>

              <section>
                <div className="planner-head">2. Information we collect</div>
                <p className="muted"><strong>Account information.</strong> Name, email address, hashed password, account identifiers, acceptance records, preferences, and subscription status.</p>
                <p className="muted"><strong>Fitness, nutrition, and consumer health data.</strong> Birth date, gender, height, weight and weight history, goal weight, activity level, fitness goals, workout preferences, equipment access, planned and completed workouts, exercise logs, calorie and macronutrient targets, food logs, meal plans, dietary preferences, disliked foods, allergies, meal feedback, and related inferences or recommendations.</p>
                <p className="muted"><strong>Content you provide.</strong> Food photographs, recipes, pantry entries, grocery lists, suggestions, social posts, comments, likes, and other information you submit.</p>
                <p className="muted"><strong>Billing information.</strong> Subscription product, status, dates, and processor identifiers. Payment-card details are collected and processed by Stripe or the applicable application store; BurnNByte does not store complete payment-card numbers.</p>
                <p className="muted"><strong>Kroger connection data.</strong> If you connect Kroger, we receive OAuth access and refresh tokens, authorization scopes, connection timestamps, and potentially a Kroger profile identifier. We also process the store, products, quantities, fulfillment modality, and cart additions you select.</p>
                <p className="muted"><strong>Device and service data.</strong> IP address, browser or device type, operating system, time zone, cookies, session information, request timestamps, diagnostic logs, and security events may be processed when you use the Service.</p>
              </section>

              <section>
                <div className="planner-head">3. Sources of information</div>
                <p className="muted">We collect information directly from you; automatically from your browser, device, and interactions with the Service; from connected services you authorize, such as Kroger and payment providers; and from calculations or AI-assisted inferences based on information you provide.</p>
              </section>

              <section>
                <div className="planner-head">4. How we use information</div>
                <p className="muted">We use information to authenticate users; create and personalize workouts, meal plans, nutrition targets, progress views, and grocery lists; process subscriptions; provide requested Kroger product and cart features; import or analyze user-provided content; maintain, secure, debug, and improve the Service; respond to requests; prevent fraud and misuse; comply with law; and establish, exercise, or defend legal claims. We do not use consumer health data for targeted advertising.</p>
              </section>

              <section>
                <div className="planner-head">5. How we disclose information</div>
                <p className="muted">We disclose information only as reasonably necessary for the purposes described above:</p>
                <ul className="muted bn-legal-list">
                  <li><strong>Vercel</strong>, for application hosting, delivery, and operational logs.</li>
                  <li><strong>Neon</strong>, for managed database infrastructure.</li>
                  <li><strong>OpenAI</strong>, for requested AI-assisted meal, exercise, image-moderation, and related features. Prompts may contain fitness, nutrition, dietary, allergy, or other information needed to provide the requested result.</li>
                  <li><strong>Stripe</strong> and applicable application stores, for subscription billing and account management.</li>
                  <li><strong>Google/YouTube</strong>, when you request exercise-video search results.</li>
                  <li><strong>Kroger</strong>, only when you connect Kroger or direct us to search its catalog or add selected products and quantities to your Kroger cart.</li>
                  <li>Professional advisers, authorities, or transaction counterparties when reasonably necessary to comply with law, protect rights and safety, or complete a legitimate corporate transaction subject to appropriate safeguards.</li>
                </ul>
                <p className="muted">BurnNByte does not sell personal information or consumer health data. BurnNByte does not share personal information for cross-context behavioral advertising. We do not send your weight, fitness goals, workout history, allergy profile, or other health profile data to Kroger; Kroger receives only the authentication and grocery-related information required for features you choose to use.</p>
              </section>

              <section>
                <div className="planner-head">6. Consumer Health Data Privacy Notice</div>
                <p className="muted">For purposes of laws such as the Washington My Health My Data Act, consumer health data may include the fitness, body-measurement, nutrition, dietary, allergy, activity, and health-related inference information identified in Section 2. We collect it from you and from your use of requested features to provide, personalize, secure, and improve those features.</p>
                <p className="muted">Categories of consumer health data disclosed are limited to information necessary for processors that host data or generate features you request. Current processor categories and names are cloud hosting (Vercel), database infrastructure (Neon), and AI processing and moderation (OpenAI). We do not sell consumer health data. We do not collect or disclose additional categories of consumer health data, or use it for materially different purposes, without the notice and consent required by applicable law.</p>
                <p className="muted">Depending on applicable law, you may request access to, confirmation of, correction of, deletion of, or a copy of consumer health data; withdraw consent for future collection or disclosure; and appeal a refusal of your request. Send requests or appeals to <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a> with the subject &quot;Consumer Health Data Request&quot; or &quot;Privacy Appeal.&quot; We may verify your identity before acting. Authorized agents may submit requests where permitted by law and may be required to provide proof of authority.</p>
              </section>

              <section>
                <div className="planner-head">7. Legal bases and consent</div>
                <p className="muted">Where applicable, we process information to perform our agreement with you, provide a product or service you request, pursue legitimate interests that do not override your rights, comply with legal obligations, and act with your consent. You may withdraw consent prospectively, but withdrawal does not affect processing already completed or processing permitted on another lawful basis.</p>
              </section>

              <section>
                <div className="planner-head">8. Retention and deletion</div>
                <p className="muted">We retain account and service information while your account is active and afterward only as reasonably necessary for the purposes described here, including security, fraud prevention, dispute resolution, tax, accounting, and legal obligations. OAuth state records expire after approximately ten minutes. Kroger tokens are retained until you disconnect Kroger, delete your account, or the connection becomes invalid. Deletion from active systems may not immediately remove information from security backups, which are isolated and expire according to the applicable backup lifecycle.</p>
              </section>

              <section>
                <div className="planner-head">9. Your privacy rights</div>
                <p className="muted">Depending on where you live, you may have rights to know or access personal information; correct inaccuracies; obtain a portable copy; delete information; withdraw consent; opt out of sale, sharing, targeted advertising, or qualifying profiling; limit certain uses of sensitive information; and receive equal service without unlawful discrimination. BurnNByte does not currently sell personal information or use it for cross-context behavioral advertising. Submit a request to <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a>. You may appeal a denied request by replying with &quot;Privacy Appeal.&quot; You may also complain to the privacy regulator or attorney general in your jurisdiction.</p>
              </section>

              <section>
                <div className="planner-head">10. Security</div>
                <p className="muted">We use administrative, technical, and organizational safeguards designed for the nature of the information processed. Kroger OAuth tokens are encrypted at rest and credentials are restricted to server-side use. No system is completely secure, and we cannot guarantee absolute security. If a legally reportable breach occurs, we will provide notices as required by applicable law.</p>
              </section>

              <section>
                <div className="planner-head">11. Cookies and mobile applications</div>
                <p className="muted">We use cookies and similar local technologies that are necessary for authentication, session security, preferences, and core functionality. Mobile operating systems and application stores may independently process device and diagnostics information under their own policies.</p>
              </section>

              <section>
                <div className="planner-head">12. Children</div>
                <p className="muted">The Service is intended for adults and is not directed to children under 18. We do not knowingly collect personal information from a child under 13. Contact us if you believe a child has provided information so we can investigate and take appropriate action.</p>
              </section>

              <section>
                <div className="planner-head">13. International processing</div>
                <p className="muted">Information may be processed in the United States and other locations where our service providers operate. Where required, we use legally recognized safeguards for cross-border transfers.</p>
              </section>

              <section>
                <div className="planner-head">14. Changes to this policy</div>
                <p className="muted">We may update this policy to reflect changes in the Service, our practices, or applicable law. We will post the revised policy with a new effective date and provide additional notice or obtain consent when legally required.</p>
              </section>

              <section>
                <div className="planner-head">15. Contact us</div>
                <p className="muted">Privacy requests, questions, and appeals may be sent to <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a>.{mailingAddress ? <> You may also write to {legalName}, {mailingAddress}.</> : null}</p>
                <p className="muted">See also our <Link href="/terms">Terms &amp; Conditions</Link>.</p>
              </section>
            </div>
          </article>
        </div>
      </div>
    </main>
  );
}
