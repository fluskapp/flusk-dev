# Flusk Dashboard - UI/UX Design Specification

**Complete design for Flusk's web dashboard with user, organization, and provider management**

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [User Roles & Permissions](#user-roles--permissions)
4. [Dashboard Views](#dashboard-views)
5. [Provider Configuration](#provider-configuration)
6. [On-Premise Deployment](#on-premise-deployment)
7. [Technical Stack](#technical-stack)
8. [Wireframes](#wireframes)
9. [Implementation Plan](#implementation-plan)

---

## Overview

### Purpose
The Flusk Dashboard provides a web interface for:
- **Monitoring** LLM usage and costs
- **Viewing** optimization suggestions
- **Managing** provider configurations
- **Configuring** on-premise deployments
- **Tracking** savings and ROI

### Target Users
1. **Developers** - Integrate SDK, view API usage
2. **Finance/BI** - Track costs, view savings reports
3. **Platform Engineers** - Configure providers, deploy on-prem
4. **Executives** - View ROI dashboards, approve optimizations

---

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Flusk Dashboard (Web)                    │
│                    React + Next.js + Tailwind                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Dashboard  │  │   Providers  │  │   Settings   │     │
│  │     View     │  │    Config    │  │   (On-Prem)  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                      API Gateway                             │
│            (server-minimal.ts + Auth Middleware)             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   LLM Call   │  │   Pattern    │  │  Provider    │     │
│  │   Tracking   │  │   Detection  │  │    Config    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 15 + React 19 | Server-side rendering, routing |
| **Styling** | Tailwind CSS + shadcn/ui | Component library, responsive design |
| **Charts** | Recharts | Cost visualization, trends |
| **State** | Zustand | Global state management |
| **API Client** | TanStack Query | Data fetching, caching |
| **Auth** | Clerk / Auth0 | Authentication, SSO |
| **Forms** | React Hook Form + Zod | Form validation |
| **Backend** | server-minimal.ts | Existing API server |

---

## User Roles & Permissions

### Role Matrix

| Feature | Developer | Finance | Platform Engineer | Admin |
|---------|-----------|---------|-------------------|-------|
| View Dashboard | ✅ | ✅ | ✅ | ✅ |
| View Suggestions | ✅ | ✅ | ✅ | ✅ |
| View Costs | ✅ Own | ✅ All | ✅ All | ✅ All |
| Accept Suggestions | ❌ | ✅ | ✅ | ✅ |
| Configure Providers | ❌ | ❌ | ✅ | ✅ |
| Manage Users | ❌ | ❌ | ❌ | ✅ |
| On-Prem Settings | ❌ | ❌ | ✅ | ✅ |
| Billing | ❌ | ✅ | ❌ | ✅ |

### Organization Hierarchy

```
Organization
├── Admin Users (full access)
├── Platform Engineers (configure providers, on-prem)
├── Finance Users (view costs, approve optimizations)
└── Developers (view own usage, read suggestions)
```

---

## Dashboard Views

### 1. Overview Dashboard

**Route**: `/dashboard`

**Purpose**: High-level metrics and trends

#### Layout

```
┌─────────────────────────────────────────────────────────┐
│  Flusk          [Search]      Profile ▼   Notifications │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Overview    Suggestions    Providers    Settings       │
│  ════════                                                │
│                                                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │ Monthly Cost │ │ Total Savings│ │  Active LLMs │   │
│  │              │ │              │ │              │   │
│  │   $4,230    │ │   $1,890    │ │      12      │   │
│  │   ↓ 31%    │ │   ↑ 45%     │ │              │   │
│  └──────────────┘ └──────────────┘ └──────────────┘   │
│                                                          │
│  Cost Trend (Last 30 Days)                             │
│  ┌────────────────────────────────────────────────┐    │
│  │         📈 Line Chart                          │    │
│  │  $6K ┤                                         │    │
│  │  $4K ┤     ●───●───●                          │    │
│  │  $2K ┤───●             ●───●───●──●           │    │
│  │  $0  └──────────────────────────────────────  │    │
│  │        Jan    Feb    Mar    Apr    May        │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  Top Providers                  Recent Activity         │
│  ┌────────────────────────┐    ┌──────────────────┐   │
│  │ OpenAI       60% $2.5K │    │ Pattern detected │   │
│  │ Anthropic    30% $1.3K │    │ 2 mins ago       │   │
│  │ Cohere       10% $0.4K │    │                  │   │
│  └────────────────────────┘    │ Cache rule active│   │
│                                  │ 1 hour ago       │   │
│                                  └──────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

#### Metrics Cards

**Monthly Cost**
- Current month total
- % change from last month
- Breakdown by provider

**Total Savings**
- Accumulated savings
- % of original spend
- Suggestions implemented count

**Active LLMs**
- Number of unique models in use
- Most expensive model
- Most frequently used model

#### Charts

**Cost Trend**
- Line chart: Daily cost over 30 days
- Stacked areas: Cost by provider
- Annotations: Optimization events

**Provider Distribution**
- Pie chart: Spend by provider
- Bar chart: Calls by provider
- Comparison: This month vs last month

---

### 2. Suggestions View

**Route**: `/dashboard/suggestions`

**Purpose**: View and manage cost optimization suggestions

#### Layout

```
┌─────────────────────────────────────────────────────────┐
│  Overview    Suggestions    Providers    Settings       │
│              ═══════════                                 │
│                                                          │
│  💡 Optimization Suggestions                            │
│  [All] [Pending] [Accepted] [Rejected]                  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 🔄 Cache Repeated Prompts                        │  │
│  │                                                   │  │
│  │ Detected 47 identical calls to "What is 2+2?"    │  │
│  │                                                   │  │
│  │ 💰 Estimated Savings: $223/month                 │  │
│  │ 📊 Confidence: 95%                                │  │
│  │ 🕐 TTL Suggestion: 3 hours                       │  │
│  │                                                   │  │
│  │ [Accept] [Reject] [Details]                      │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ ⬇️ Downgrade Model                                │  │
│  │                                                   │  │
│  │ Use gpt-4o-mini instead of gpt-4 for simple      │  │
│  │ classification tasks                             │  │
│  │                                                   │  │
│  │ 💰 Estimated Savings: $171/month                 │  │
│  │ 📊 Confidence: 87%                                │  │
│  │ 📉 Quality Impact: Minimal (<2%)                 │  │
│  │                                                   │  │
│  │ [Accept] [Reject] [Details]                      │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  Total Potential Savings: $394/month                    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

#### Suggestion Card Components

**Header**
- Icon (cache 🔄, downgrade ⬇️, remove ❌)
- Type label
- Status badge (pending/accepted/rejected)

**Body**
- Clear description of optimization
- Pattern detected (with examples)
- Implementation details

**Metrics**
- Monthly savings estimate
- Confidence score
- Quality/risk indicators

**Actions**
- Accept button (requires permissions)
- Reject button
- Details button (shows modal with full analysis)

#### Details Modal

```
┌─────────────────────────────────────────────┐
│  Cache Optimization Details          [X]    │
├─────────────────────────────────────────────┤
│                                              │
│  Pattern Detected                            │
│  ─────────────────                          │
│  Prompt: "What is 2+2?"                     │
│  Occurrences: 47 times                      │
│  First Seen: Jan 15, 2026                   │
│  Last Seen: Feb 5, 2026                     │
│                                              │
│  Cost Analysis                               │
│  ─────────────                              │
│  Current Monthly Cost: $235                  │
│  With Caching: $12                          │
│  Savings: $223 (95%)                        │
│                                              │
│  Implementation                              │
│  ──────────────                             │
│  Cache Type: In-memory (Redis)              │
│  TTL: 3 hours (optimal)                     │
│  Invalidation: Manual + TTL                  │
│                                              │
│  Risks                                       │
│  ─────                                      │
│  • Stale responses if data changes          │
│  • Memory usage: ~50KB per cached item      │
│                                              │
│  [Accept Optimization] [Cancel]             │
│                                              │
└─────────────────────────────────────────────┘
```

---

### 3. Providers Configuration

**Route**: `/dashboard/providers`

**Purpose**: Configure LLM provider settings

#### Layout

```
┌─────────────────────────────────────────────────────────┐
│  Overview    Suggestions    Providers    Settings       │
│                            ═════════                     │
│                                                          │
│  🔌 Provider Configuration                              │
│  [+ Add Provider]                                        │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ OpenAI                              [Edit] [Test] │  │
│  │ ──────                                            │  │
│  │                                                   │  │
│  │ Status: ✅ Active                                 │  │
│  │ API Key: sk-proj-...abc123 (last 6 chars)        │  │
│  │ Base URL: https://api.openai.com/v1              │  │
│  │ Organization ID: org-xxx                          │  │
│  │                                                   │  │
│  │ Models Enabled:                                   │  │
│  │ • gpt-4 (active, $30/$60 per 1M tokens)          │  │
│  │ • gpt-4o ($5/$15 per 1M tokens)                  │  │
│  │ • gpt-4o-mini ($0.15/$0.60 per 1M tokens)        │  │
│  │                                                   │  │
│  │ Rate Limits:                                      │  │
│  │ • Requests: 10,000/min                           │  │
│  │ • Tokens: 2,000,000/min                          │  │
│  │                                                   │  │
│  │ This Month: 45,230 calls, $2,450 spent           │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Anthropic                           [Edit] [Test] │  │
│  │ ─────────                                         │  │
│  │                                                   │  │
│  │ Status: ✅ Active                                 │  │
│  │ API Key: sk-ant-...xyz789                         │  │
│  │ Base URL: https://api.anthropic.com              │  │
│  │                                                   │  │
│  │ Models Enabled:                                   │  │
│  │ • claude-3-opus ($15/$75 per 1M tokens)          │  │
│  │ • claude-3-sonnet ($3/$15 per 1M tokens)         │  │
│  │                                                   │  │
│  │ This Month: 12,450 calls, $1,320 spent           │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

#### Add/Edit Provider Modal

```
┌─────────────────────────────────────────────┐
│  Add Provider                         [X]    │
├─────────────────────────────────────────────┤
│                                              │
│  Provider Type *                             │
│  [OpenAI ▼]                                 │
│                                              │
│  Display Name *                              │
│  [OpenAI Production]                        │
│                                              │
│  API Key *                                   │
│  [sk-proj-..............................]   │
│  🔒 Encrypted and stored securely           │
│                                              │
│  Base URL (Optional)                         │
│  [https://api.openai.com/v1]                │
│  💡 Use custom URL for proxies or on-prem   │
│                                              │
│  Organization ID (Optional)                  │
│  [org-xxx]                                  │
│                                              │
│  ☑ Enable automatic model discovery          │
│  ☑ Track usage and costs                    │
│  ☐ Use as fallback provider                 │
│                                              │
│  Rate Limits (Optional)                      │
│  Requests/min: [10000]                      │
│  Tokens/min: [2000000]                      │
│                                              │
│  [Test Connection] [Save] [Cancel]          │
│                                              │
└─────────────────────────────────────────────┘
```

#### Provider Features

**Supported Providers**
- OpenAI (GPT-4, GPT-4o, GPT-3.5)
- Anthropic (Claude 3 family)
- Cohere (Command R family)
- Azure OpenAI
- Google (Gemini)
- Custom (any OpenAI-compatible API)

**Configuration Options**
- API key management (encrypted)
- Custom base URLs (for proxies/on-prem)
- Model selection and pricing
- Rate limits
- Fallback configuration
- Cost allocation tags

**Actions**
- Test connection
- View usage stats
- Edit configuration
- Disable/enable
- Delete (with confirmation)

---

### 4. On-Premise Configuration

**Route**: `/dashboard/settings/on-premise`

**Purpose**: Configure Flusk for on-premise deployment

#### Layout

```
┌─────────────────────────────────────────────────────────┐
│  Overview    Suggestions    Providers    Settings       │
│                                          ════════        │
│                                                          │
│  ⚙️ On-Premise Configuration                            │
│                                                          │
│  Deployment Mode                                         │
│  ○ Cloud (Flusk-hosted)                                 │
│  ● On-Premise (Self-hosted)                             │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 🏢 Infrastructure Settings                        │  │
│  │                                                   │  │
│  │ Deployment Type:                                  │  │
│  │ [Docker Compose ▼]                               │  │
│  │ Options: Docker, Kubernetes, VM                   │  │
│  │                                                   │  │
│  │ Server URL *                                      │  │
│  │ [https://flusk.yourcompany.com]                  │  │
│  │                                                   │  │
│  │ Database                                          │  │
│  │ ☑ PostgreSQL (external)                          │  │
│  │   Connection String:                             │  │
│  │   [postgresql://user:pass@host:5432/flusk]      │  │
│  │                                                   │  │
│  │ ☑ Redis (caching)                                │  │
│  │   Connection String:                             │  │
│  │   [redis://host:6379]                            │  │
│  │                                                   │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 🔐 Security Settings                              │  │
│  │                                                   │  │
│  │ Authentication                                    │  │
│  │ [Internal (Email/Password) ▼]                    │  │
│  │ Options: Internal, SAML SSO, OIDC, LDAP          │  │
│  │                                                   │  │
│  │ ☑ Enable API key authentication                  │  │
│  │ ☑ Require HTTPS                                  │  │
│  │ ☑ Enable audit logging                           │  │
│  │                                                   │  │
│  │ Encryption Key (32 bytes) *                       │  │
│  │ [Generate Random] [Use Existing]                 │  │
│  │ [••••••••••••••••••••••••••••••••••••]         │  │
│  │                                                   │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 📦 Data Retention                                 │  │
│  │                                                   │  │
│  │ LLM Call Logs: [90 days ▼]                       │  │
│  │ Pattern Data: [365 days ▼]                       │  │
│  │ Audit Logs: [2 years ▼]                          │  │
│  │                                                   │  │
│  │ ☑ Auto-archive to cold storage after retention   │  │
│  │ ☐ Encrypt prompts at rest                        │  │
│  │                                                   │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  [Download Deployment Config] [Save Settings]           │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

#### Deployment Configuration Export

**Download Deployment Config** button generates:

**docker-compose.yml**
```yaml
version: '3.8'
services:
  flusk:
    image: flusk/server:latest
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://...
      - REDIS_URL=redis://...
      - ENCRYPTION_KEY=...
      - AUTH_METHOD=saml
      - SAML_ENTRY_POINT=...
    ports:
      - "3000:3000"
```

**config.env**
```bash
# Generated by Flusk Dashboard
# Date: 2026-02-06
FLUSK_SERVER_URL=https://flusk.yourcompany.com
DATABASE_URL=postgresql://user:pass@host:5432/flusk
REDIS_URL=redis://host:6379
ENCRYPTION_KEY=xxx
AUTH_METHOD=saml
DATA_RETENTION_DAYS=90
```

**kubernetes.yaml** (for K8s deployments)

**README.md** (deployment instructions)

---

### 5. Settings & Admin

**Route**: `/dashboard/settings`

**Purpose**: Organization and user management

#### Tabs

**General**
- Organization name
- Organization ID
- Billing email
- Time zone
- Default currency

**Users**
```
┌──────────────────────────────────────────────┐
│ Users (12)                    [+ Invite User] │
│                                               │
│ Name             Role         Last Active     │
│ ────────────────────────────────────────────  │
│ John Doe         Admin        2 mins ago      │
│ Jane Smith       Finance      1 hour ago      │
│ Bob Johnson      Developer    3 days ago      │
│                                               │
│ [Edit] [Remove]                               │
└──────────────────────────────────────────────┘
```

**API Keys**
```
┌──────────────────────────────────────────────┐
│ API Keys (3)                  [+ Create Key]  │
│                                               │
│ Name              Created      Last Used      │
│ ────────────────────────────────────────────  │
│ Production Key    Jan 1        2 mins ago     │
│ sk-live-...abc123                             │
│ [Regenerate] [Revoke]                         │
│                                               │
│ Staging Key       Jan 15       1 hour ago     │
│ sk-test-...xyz789                             │
│ [Regenerate] [Revoke]                         │
└──────────────────────────────────────────────┘
```

**Billing**
- Current plan
- Usage this month
- Invoice history
- Payment method

**Compliance**
- GDPR settings
- Data export
- Data deletion requests
- Consent management

---

## Provider Configuration

### Configuration Workflow

```
1. Add Provider
   ↓
2. Enter Credentials
   ↓
3. Test Connection
   ↓
4. Select Models
   ↓
5. Set Rate Limits
   ↓
6. Save & Activate
```

### Provider Types

#### 1. Cloud Providers

**OpenAI**
- API key authentication
- Organization ID (optional)
- Model selection
- Custom base URL support

**Anthropic Claude**
- API key authentication
- Model family selection
- Context window configuration

**Cohere**
- API key authentication
- Model selection
- Region selection

#### 2. Azure OpenAI

**Configuration**
- Azure subscription ID
- Resource name
- API key
- Deployment name
- API version

**Example**:
```
Base URL: https://{resource}.openai.azure.com
Deployment: gpt-4-deployment-name
API Version: 2024-02-15-preview
```

#### 3. Custom/On-Premise LLMs

**Configuration**
- Base URL
- Authentication method:
  - API key
  - Bearer token
  - Basic auth
  - Custom headers
- Model list (manual)
- Pricing (manual)

**Example**:
```
Base URL: https://llm.internal.company.com/v1
Auth: Bearer token
Models:
  - company-gpt-large
  - company-gpt-small
```

### Provider Features Matrix

| Feature | OpenAI | Anthropic | Cohere | Azure | Custom |
|---------|--------|-----------|--------|-------|--------|
| Auto Model Discovery | ✅ | ✅ | ✅ | ✅ | ❌ |
| Auto Pricing | ✅ | ✅ | ✅ | ✅ | ❌ |
| Rate Limiting | ✅ | ✅ | ✅ | ✅ | ✅ |
| Fallback Support | ✅ | ✅ | ✅ | ✅ | ✅ |
| Cost Tracking | ✅ | ✅ | ✅ | ✅ | Manual |
| Streaming | ✅ | ✅ | ✅ | ✅ | Depends |

---

## On-Premise Deployment

### Deployment Options

#### Option 1: Docker Compose (Simplest)

**Architecture**:
```
┌─────────────────────────────────────┐
│         Docker Compose               │
├─────────────────────────────────────┤
│                                      │
│  ┌────────┐  ┌────────┐  ┌────────┐│
│  │ Flusk  │  │ Postgres│  │ Redis │││
│  │ Server │  │  +pgvec│  │       │││
│  └────────┘  └────────┘  └────────┘│
│                                      │
└─────────────────────────────────────┘
```

**Setup**:
1. Download config from dashboard
2. Run `docker-compose up -d`
3. Access at `https://localhost:3000`

**Pros**: Easy setup, good for single server
**Cons**: No auto-scaling, manual updates

#### Option 2: Kubernetes (Enterprise)

**Architecture**:
```
┌─────────────────────────────────────┐
│         Kubernetes Cluster           │
├─────────────────────────────────────┤
│                                      │
│  ┌────────────────────────────────┐ │
│  │  Flusk Server (3 replicas)     │ │
│  │  ┌──────┐ ┌──────┐ ┌──────┐   │ │
│  │  │ Pod 1│ │ Pod 2│ │ Pod 3│   │ │
│  │  └──────┘ └──────┘ └──────┘   │ │
│  └────────────────────────────────┘ │
│                                      │
│  ┌──────────┐  ┌──────────┐        │
│  │ Postgres │  │  Redis   │        │
│  │ StatefulSet StatefulSet│        │
│  └──────────┘  └──────────┘        │
│                                      │
│  Ingress (NGINX) → Load Balancer    │
│                                      │
└─────────────────────────────────────┘
```

**Setup**:
1. Download Kubernetes manifests from dashboard
2. Apply with `kubectl apply -f flusk-k8s.yaml`
3. Configure ingress and TLS

**Pros**: Auto-scaling, high availability, production-grade
**Cons**: Complex setup, requires K8s knowledge

#### Option 3: VM/Bare Metal

**Architecture**:
```
┌─────────────────────────────────────┐
│         Virtual Machine              │
├─────────────────────────────────────┤
│                                      │
│  Flusk Server (systemd service)     │
│  PostgreSQL (local)                  │
│  Redis (local)                       │
│  Nginx (reverse proxy)               │
│                                      │
└─────────────────────────────────────┘
```

**Setup**:
1. Install Node.js 22+, PostgreSQL, Redis
2. Download and extract Flusk server
3. Run installation script
4. Configure systemd service

**Pros**: Full control, traditional ops
**Cons**: Manual management, no containerization

### On-Premise Features

#### 1. Data Sovereignty
- All data stays within company network
- No external API calls (except to LLM providers)
- Configurable data retention
- Local encryption keys

#### 2. Custom Authentication
- SAML SSO integration
- LDAP/Active Directory
- OpenID Connect (OIDC)
- Internal auth system

#### 3. Network Configuration
- Run behind corporate firewall
- VPN-only access
- Internal DNS
- Custom SSL certificates

#### 4. Compliance
- Air-gapped deployment option
- Audit log retention
- GDPR compliance controls
- SOC2 requirements

### Configuration UI

**Dashboard Integration**:
1. User selects "On-Premise" in settings
2. Fills out configuration form
3. Downloads deployment package
4. Follows deployment guide
5. Connects dashboard to on-prem instance

**Generated Files**:
- `docker-compose.yml` or `kubernetes.yaml`
- `config.env` (environment variables)
- `nginx.conf` (reverse proxy config)
- `README.md` (deployment instructions)
- `backup.sh` (backup script)

---

## Technical Stack

### Frontend

**Framework**: Next.js 15
```typescript
// app/dashboard/page.tsx
export default async function DashboardPage() {
  const metrics = await getMetrics();
  return <DashboardView metrics={metrics} />;
}
```

**Components**: shadcn/ui
```typescript
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
```

**Styling**: Tailwind CSS
```tsx
<div className="grid grid-cols-3 gap-4">
  <Card className="col-span-1">
    <CardHeader>
      <CardTitle>Monthly Cost</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-3xl font-bold">${cost}</p>
    </CardContent>
  </Card>
</div>
```

**Charts**: Recharts
```tsx
import { LineChart, Line, XAxis, YAxis } from 'recharts';

<LineChart data={costData}>
  <Line type="monotone" dataKey="cost" stroke="#8884d8" />
  <XAxis dataKey="date" />
  <YAxis />
</LineChart>
```

### Backend API Extensions

**New Endpoints Needed**:

```typescript
// User management
GET    /api/v1/users
POST   /api/v1/users
PUT    /api/v1/users/:id
DELETE /api/v1/users/:id

// Organization
GET    /api/v1/organizations/:id
PUT    /api/v1/organizations/:id
GET    /api/v1/organizations/:id/metrics
GET    /api/v1/organizations/:id/costs

// Provider configuration
GET    /api/v1/providers
POST   /api/v1/providers
PUT    /api/v1/providers/:id
DELETE /api/v1/providers/:id
POST   /api/v1/providers/:id/test

// Suggestions management
POST   /api/v1/suggestions/:id/accept
POST   /api/v1/suggestions/:id/reject
GET    /api/v1/suggestions/:id/details

// On-premise config
GET    /api/v1/config/on-premise
PUT    /api/v1/config/on-premise
POST   /api/v1/config/export

// Dashboard data
GET    /api/v1/dashboard/metrics
GET    /api/v1/dashboard/trends
GET    /api/v1/dashboard/activity
```

### Database Schema Extensions

**New Tables**:

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);

-- Providers table
CREATE TABLE providers (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  provider_type VARCHAR(50) NOT NULL, -- openai, anthropic, etc
  display_name VARCHAR(255) NOT NULL,
  api_key_encrypted TEXT NOT NULL,
  base_url VARCHAR(255),
  config JSONB, -- provider-specific config
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Suggestion actions table
CREATE TABLE suggestion_actions (
  id UUID PRIMARY KEY,
  suggestion_id UUID,
  action VARCHAR(50) NOT NULL, -- accepted, rejected
  user_id UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- On-premise config table
CREATE TABLE on_premise_config (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  deployment_type VARCHAR(50), -- docker, kubernetes, vm
  server_url VARCHAR(255),
  database_config JSONB,
  auth_config JSONB,
  security_config JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Implementation Plan

### Phase 1: Core Dashboard (Week 1-2)

**Goals**: Basic dashboard with metrics

**Tasks**:
1. Setup Next.js project
2. Install shadcn/ui and Tailwind
3. Create layout components
4. Implement overview dashboard
5. Connect to existing API endpoints
6. Add authentication (Clerk)

**Deliverables**:
- Working dashboard at `/dashboard`
- Metrics cards
- Cost trend chart
- Basic navigation

### Phase 2: Suggestions View (Week 3)

**Goals**: View and manage suggestions

**Tasks**:
1. Create suggestions list view
2. Implement suggestion cards
3. Add detail modal
4. Implement accept/reject actions
5. Add API endpoints for actions

**Deliverables**:
- Full suggestions view
- Accept/reject functionality
- Detailed analysis modal

### Phase 3: Provider Configuration (Week 4-5)

**Goals**: Manage LLM providers

**Tasks**:
1. Create providers list view
2. Implement add/edit provider forms
3. Add connection testing
4. Implement API key encryption
5. Add provider-specific configurations

**Deliverables**:
- Provider management UI
- Support for OpenAI, Anthropic, Cohere
- Custom provider support
- Secure credential storage

### Phase 4: On-Premise Configuration (Week 6-7)

**Goals**: Enable on-prem deployments

**Tasks**:
1. Create on-prem settings view
2. Implement configuration form
3. Build config export functionality
4. Generate deployment files
5. Create deployment guides

**Deliverables**:
- On-prem configuration UI
- Docker Compose export
- Kubernetes manifest export
- Deployment documentation

### Phase 5: Admin & Settings (Week 8)

**Goals**: Organization and user management

**Tasks**:
1. Create settings views
2. Implement user management
3. Add API key management
4. Implement billing view
5. Add compliance controls

**Deliverables**:
- Complete settings section
- User management
- API key management
- Compliance tools

---

## Wireframes

### Mobile Responsive

```
Mobile (375px)
┌─────────────────┐
│ ☰  Flusk     👤│
├─────────────────┤
│ Dashboard       │
│                 │
│ Monthly Cost    │
│ ┌─────────────┐│
│ │   $4,230   │││
│ │   ↓ 31%    │││
│ └─────────────┘││
│                 │
│ Savings         │
│ ┌─────────────┐│
│ │   $1,890   │││
│ │   ↑ 45%    │││
│ └─────────────┘││
│                 │
│ [View Details] ││
│                 │
└─────────────────┘
```

### Dark Mode

**All views support dark mode**:
- Dark backgrounds (#0f172a)
- Lighter text (#e2e8f0)
- Accent colors adjusted
- High contrast for accessibility

---

## Security Considerations

### Authentication
- Session-based auth with secure cookies
- API key auth for programmatic access
- SSO support (SAML, OIDC)
- 2FA optional

### Authorization
- Role-based access control (RBAC)
- Organization-level isolation
- API key scoping

### Data Protection
- API keys encrypted at rest (AES-256)
- Prompts optionally encrypted
- Audit logs for all actions
- Automatic session timeout

---

## Accessibility

**WCAG 2.1 AA Compliance**:
- Keyboard navigation
- Screen reader support
- High contrast mode
- Focus indicators
- Aria labels
- Alt text for images

---

## Summary

The Flusk Dashboard provides:

✅ **Comprehensive Monitoring** - Track costs, usage, and savings
✅ **Intelligent Suggestions** - View and accept optimizations
✅ **Flexible Providers** - Configure any LLM provider
✅ **On-Premise Support** - Deploy anywhere with full config
✅ **Enterprise Ready** - SSO, RBAC, compliance
✅ **Developer Friendly** - Clean UI, well-documented APIs

**Next Steps**: Implement Phase 1 (Core Dashboard) and iterate based on user feedback.
