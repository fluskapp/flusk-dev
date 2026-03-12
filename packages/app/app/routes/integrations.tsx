import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/integrations')({
  component: IntegrationsPage,
});

interface Integration {
  name: string;
  description: string;
  status: 'active' | 'available' | 'coming-soon';
  package?: string;
}

const INTEGRATIONS: Integration[] = [
  {
    name: 'OpenAI',
    description: 'Automatic instrumentation for openai npm package (v4 & v6)',
    status: 'active',
    package: '@flusk/sdk',
  },
  {
    name: 'Anthropic',
    description: 'Automatic instrumentation for @anthropic-ai/sdk',
    status: 'active',
    package: '@flusk/sdk',
  },
  {
    name: 'Google AI',
    description: 'Instrumentation for @google/generative-ai and Vertex AI',
    status: 'active',
    package: '@flusk/sdk',
  },
  {
    name: 'AWS Bedrock',
    description: 'AWS Bedrock LLM call tracking via @aws-sdk/client-bedrock-runtime',
    status: 'available',
  },
  {
    name: 'Cohere',
    description: 'Cohere API instrumentation',
    status: 'coming-soon',
  },
  {
    name: 'Mistral',
    description: 'Mistral AI SDK instrumentation',
    status: 'coming-soon',
  },
];

const STATUS_STYLES: Record<Integration['status'], string> = {
  active: 'bg-success-100 text-success-700',
  available: 'bg-secondary-100 text-secondary-700',
  'coming-soon': 'bg-gray-100 text-gray-500',
};

const STATUS_LABELS: Record<Integration['status'], string> = {
  active: 'Active',
  available: 'Available',
  'coming-soon': 'Coming Soon',
};

function IntegrationsPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
        <p className="mt-1 text-sm text-gray-500">
          Zero-touch OTel auto-instrumentation. Add{' '}
          <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs">require('@flusk/otel/register')</code>{' '}
          to your app and all LLM calls are tracked automatically.
        </p>
      </div>

      <div className="mb-8 rounded-xl border border-primary-200 bg-primary-50 p-5">
        <h2 className="mb-1 text-sm font-semibold text-primary-800">Quick Setup</h2>
        <pre className="mt-2 rounded-lg bg-gray-900 p-4 text-xs text-gray-100">
          {`# Install
npm install @flusk/sdk

# Add to your app entry point
import '@flusk/otel/register';

# Run analysis
npx @flusk/cli analyze ./your-app.js`}
        </pre>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {INTEGRATIONS.map((integration) => (
          <div
            key={integration.name}
            className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div className="mb-3 flex items-start justify-between">
              <h3 className="text-base font-semibold text-gray-900">{integration.name}</h3>
              <span
                className={`rounded-full px-3 py-0.5 text-xs font-medium ${STATUS_STYLES[integration.status]}`}
              >
                {STATUS_LABELS[integration.status]}
              </span>
            </div>
            <p className="mb-4 text-sm text-gray-600">{integration.description}</p>
            {integration.package && (
              <p className="text-xs text-gray-400">
                Provided by{' '}
                <code className="rounded bg-gray-100 px-1 font-mono">{integration.package}</code>
              </p>
            )}
            {integration.status === 'active' && (
              <button className="mt-3 rounded-lg bg-primary-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-primary-600">
                View Docs
              </button>
            )}
            {integration.status === 'available' && (
              <button className="mt-3 rounded-lg border border-gray-200 px-4 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
                Learn More
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
