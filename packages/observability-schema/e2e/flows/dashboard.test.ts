import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp, destroyTestApp, type TestContext } from '../setup.js';
import { randomUUID } from 'node:crypto';

describe('Dashboard Flow', () => {
  let ctx: TestContext;
  let dashboardId: string;

  beforeAll(async () => {
    ctx = await createTestApp();
    dashboardId = randomUUID();
  });

  afterAll(async () => {
    await destroyTestApp(ctx);
  });

  it('should create a dashboard', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/dashboards',
      payload: {
        id: dashboardId,
        name: 'Main Overview',
        description: 'Primary observability dashboard',
        layout: JSON.stringify({ columns: 3, rows: 2 }),
        filters: JSON.stringify({ time_range: '7d' }),
        refresh_interval: 30,
        is_default: 1,
        owner: 'admin',
      },
    });
    expect(res.statusCode).toBeLessThan(400);
  });

  it('should add widgets to the dashboard', async () => {
    const widgets = [
      {
        id: randomUUID(),
        dashboard_id: dashboardId,
        widget_type: 'line_chart',
        title: 'Cost Over Time',
        query: JSON.stringify({ metric: 'cost_usd', group_by: 'day' }),
        position: JSON.stringify({ x: 0, y: 0, w: 2, h: 1 }),
        config: JSON.stringify({ color: '#3b82f6' }),
        refresh_override: 0,
      },
      {
        id: randomUUID(),
        dashboard_id: dashboardId,
        widget_type: 'pie_chart',
        title: 'Model Breakdown',
        query: JSON.stringify({ metric: 'cost_usd', group_by: 'model' }),
        position: JSON.stringify({ x: 2, y: 0, w: 1, h: 1 }),
        config: JSON.stringify({}),
        refresh_override: 0,
      },
      {
        id: randomUUID(),
        dashboard_id: dashboardId,
        widget_type: 'table',
        title: 'Top Users',
        query: JSON.stringify({ metric: 'total_tokens', group_by: 'agent_name', limit: 10 }),
        position: JSON.stringify({ x: 0, y: 1, w: 3, h: 1 }),
        config: JSON.stringify({ sortable: true }),
        refresh_override: 60,
      },
    ];

    for (const widget of widgets) {
      const res = await ctx.app.inject({
        method: 'POST',
        url: '/api/dashboard-widgets',
        payload: widget,
      });
      expect(res.statusCode).toBeLessThan(400);
    }
  });

  it('should fetch the dashboard by id', async () => {
    const res = await ctx.app.inject({
      method: 'GET',
      url: `/api/dashboards/${dashboardId}`,
    });
    expect(res.statusCode).toBe(200);
    const dashboard = res.json();
    expect(dashboard.name).toBe('Main Overview');
    expect(dashboard.is_default).toBe(1);
  });

  it('should list dashboard widgets', async () => {
    const res = await ctx.app.inject({
      method: 'GET',
      url: '/api/dashboard-widgets',
    });
    expect(res.statusCode).toBe(200);
    const widgets = res.json();
    expect(widgets.length).toBeGreaterThanOrEqual(3);
  });

  it('should render dashboard data', async () => {
    const res = await ctx.app.inject({
      method: 'GET',
      url: `/api/dashboards/${dashboardId}/render`,
    });
    expect(res.statusCode).toBeLessThan(500);
  });

  it('should update dashboard', async () => {
    const res = await ctx.app.inject({
      method: 'PUT',
      url: `/api/dashboards/${dashboardId}`,
      payload: {
        id: dashboardId,
        name: 'Main Overview (Updated)',
        description: 'Updated dashboard',
        layout: JSON.stringify({ columns: 4, rows: 3 }),
        filters: JSON.stringify({ time_range: '30d' }),
        refresh_interval: 60,
        is_default: 1,
        owner: 'admin',
      },
    });
    expect(res.statusCode).toBeLessThan(400);
  });

  it('should delete dashboard', async () => {
    const res = await ctx.app.inject({
      method: 'DELETE',
      url: `/api/dashboards/${dashboardId}`,
    });
    expect(res.statusCode).toBe(204);

    // Verify gone
    const getRes = await ctx.app.inject({
      method: 'GET',
      url: `/api/dashboards/${dashboardId}`,
    });
    expect(getRes.statusCode).toBe(404);
  });
});
