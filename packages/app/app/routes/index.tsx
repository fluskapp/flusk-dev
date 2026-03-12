import { createFileRoute, Link } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-24">
      <div className="text-center">
        <h1 className="mb-4 text-5xl font-bold text-gray-900">
          LLM Cost <span className="text-primary-500">Optimization</span>
        </h1>
        <p className="mb-8 text-xl text-gray-600">
          One command, zero setup. Track LLM API calls, detect patterns,
          and slash your AI infrastructure costs.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            to="/dashboard"
            className="rounded-lg bg-primary-500 px-6 py-3 font-medium text-white shadow-md hover:bg-primary-600"
          >
            Open Dashboard
          </Link>
          <a
            href="https://docs.flusk.dev"
            className="rounded-lg border border-gray-300 px-6 py-3 font-medium text-gray-700 hover:bg-gray-50"
          >
            Documentation
          </a>
        </div>
      </div>

      <div className="mt-24 grid grid-cols-3 gap-8">
        {[
          {
            title: 'Dashboard',
            desc: 'Real-time cost tracking, usage trends, and budget alerts across all LLM providers.',
            href: '/dashboard',
          },
          {
            title: 'Workflows',
            desc: 'Visualize and optimize your AI pipelines. Detect duplicates, similar prompts, and overqualified models.',
            href: '/workflows',
          },
          {
            title: 'Integrations',
            desc: 'Zero-touch OTel auto-instrumentation for OpenAI, Anthropic, Google, and more.',
            href: '/integrations',
          },
        ].map((card) => (
          <Link
            key={card.href}
            to={card.href}
            className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:border-primary-300 hover:shadow-md"
          >
            <h3 className="mb-2 text-lg font-semibold text-gray-900">{card.title}</h3>
            <p className="text-sm text-gray-600">{card.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
