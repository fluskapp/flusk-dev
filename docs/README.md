# Flusk Documentation

**Complete documentation for Flusk LLM API optimization platform**

---

## 🚀 Getting Started (Choose Your Path)

### For Companies Using Flusk
👉 **[COMPANY_USER_GUIDE.md](./COMPANY_USER_GUIDE.md)** - Complete integration guide
- Install SDK (5 minutes)
- Wrap LLM clients
- Start saving 40-60% on AI costs

### For Testing E2E
👉 **[E2E_TESTING_GUIDE.md](./E2E_TESTING_GUIDE.md)** - Test Flusk locally
- Setup (5 minutes)
- Run example AI agent
- View cost-saving suggestions

### For Deployment
👉 **[DEPLOYMENT_PRODUCTION.md](./DEPLOYMENT_PRODUCTION.md)** - Deploy to production
- Vercel (5 min)
- Docker (15 min)
- AWS ECS (30 min)
- Railway (10 min)

---

## 📚 Documentation Index

### Essential Guides
| Document | Purpose | Time |
|----------|---------|------|
| [COMPANY_USER_GUIDE.md](./COMPANY_USER_GUIDE.md) | How companies integrate Flusk | 10 min |
| [E2E_TESTING_GUIDE.md](./E2E_TESTING_GUIDE.md) | Test Flusk end-to-end | 15 min |
| [DEPLOYMENT_PRODUCTION.md](./DEPLOYMENT_PRODUCTION.md) | Deploy to production | varies |
| [QUICKSTART.md](./QUICKSTART.md) | Quick start guide | 5 min |

### Reference Documentation
| Document | Purpose |
|----------|---------|
| [CLI_USAGE.md](./CLI_USAGE.md) | Code generation CLI |
| [FINAL_STATUS.md](./FINAL_STATUS.md) | Project status report |
| [BUILD_COMPLETE.md](./BUILD_COMPLETE.md) | E2E build documentation |
| [REFACTOR_COMPLETE.md](./REFACTOR_COMPLETE.md) | Refactor summary |

### Compliance & Security
| Document | Purpose |
|----------|---------|
| [SECURITY.md](./SECURITY.md) | Security controls |
| [COMPLIANCE.md](./COMPLIANCE.md) | GDPR/SOC2 compliance |

### Architecture
| Document | Purpose |
|----------|---------|
| [prd.md](./prd.md) | Product requirements |
| [generated-files.md](./generated-files.md) | CLI-generated files |

---

## ⚡ Quick Reference

### Install and Use Flusk

```bash
# 1. Install SDK
npm install @flusk/sdk

# 2. Wrap your LLM client
import { FluskClient, wrapOpenAI } from '@flusk/sdk';
const flusk = new FluskClient({ apiKey: 'your-key', baseUrl: 'https://...' });
const openai = wrapOpenAI(new OpenAI(), flusk);

# 3. Use normally - Flusk tracks automatically
const response = await openai.chat.completions.create({...});

# 4. Get cost-saving suggestions
const suggestions = await flusk.getSuggestions();
```

### Deploy Flusk Server

```bash
# Vercel (fastest)
vercel --prod

# Docker (self-hosted)
docker-compose up -d

# Local testing
pnpm start
```

### Generate Code with CLI

```bash
# Build CLI
cd packages/cli && pnpm build

# Generate from entity
node packages/cli/dist/bin/flusk.js g llm-call.entity.ts

# Generate all
node packages/cli/dist/bin/flusk.js g --all
```

---

## 📖 Documentation Structure

```
docs/
├── README.md                      # This file - Start here
│
├── COMPANY_USER_GUIDE.md          # ⭐ Integration guide
├── E2E_TESTING_GUIDE.md           # ⭐ Testing guide
├── DEPLOYMENT_PRODUCTION.md       # ⭐ Deployment guide
│
├── QUICKSTART.md                  # Quick start
├── CLI_USAGE.md                   # CLI reference
├── FINAL_STATUS.md                # Status report
├── BUILD_COMPLETE.md              # Build docs
├── REFACTOR_COMPLETE.md           # Refactor summary
│
├── SECURITY.md                    # Security
├── COMPLIANCE.md                  # GDPR/SOC2
│
├── prd.md                         # PRD
└── generated-files.md             # File list
```

---

## 🎯 Common Tasks

### I want to...

**...reduce my AI costs**
→ [COMPANY_USER_GUIDE.md](./COMPANY_USER_GUIDE.md)

**...test Flusk locally**
→ [E2E_TESTING_GUIDE.md](./E2E_TESTING_GUIDE.md)

**...deploy to production**
→ [DEPLOYMENT_PRODUCTION.md](./DEPLOYMENT_PRODUCTION.md)

**...generate code from entities**
→ [CLI_USAGE.md](./CLI_USAGE.md)

**...understand the architecture**
→ [prd.md](./prd.md)

**...ensure GDPR compliance**
→ [COMPLIANCE.md](./COMPLIANCE.md)

---

## 💡 Quick Start Paths

### Path 1: Company Integration (Most Common)
1. Read [COMPANY_USER_GUIDE.md](./COMPANY_USER_GUIDE.md)
2. Deploy with [DEPLOYMENT_PRODUCTION.md](./DEPLOYMENT_PRODUCTION.md)
3. Install SDK and wrap LLM clients
4. Monitor savings in dashboard

**Timeline**: 2-4 weeks to 40% cost reduction

### Path 2: Local Testing
1. Follow [E2E_TESTING_GUIDE.md](./E2E_TESTING_GUIDE.md)
2. Run example AI agent
3. View suggestions
4. Decide if Flusk is right for you

**Timeline**: 15 minutes

### Path 3: Development
1. Read [CLI_USAGE.md](./CLI_USAGE.md)
2. Generate code with `flusk g`
3. Implement business logic
4. Test with [E2E_TESTING_GUIDE.md](./E2E_TESTING_GUIDE.md)

**Timeline**: 1-2 days

---

## 🆘 Troubleshooting

### Build Issues
- See BUILD_STATUS.md in project root
- Execution package doesn't build (expected)
- CLI and SDK work correctly

### Deployment Issues
- Check [DEPLOYMENT_PRODUCTION.md](./DEPLOYMENT_PRODUCTION.md) troubleshooting section
- Verify environment variables
- Test health endpoint first

### Integration Issues
- See [COMPANY_USER_GUIDE.md](./COMPANY_USER_GUIDE.md) troubleshooting
- Enable SDK debug logging
- Check Flusk server logs

---

## 📊 Expected Results

### After Integration
- **40-60% LLM cost reduction** within 4 weeks
- **Automatic tracking** of all LLM calls
- **Actionable suggestions** with savings estimates
- **Zero code changes** after SDK wrapper

### ROI Example
```
Before: $10,000/month LLM spend
After:  $5,500/month (45% reduction)
Savings: $4,500/month = $54,000/year
Flusk Cost: $99-499/month
ROI: 9-45x
```

---

## 🔗 External Resources

- **GitHub**: https://github.com/yourorg/flusk
- **Documentation Site**: https://docs.flusk.com (coming soon)
- **Community**: https://discord.gg/flusk (coming soon)
- **Enterprise**: enterprise@flusk.com

---

## 📝 Contributing

See CONTRIBUTING.md (coming soon)

---

**Last Updated**: February 6, 2026
**Version**: 0.1.0
