import Navigation from "../components/navigation/Navigation"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Terms of Use - DeepFakeAI",
  description: "Terms and conditions governing the use of DeepFakeAI media verification services.",
}

export default function TermsOfUsePage() {
  return (
    <Navigation>
      <main className="grow mx-auto px-6 py-10 max-w-4xl text-gray-200">
        <div className="border-b border-gray-700 pb-6 mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Terms of Use</h1>
          <p className="text-sm text-gray-400 mt-2">Effective: September 2026</p>
        </div>

        <div className="space-y-8 leading-relaxed">
          <section className="bg-gray-800/60 border border-gray-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-lime-400 mb-3">1. Acceptance of Terms</h2>
            <p className="text-gray-300">
              By accessing or using DeepFakeAI (&quot;the Service&quot;), you agree to be bound by these Terms of Use.
              If you do not agree, you must cease using the Service immediately.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">2. Nature of the Service &amp; Disclaimer</h2>
            <p className="text-gray-300">
              DeepFakeAI utilizes an ensemble of machine learning models to detect artificial manipulation in social media
              and uploaded files. <strong>AI detection models are probabilistic.</strong> While our ensemble achieves high accuracy,
              results should not be treated as definitive legal proof or indisputable ground truth.
            </p>
            <p className="text-gray-300">
              You agree to use DeepFakeAI results as investigative and informational guidance rather than the sole basis for critical decisions.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">3. Acceptable Use Policy</h2>
            <p className="text-gray-300">
              You agree NOT to use DeepFakeAI to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 ml-2">
              <li>Conduct denial-of-service attacks, flood API endpoints, or disrupt platform infrastructure.</li>
              <li>Upload illegal content, CSAM, non-consensual imagery, or malware.</li>
              <li>Reverse-engineer detector models or train competing generative evasion tools.</li>
              <li>Misrepresent model probability scores to spread deliberate disinformation.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">4. Intellectual Property</h2>
            <p className="text-gray-300">
              All DeepFakeAI software, website architecture, stylesheets, and custom analytical algorithms are protected
              under applicable intellectual property laws. You retain ownership of media you submit, granting us a limited,
              non-exclusive license strictly to analyze and display detection results for your queries.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">5. Limitation of Liability</h2>
            <p className="text-gray-300">
              To the maximum extent permitted by applicable law, DeepFakeAI and its contributors shall not be liable for any indirect,
              incidental, consequential, or punitive damages arising from the use or inability to use this service.
            </p>
          </section>

          <section className="border-t border-gray-700 pt-6">
            <h2 className="text-xl font-bold text-white mb-2">6. Inquiries</h2>
            <p className="text-gray-300">
              For questions regarding these Terms, please contact us via our{" "}
              <a href="/contact" className="text-lime-400 hover:underline font-semibold">Help &amp; Contact page</a>.
            </p>
          </section>
        </div>
      </main>
    </Navigation>
  )
}
