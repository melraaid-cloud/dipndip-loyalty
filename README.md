# 🍫 dipndip Libya — Loyalty & Wallet Platform

A production-ready, SaaS-grade customer loyalty ecosystem for dipndip Libya. Built to scale from a single branch to multi-brand, multi-country operations.

---

## 📋 Platform Overview

| Feature | Status |
|---------|--------|
| Digital Loyalty Card (Apple + Google Wallet) | ✅ |
| Points Engine (1 LYD = 1 Point) | ✅ |
| Tier System (Bronze → Silver → Gold → Platinum) | ✅ |
| QR Code Scanning (Earn, Redeem, Verify) | ✅ |
| Geofencing & Location Notifications | ✅ |
| Birthday Rewards (Auto) | ✅ |
| Referral Program | ✅ |
| Campaign Engine (Scheduled, Targeted) | ✅ |
| Customer Segmentation | ✅ |
| Push Notifications (FCM + APNs) | ✅ |
| Admin Dashboard (Web) | ✅ |
| Analytics & BI Executive Dashboard | ✅ |
| RBAC Staff Management | ✅ |
| Docker + K8s Ready | ✅ |
| CI/CD (GitHub Actions) | ✅ |

---

## 🏗️ Tech Stack

### Backend
- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL 16
- **Cache / Queue**: Redis 7 + BullMQ
- **Auth**: JWT + Passport + RBAC
- **API**: REST (Swagger documented) + GraphQL
- **Scheduled Jobs**: @nestjs/schedule (Cron)

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Styling**: TailwindCSS
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod

### Wallet
- **Apple**: PassKit (.pkpass) + APNs push
- **Google**: Google Wallet Loyalty API + JWT

### Infrastructure
- **Containers**: Docker + Docker Compose
- **Orchestration**: Kubernetes-ready (HPA included)
- **Reverse Proxy**: Nginx (rate limiting, SSL, gzip)
- **CI/CD**: GitHub Actions (test → build → push → deploy)
- **Compatible**: AWS, Azure, DigitalOcean, bare metal

---

## 📁 Project Structure

```
dipndip-loyalty/
├── backend/                    # NestJS API
│   ├── src/
│   │   ├── config/             # App configuration
│   │   ├── database/
│   │   │   └── entities/       # TypeORM entities (11 tables)
│   │   ├── modules/
│   │   │   ├── auth/           # JWT auth, strategies
│   │   │   ├── customers/      # Customer CRUD + stats
│   │   │   ├── loyalty/        # Points engine
│   │   │   ├── campaigns/      # Campaign engine
│   │   │   ├── wallet/         # Apple + Google Wallet
│   │   │   ├── notifications/  # FCM + APNs + Email + SMS
│   │   │   ├── analytics/      # BI + reporting
│   │   │   ├── locations/      # Branch + geofence mgmt
│   │   │   ├── rewards/        # Reward catalog
│   │   │   ├── staff/          # Staff management
│   │   │   └── scheduled-tasks/# Cron jobs
│   │   ├── common/
│   │   │   ├── guards/         # JWT, Roles
│   │   │   └── decorators/     # @Public, @Roles
│   │   └── queues/             # BullMQ processors
│   └── Dockerfile
│
├── frontend/                   # Next.js Admin Dashboard
│   ├── src/
│   │   ├── app/
│   │   │   ├── login/          # Auth page
│   │   │   └── dashboard/
│   │   │       ├── page.tsx    # Executive dashboard
│   │   │       ├── customers/  # Customer list + profile
│   │   │       ├── campaigns/  # Campaign manager
│   │   │       ├── analytics/  # BI dashboard
│   │   │       └── ...
│   │   ├── components/
│   │   │   └── dashboard/      # Sidebar, shared UI
│   │   └── lib/
│   │       └── api.ts          # Typed API client
│   └── Dockerfile
│
├── infrastructure/
│   ├── docker/
│   │   └── docker-compose.yml  # Full stack compose
│   ├── nginx/
│   │   └── nginx.conf          # Production nginx config
│   └── k8s/
│       └── deployment.yaml     # K8s Deployment + HPA
│
├── .github/
│   └── workflows/
│       └── ci-cd.yml           # Full CI/CD pipeline
│
└── docs/
    ├── ARCHITECTURE.md         # System architecture + ERD
    ├── DEPLOYMENT.md           # Deployment guide (Docker/K8s/AWS)
    └── ROADMAP.md              # Future features roadmap
```

---

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/your-org/dipndip-loyalty && cd dipndip-loyalty

# Backend
cd backend && cp .env.example .env
# Fill in .env values (DB, Redis, JWT secrets)
npm install && npm run start:dev

# Frontend (new terminal)
cd frontend && npm install && npm run dev
```

- **API**: http://localhost:3000/api/v1
- **Swagger**: http://localhost:3000/api/docs
- **Admin**: http://localhost:3001

---

## 🎯 Tier System

| Tier | Points Range | Earn Multiplier |
|------|-------------|-----------------|
| 🥉 Bronze | 0 – 499 | 1.0× |
| 🥈 Silver | 500 – 1,499 | 1.1× |
| 🥇 Gold | 1,500 – 3,999 | 1.2× |
| 💎 Platinum | 4,000+ | 1.5× |

---

## 🏪 Default Rewards

| Reward | Points |
|--------|--------|
| Free Coffee | 100 pts |
| Free Dessert | 250 pts |
| Free Signature Item | 500 pts |
| 10% Discount | 150 pts |

---

## 👥 Staff Roles

| Role | Access |
|------|--------|
| `super_admin` | Full system access |
| `admin` | All operations except system config |
| `manager` | Customer, campaigns, reports |
| `cashier` | Earn/redeem points, verify membership |
| `marketing` | Campaigns, notifications |
| `analytics` | Read-only analytics |
| `support` | Customer lookup and support |

---

## 📄 License

Proprietary — dipndip Libya. All rights reserved.

---

*Built with ❤️ for dipndip Libya — Where every bite earns a reward 🍫*
