'use strict'

module.exports = async function seed({ entities, logger }) {
  // Tenant
  const tenant = await entities.tenant.save({
    input: {
      name: 'Acme Corp',
      slug: 'acme',
      plan: 'pro',
      maxUsers: 50,
      maxSolutions: 100,
    }
  })
  const tenantId = tenant.id ?? tenant[0]?.id
  logger.info({ tenantId }, 'Created tenant: acme')

  // Users
  const admin = await entities.user.save({
    input: { tenantId, email: 'admin@acme.com', name: 'Admin User', role: 'admin', team: 'Engineering' }
  })
  const adminId = admin.id ?? admin[0]?.id

  const builder = await entities.user.save({
    input: { tenantId, email: 'builder@acme.com', name: 'Builder User', role: 'builder', team: 'Engineering' }
  })
  const builderId = builder.id ?? builder[0]?.id

  const viewer = await entities.user.save({
    input: { tenantId, email: 'viewer@acme.com', name: 'Regular User', role: 'user', team: 'Sales' }
  })
  const viewerId = viewer.id ?? viewer[0]?.id
  logger.info('Created 3 users (admin, builder, viewer)')

  // Roles
  const roles = [
    { tenantId, name: 'engineering', description: 'Engineering team', permissions: JSON.stringify(['solutions.view', 'solutions.publish', 'solutions.build', 'guards.manage']), isDefault: 0, createdBy: adminId },
    { tenantId, name: 'sales', description: 'Sales team', permissions: JSON.stringify(['solutions.view']), isDefault: 0, createdBy: adminId },
    { tenantId, name: 'everyone', description: 'Default role for all users', permissions: JSON.stringify(['solutions.view']), isDefault: 1, createdBy: adminId },
  ]
  for (const r of roles) {
    await entities.role.save({ input: r })
  }
  logger.info(`Created ${roles.length} roles`)

  // Solutions with tags and intent patterns
  const solutions = [
    {
      slug: 'support-agent', name: 'Support Agent',
      description: 'AI-powered support agent that handles customer tickets, answers questions, and escalates issues',
      icon: '🎧', solutionType: 'custom', status: 'published',
      tags: JSON.stringify(['support', 'help', 'ticket', 'customer', 'issue', 'bug']),
      intentPatterns: JSON.stringify(['I need help', 'open a ticket', 'report a bug', 'customer support', 'something is broken']),
    },
    {
      slug: 'jira-summarizer', name: 'Jira Summarizer',
      description: 'Summarizes Jira sprints, generates standup reports, and tracks project velocity',
      icon: '📋', solutionType: 'rovo-agent', status: 'published',
      tags: JSON.stringify(['jira', 'sprint', 'summary', 'standup', 'project', 'tickets']),
      intentPatterns: JSON.stringify(['summarize jira', 'sprint status', 'what happened in jira', 'standup summary']),
    },
    {
      slug: 'code-reviewer', name: 'Code Reviewer',
      description: 'AI code reviewer that checks PRs for bugs, security issues, and best practices',
      icon: '🔍', solutionType: 'custom', status: 'published',
      tags: JSON.stringify(['code', 'review', 'PR', 'pull request', 'github', 'quality']),
      intentPatterns: JSON.stringify(['review my code', 'check this PR', 'code quality']),
    },
    {
      slug: 'meeting-notes', name: 'Meeting Notes',
      description: 'Transcribes meetings, extracts action items, sends summaries to Slack',
      icon: '📝', solutionType: 'gemini', status: 'published',
      tags: JSON.stringify(['meeting', 'notes', 'transcript', 'action items', 'summary']),
      intentPatterns: JSON.stringify(['meeting notes', 'summarize meeting', 'action items']),
    },
    {
      slug: 'onboarding-guide', name: 'Onboarding Guide',
      description: 'Interactive onboarding guide for new hires — tools setup, processes, FAQs',
      icon: '🚀', solutionType: 'custom', status: 'published',
      tags: JSON.stringify(['onboarding', 'new hire', 'training', 'guide', 'setup']),
      intentPatterns: JSON.stringify(['new employee', 'onboarding', 'getting started', 'how do I']),
    },
  ]
  for (const s of solutions) {
    await entities.solution.save({
      input: { ...s, tenantId, createdBy: adminId }
    })
  }
  logger.info(`Created ${solutions.length} solutions`)

  // Solution Access rules
  const accessRules = [
    // Support Agent — everyone in tenant
    { tenantId, solutionId: 1, accessType: 'all', accessValue: null, grantedBy: adminId },
    // Jira Summarizer — engineering role only
    { tenantId, solutionId: 2, accessType: 'role', accessValue: 'engineering', grantedBy: adminId },
    { tenantId, solutionId: 2, accessType: 'role', accessValue: 'admin', grantedBy: adminId },
    // Code Reviewer — engineering team
    { tenantId, solutionId: 3, accessType: 'team', accessValue: 'Engineering', grantedBy: adminId },
    // Meeting Notes — everyone
    { tenantId, solutionId: 4, accessType: 'all', accessValue: null, grantedBy: adminId },
    // Onboarding Guide — everyone
    { tenantId, solutionId: 5, accessType: 'all', accessValue: null, grantedBy: adminId },
  ]
  for (const a of accessRules) {
    await entities.solutionAccess.save({ input: a })
  }
  logger.info(`Created ${accessRules.length} access rules`)

  // Guards
  const guards = [
    // Support Agent — rate limit 50/hour
    { tenantId, solutionId: 1, guardType: 'rate-limit', config: JSON.stringify({ maxPerHour: 50, maxPerDay: 500 }), enabled: 1, priority: 0, createdBy: adminId },
    // Jira Summarizer — budget guard $100/month
    { tenantId, solutionId: 2, guardType: 'budget', config: JSON.stringify({ maxCostPerMonth: 100, currency: 'USD' }), enabled: 1, priority: 0, createdBy: adminId },
    // Code Reviewer — rate limit 20/hour + budget
    { tenantId, solutionId: 3, guardType: 'rate-limit', config: JSON.stringify({ maxPerHour: 20, maxPerDay: 200 }), enabled: 1, priority: 0, createdBy: adminId },
    { tenantId, solutionId: 3, guardType: 'budget', config: JSON.stringify({ maxCostPerMonth: 200, currency: 'USD' }), enabled: 1, priority: 1, createdBy: adminId },
  ]
  for (const g of guards) {
    await entities.guard.save({ input: g })
  }
  logger.info(`Created ${guards.length} guards`)

  // Publish Logs
  for (let i = 1; i <= 5; i++) {
    await entities.publishLog.save({
      input: {
        tenantId,
        solutionId: i,
        action: 'publish',
        fromStatus: 'testing',
        toStatus: 'published',
        targetAudience: JSON.stringify(accessRules.filter(a => a.solutionId === i)),
        metadata: JSON.stringify({ publishedBy: adminId, reason: 'Initial publish' }),
        performedBy: adminId,
      }
    })
  }
  logger.info('Created publish logs')
}
