import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
});

interface StatCardProps {
  label: string;
  value: string;
  delta?: string;
  positive?: boolean;
}

function StatCard({ label, value, delta, positive }: StatCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      {delta && (
        <p className={`mt-1 text-sm font-medium ${positive ? 'text-success-600' : 'text-error-600'}`}>
          {positive ? '↓' : '↑'} {delta}
        </p>
      )}
    </div>
  );
}

function DashboardPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Real-time LLM cost and usage overview</p>
      </div>

      <div className="mb-8 grid grid-cols-4 gap-6">
        <StatCard label="Total Cost (30d)" value="$247.83" delta="12% vs last month" positive />
        <StatCard label="API Calls (30d)" value="48,291" delta="8% vs last month" />
        <StatCard label="Avg Cost / Call" value="$0.0051" delta="19% vs last month" positive />
        <StatCard label="Duplicate Ratio" value="23%" delta="5pp vs last month" positive />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-800">Cost Trend</h2>
          <div className="flex h-48 items-center justify-center text-gray-400 text-sm">
            Chart — connect recharts here
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-800">By Provider</h2>
          <div className="space-y-3">
            {[
              { provider: 'OpenAI', cost: '$142.10', pct: 57 },
              { provider: 'Anthropic', cost: '$78.40', pct: 32 },
              { provider: 'Google', cost: '$27.33', pct: 11 },
            ].map((row) => (
              <div key={row.provider}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-gray-700">{row.provider}</span>
                  <span className="font-medium text-gray-900">{row.cost}</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100">
                  <div
                    className="h-2 rounded-full bg-primary-500"
                    style={{ width: `${row.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-800">Recent Activity</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-gray-500">
              <th className="pb-3 font-medium">Session</th>
              <th className="pb-3 font-medium">Model</th>
              <th className="pb-3 font-medium">Calls</th>
              <th className="pb-3 font-medium">Cost</th>
              <th className="pb-3 font-medium">Patterns</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-gray-700">
            {[
              { session: 'analyze-run-291', model: 'gpt-4o', calls: 142, cost: '$1.83', patterns: 'Duplicates (12)' },
              { session: 'analyze-run-290', model: 'claude-3-5-sonnet', calls: 89, cost: '$0.94', patterns: '—' },
              { session: 'analyze-run-289', model: 'gpt-4o-mini', calls: 312, cost: '$0.47', patterns: 'Overqualified (8)' },
            ].map((row) => (
              <tr key={row.session}>
                <td className="py-3 font-mono text-xs text-gray-500">{row.session}</td>
                <td className="py-3">{row.model}</td>
                <td className="py-3">{row.calls}</td>
                <td className="py-3 font-medium">{row.cost}</td>
                <td className="py-3 text-warning-600">{row.patterns}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
