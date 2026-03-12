import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp, destroyTestApp, type TestContext } from '../setup.js';

describe('Onboarding Flow', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await destroyTestApp(ctx);
  });

  it('should verify health endpoint is available', async () => {
    const res = await ctx.app.inject({
      method: 'GET',
      url: '/api/health',
    });
    expect(res.statusCode).toBe(200);
  });

  it('should create a budget alert (simulating org setup)', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/budget-alerts',
      payload: {
        id: ctx.testOrgId,
        name: 'Test Org Budget',
        budget_type: 'monthly',
        threshold_usd: 100,
        warning_percent: 80,
        current_spend_usd: 0,
        enabled: 1,
        auto_pause: 0,
        last_triggered_at: '',
        agent_filter: '{}',
      },
    });
    expect(res.statusCode).toBeLessThan(400);
  });

  it('should create an alert channel (simulating notification setup)', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/alert-channels',
      payload: {
        id: `ch-${ctx.testOrgId}`,
        name: 'Test Slack Channel',
        channel_type: 'slack',
        config: JSON.stringify({ webhook_url: 'https://hooks.slack.test/test' }),
        enabled: 1,
        severity_filter: 'warning',
      },
    });
    expect(res.statusCode).toBeLessThan(400);
  });

  it('should list alert channels after setup', async () => {
    const res = await ctx.app.inject({
      method: 'GET',
      url: '/api/alert-channels',
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(1);
  });

  it('should verify audit trail via alert events', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/alert-events',
      payload: {
        id: `ae-${ctx.testOrgId}`,
        alert_type: 'onboarding',
        severity: 'info',
        title: 'Organization created',
        message: `Organization ${ctx.testOrgId} was created`,
        channel_name: 'Test Slack Channel',
        delivered: 1,
        acknowledged_at: '',
        metadata: JSON.stringify({ org_id: ctx.testOrgId }),
      },
    });
    expect(res.statusCode).toBeLessThan(400);

    // Verify the event was stored
    const listRes = await ctx.app.inject({
      method: 'GET',
      url: '/api/alert-events',
    });
    expect(listRes.statusCode).toBe(200);
    const events = listRes.json();
    expect(events.some((e: Record<string, unknown>) => e.alert_type === 'onboarding')).toBe(true);
  });
});
