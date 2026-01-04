# Client Deployment Guide

This guide covers deploying the white-label e-commerce platform for a new client.

## Prerequisites

- Docker and Docker Compose (for PostgreSQL and Redis)
- Node.js 20+
- Client's NMI payment credentials
- Domain for backend API and storefront

## Quick Start (Development)

### 1. Database Setup

```bash
# Start PostgreSQL and Redis
docker compose up -d

# The database will be created automatically
```

### 2. Backend Setup

```bash
cd Impetus-Ecommerce

# Install dependencies
npm install

# Copy environment template
cp .env.template .env

# Edit .env with client's configuration:
# - DATABASE_URL
# - REDIS_URL
# - JWT_SECRET (generate a secure random string)
# - COOKIE_SECRET (generate a secure random string)
# - NMI_SECURITY_KEY (from client's NMI account)
# - NEXT_PUBLIC_NMI_PUBLIC_KEY (from client's NMI account)
# - STORE_CORS, ADMIN_CORS, AUTH_CORS (client's domains)

# Build the backend
npm run build

# Run migrations
npx medusa db:migrate

# Create admin user
npx medusa user -e admin@clientdomain.com -p [secure-password]

# Start the backend
npm run dev
```

### 3. Storefront Setup

```bash
cd storefront-template

# Install dependencies
npm install

# Copy environment template
cp .env.template .env.local

# Edit .env.local:
# - NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000 (or production URL)
# - NEXT_PUBLIC_NMI_PUBLIC_KEY (same as backend)

# Start the storefront
npm run dev
```

## Production Deployment

### Environment Variables

#### Backend (.env)

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `REDIS_URL` | Redis connection string | Yes |
| `JWT_SECRET` | Random 32+ char string | Yes |
| `COOKIE_SECRET` | Random 32+ char string | Yes |
| `NMI_SECURITY_KEY` | NMI merchant security key | Yes |
| `NEXT_PUBLIC_NMI_PUBLIC_KEY` | NMI public/checkout key | Yes |
| `STORE_CORS` | Storefront domain(s) | Yes |
| `ADMIN_CORS` | Admin panel domain(s) | Yes |
| `AUTH_CORS` | Auth domain(s) | Yes |
| `NODE_ENV` | Set to `production` | Yes |

#### Storefront (.env.local)

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_MEDUSA_BACKEND_URL` | Backend API URL | Yes |
| `NEXT_PUBLIC_NMI_PUBLIC_KEY` | NMI public/checkout key | Yes |
| `REVALIDATE_SECRET` | Cache revalidation secret | Optional |

### Recommended Hosting

- **Backend**: Railway, Render, DigitalOcean App Platform, AWS ECS
- **Storefront**: Vercel (recommended), Netlify, Cloudflare Pages
- **Database**: Neon, Supabase, AWS RDS
- **Redis**: Upstash, Redis Cloud, AWS ElastiCache

### Post-Deployment Checklist

- [ ] Create admin user with client email
- [ ] Configure payment provider in admin
- [ ] Set up shipping zones and rates
- [ ] Configure store settings (name, currency, etc.)
- [ ] Add products/inventory
- [ ] Test checkout flow with NMI
- [ ] Set up email notifications (optional)
- [ ] Configure webhooks (optional)

## NMI Payment Setup

1. Obtain credentials from NMI merchant account:
   - Security Key (API key for server-side)
   - Public Key (for client-side tokenization)

2. Add to environment variables:
   ```
   NMI_SECURITY_KEY=your_security_key
   NEXT_PUBLIC_NMI_PUBLIC_KEY=your_public_key
   ```

3. Enable NMI payment provider in Medusa Admin:
   - Go to Settings > Payment Providers
   - Enable "NMI" for desired regions

## Multi-Tenant Configuration

For multi-tenant setups where stores need different NMI credentials:

1. Set `STORE_ID` environment variable per deployment
2. Store-specific NMI credentials can be set in store metadata
3. The platform automatically uses store-specific credentials when available

## Loyalty Program

The platform includes a built-in loyalty program:

- Configurable points earning rate
- Tiered membership levels
- Referral system
- Points redemption

Configure via Admin panel or database seeds.

## Support

For issues with the platform, check:
- Backend logs: `npm run dev` output or hosting provider logs
- Database migrations: `npx medusa db:migrate`
- Build errors: `npm run build`
