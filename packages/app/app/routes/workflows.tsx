import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/workflows')({
  component: WorkflowsPage,
});

type PatternType = 'duplicate' | 'similar' | 'overqualified';

interface Pattern {
  id: string;
  type: PatternType;
  description: string;
  savings: string;
  calls: number;
}

const PATTERN_COLORS: Record<PatternType, string> = {
  duplicate: 'bg-error-100 text-error-700',
  similar: 'bg-warning-100 text-warning-700',
  overqualified: 'bg-secondary-100 text-secondary-700',
};

const MOCK_PATTERNS: Pattern[] = [
  { id: 'p1', type: 'duplicate', description: 'Identical prompt sent 12x in last hour', savings: '$0.84', calls: 12 },
  { id: 'p2', type: 'similar', description: '89% similar prompts — consider dedup cache', savings: '$1.20', calls: 34 },
  { id: 'p3', type: 'overqualified', description: 'gpt-4o used for classification tasks (gpt-4o-mini sufficient)', savings: '$3.40', calls: 89 },
  { id: 'p4', type: 'duplicate', description: 'System prompt regenerated every call', savings: '$0.22', calls: 8 },
];

function WorkflowsPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflows</h1>
          <p className="mt-1 text-sm text-gray-500">Detected patterns and optimization opportunities</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Potential monthly savings</p>
          <p className="text-2xl font-bold text-success-600">$165.40</p>
        </div>
      </div>

      <div className="mb-6 flex gap-4">
        {(['all', 'duplicate', 'similar', 'overqualified'] as const).map((filter) => (
          <button
            key={filter}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:border-primary-300 hover:text-primary-600 capitalize"
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {MOCK_PATTERNS.map((pattern) => (
          <div
            key={pattern.id}
            className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${PATTERN_COLORS[pattern.type]}`}
                >
                  {pattern.type}
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-800">{pattern.description}</p>
                  <p className="mt-1 text-xs text-gray-400">{pattern.calls} affected calls</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Est. savings</p>
                <p className="font-semibold text-success-600">{pattern.savings}/day</p>
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button className="rounded-lg bg-primary-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-primary-600">
                Apply Fix
              </button>
              <button className="rounded-lg border border-gray-200 px-4 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
