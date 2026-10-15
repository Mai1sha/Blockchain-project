
export default function Home() {
  const features = [
    {
      title: "Verified Service Providers",
      description:
        "Service providers complete off-chain KYC verification and connect their blockchain wallets. Verification status can be recorded on-chain without exposing personal documents.",
    },
    {
      title: "Engagement Tracking",
      description:
        "Important engagement actions, including acceptance, delivery attestation, and completion, are recorded on the blockchain to create a tamper-evident history.",
    },
    {
      title: "Smart Contract Escrow",
      description:
        "Clients fund smart-contract escrow using cryptocurrency. After the client accepts the completed work, the provider can withdraw the payment.",
    },
    {
      title: "Private Communication",
      description:
        "Client-provider messages, project requirements, personal information, and professional deliverables remain off-chain to protect privacy.",
    },
  ];

  const steps = [
    {
      number: "01",
      title: "Provider Verification",
      description:
        "A service provider completes off-chain identity verification and links a blockchain wallet.",
    },
    {
      number: "02",
      title: "Create an Engagement",
      description:
        "A client selects a provider, agrees on the service, and funds cryptocurrency escrow.",
    },
    {
      number: "03",
      title: "Submit the Work",
      description:
        "The provider delivers the work privately and records a delivery attestation on-chain.",
    },
    {
      number: "04",
      title: "Complete and Pay",
      description:
        "The client accepts the work, the engagement is marked completed, and the provider can withdraw the escrowed funds.",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* Navigation */}
      <header className="border-b border-slate-200 bg-white">
        <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <a
            href="#home"
            className="text-xl font-bold text-indigo-700"
          >
            ServicePortal
          </a>

          <div className="flex flex-wrap items-center gap-5">
            <a
              href="#about"
              className="text-sm font-medium text-slate-600 hover:text-indigo-700"
            >
              About
            </a>

            <a
              href="#features"
              className="text-sm font-medium text-slate-600 hover:text-indigo-700"
            >
              Features
            </a>

            <a
              href="#team"
              className="text-sm font-medium text-slate-600 hover:text-indigo-700"
            >
              Team
            </a>

            <a
              href="https://github.com/Mai1sha/Blockchain-project"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-indigo-700 hover:underline"
            >
              GitHub Repository ↗
            </a>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section
        id="home"
        className="bg-gradient-to-r from-indigo-700 to-violet-800 px-6 py-24 text-center text-white"
      >
        <div className="mx-auto max-w-4xl">
          <p className="mb-5 text-sm font-semibold uppercase tracking-widest text-indigo-200">
            Blockchain Course Project
          </p>

          <h1 className="mb-6 text-4xl font-bold leading-tight md:text-6xl">
            Online Professional-Service Portal
          </h1>

          <p className="mx-auto max-w-3xl text-lg leading-8 text-indigo-100">
            A blockchain-supported marketplace connecting
            clients with independent tutors, developers,
            designers, writers, and consultants through
            verifiable engagement records and smart-contract
            escrow.
          </p>

          <a
            href="#about"
            className="mt-9 inline-block rounded-lg bg-white px-8 py-3 font-semibold text-indigo-700 transition hover:bg-indigo-50"
          >
            Learn About Our Project
          </a>
        </div>
      </section>

      {/* Problem Statement */}
      <section
        id="about"
        className="mx-auto max-w-5xl px-6 py-20"
      >
        <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-indigo-700">
          Why This Project?
        </p>

        <h2 className="mb-6 text-3xl font-bold">
          The Problem
        </h2>

        <p className="text-lg leading-8 text-slate-600">
          Traditional professional-service platforms
          maintain provider verification, engagement
          histories, and payment records through
          centralized infrastructure. Clients and
          service providers depend on the platform
          to confirm important actions and resolve
          conflicting claims.
        </p>

        <p className="mt-5 text-lg leading-8 text-slate-600">
          Our project explores using blockchain to
          maintain a shared, tamper-evident record
          of selected engagement actions while
          keeping sensitive information, private
          communication, and professional work
          off-chain.
        </p>
      </section>

      {/* Features */}
      <section
        id="features"
        className="bg-white px-6 py-20"
      >
        <div className="mx-auto max-w-6xl">
          <p className="mb-3 text-center text-sm font-semibold uppercase tracking-wider text-indigo-700">
            Our Solution
          </p>

          <h2 className="mb-4 text-center text-3xl font-bold">
            Proposed Features
          </h2>

          <p className="mx-auto mb-12 max-w-2xl text-center text-slate-600">
            Our platform combines conventional web
            functionality with blockchain-based
            verification, engagement records,
            and cryptocurrency escrow.
          </p>

          <div className="grid gap-6 md:grid-cols-2">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-slate-200 bg-slate-50 p-8 transition hover:border-indigo-300 hover:shadow-md"
              >
                <h3 className="mb-3 text-xl font-semibold text-indigo-700">
                  {feature.title}
                </h3>

                <p className="leading-7 text-slate-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-4 text-center text-3xl font-bold">
            How It Works
          </h2>

          <p className="mx-auto mb-12 max-w-2xl text-center text-slate-600">
            The proposed workflow follows a service
            engagement from provider verification
            to final payment.
          </p>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <div
                key={step.number}
                className="rounded-xl border border-slate-200 bg-white p-6"
              >
                <span className="mb-4 block text-3xl font-bold text-indigo-600">
                  {step.number}
                </span>

                <h3 className="mb-3 text-lg font-semibold">
                  {step.title}
                </h3>

                <p className="text-sm leading-6 text-slate-600">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Blockchain Architecture */}
      <section className="bg-white px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-10 text-center text-3xl font-bold">
            On-Chain vs. Off-Chain
          </h2>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-8">
              <h3 className="mb-4 text-xl font-semibold text-indigo-700">
                On-Chain
              </h3>

              <ul className="list-inside list-disc space-y-3 text-slate-700">
                <li>Wallet-linked verification status</li>
                <li>Engagement state transitions</li>
                <li>Delivery and completion attestations</li>
                <li>Cryptocurrency escrow transactions</li>
              </ul>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-8">
              <h3 className="mb-4 text-xl font-semibold text-slate-800">
                Off-Chain
              </h3>

              <ul className="list-inside list-disc space-y-3 text-slate-700">
                <li>KYC documents and personal information</li>
                <li>Service provider profiles and listings</li>
                <li>Client-provider messages</li>
                <li>Project files and deliverables</li>
              </ul>
            </div>
          </div>

          <p className="mt-8 text-center text-sm leading-6 text-slate-500">
            Blockchain records provide evidence of
            wallet actions, but do not independently
            prove real-world identity or the quality
            of completed work.
          </p>
        </div>
      </section>

      {/* Team */}
      <section
        id="team"
        className="px-6 py-20 text-center"
      >
        <h2 className="mb-5 text-3xl font-bold">
          Our Team
        </h2>

        <p className="text-xl font-medium text-slate-700">
          Sadia Alam & Maisha
        </p>

        <p className="mt-4 text-slate-500">
          Blockchain Project — Online Professional-Service Portal
        </p>

        <a
          href="https://github.com/Mai1sha/Blockchain-project"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-block font-semibold text-indigo-700 hover:underline"
        >
          View Our Project on GitHub ↗
        </a>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 px-6 py-8 text-center text-slate-300">
        <p className="font-semibold">
          Online Professional-Service Portal
        </p>

        <p className="mt-2 text-sm text-slate-400">
          A blockchain-supported professional-service marketplace.
        </p>

        <p className="mt-3 text-xs text-slate-500">
          Project features are currently under development.
        </p>
      </footer>
    </main>
  );
}
