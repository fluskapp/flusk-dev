import { createRootRoute, Outlet, Link } from '@tanstack/react-router';

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <nav className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-primary-500">Flusk</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link
              to="/dashboard"
              className="text-sm font-medium text-gray-600 hover:text-primary-500 [&.active]:text-primary-500"
            >
              Dashboard
            </Link>
            <Link
              to="/workflows"
              className="text-sm font-medium text-gray-600 hover:text-primary-500 [&.active]:text-primary-500"
            >
              Workflows
            </Link>
            <Link
              to="/integrations"
              className="text-sm font-medium text-gray-600 hover:text-primary-500 [&.active]:text-primary-500"
            >
              Integrations
            </Link>
          </div>
        </div>
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
