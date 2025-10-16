# Getting Started - Timesheet Manager

**Project**: Timesheet Manager for ABZ Group  
**Status**: ✅ Production Ready  
**Last Updated**: 2025-10-16

---

## 📋 Prerequisites

- Node.js 18+ (LTS recommended)
- npm or yarn
- Git
- Supabase account (already configured)
- Gmail account for email notifications (already configured)

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
# Navigate to project
cd "Time-Sheet - Manager ABZ Group"

# Install dependencies
cd web
npm install
```

### 2. Environment Setup

The project uses environment variables from `.env.local`. Verify these are set:

```bash
# Check .env.local exists
cat .env.local

# Required variables:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
# - GMAIL_USER
# - GMAIL_PASSWORD
```

### 3. Start Development Server

```bash
npm run dev
```

The application will be available at:
- **Local**: http://localhost:3000
- **Network**: http://100.127.87.6:3000

### 4. Access the Application

**Default Routes**:
- Portuguese: http://localhost:3000/pt-BR
- English: http://localhost:3000/en-GB

**Test Credentials** (use Supabase dashboard to create):
- Employee account (role: COLAB)
- Manager account (role: GERENTE)
- Admin account (role: ADMIN_GLOBAL)

---

## 🧪 Testing

### Run All Tests

```bash
npm test
```

Expected output:
```
Test Files  3 passed (3)
Tests       41 passed (41)
```

### Run Tests in Watch Mode

```bash
npm test -- --watch
```

### Run Tests with UI

```bash
npm test:ui
```

Opens interactive test UI at http://localhost:51204

### Generate Coverage Report

```bash
npm test:coverage
```

---

## 🏗️ Build & Deploy

### Production Build

```bash
npm run build
```

Expected output:
```
✓ Compiled successfully
✓ Generating static pages
✓ Finalizing page optimization
```

### Start Production Server

```bash
npm start
```

### Check for Issues

```bash
npm run lint
```

---

## 📚 Project Structure

```
web/
├── src/
│   ├── app/
│   │   ├── [locale]/              # Localized pages
│   │   │   ├── page.tsx           # Home page
│   │   │   ├── employee/          # Employee pages
│   │   │   └── manager/           # Manager pages
│   │   ├── api/                   # API endpoints
│   │   │   ├── admin/             # Admin endpoints
│   │   │   ├── employee/          # Employee endpoints
│   │   │   ├── manager/           # Manager endpoints
│   │   │   ├── export/            # Export endpoint
│   │   │   └── cron/              # Cron jobs
│   │   └── layout.tsx             # Root layout
│   ├── components/                # React components
│   │   ├── manager/               # Manager components
│   │   ├── employee/              # Employee components
│   │   └── ...
│   ├── lib/                       # Utilities
│   │   ├── supabase/              # Supabase client
│   │   ├── notifications/         # Email templates
│   │   └── ...
│   └── __tests__/                 # Test files
├── public/                        # Static assets
│   └── logo-abz.png               # ABZ logo
├── vitest.config.ts               # Test configuration
├── next.config.ts                 # Next.js configuration
└── package.json                   # Dependencies

docs/
├── Plano-de-Acao.md               # Action plan
├── Regras-e-Tarefas.md            # Rules & requirements
├── TESTING.md                     # Testing strategy
├── ROADMAP.md                     # Phase breakdown
├── PROJECT-STATUS.md              # Current status
├── NEXT-STEPS.md                  # Continuation guide
└── FINAL-CHECKLIST.md             # Verification checklist
```

---

## 🔑 Key Features

### For Employees
- Create and edit timesheet entries
- Submit for manager approval
- View manager feedback
- Correct and resubmit
- Automatic deadline blocking

### For Managers
- View pending timesheets
- Review and approve/reject
- Add detailed annotations
- View approval history
- Manage employee groups

### For Admins
- Create and manage tenants
- Manage users and roles
- Export data (JSON/CSV)
- Cross-tenant access

---

## 🌍 Internationalization

The application supports two languages:

### Portuguese Brazil (pt-BR)
- Default language
- Access: http://localhost:3000/pt-BR

### English UK (en-GB)
- Alternative language
- Access: http://localhost:3000/en-GB

**User Preference**: Stored in `profiles.locale` table

---

## 📧 Email Notifications

The system sends emails for:
1. **Timesheet Submitted** - Notify manager
2. **Timesheet Rejected** - Notify employee with feedback
3. **Timesheet Approved** - Notify employee
4. **Deadline Reminder** - Notify employees (7, 3, 1 days before)
5. **Manager Pending Reminder** - Notify managers with pending list

**Email Configuration**:
- Service: Gmail (Nodemailer)
- Credentials: `GMAIL_USER` and `GMAIL_PASSWORD` in `.env.local`
- Templates: `web/src/lib/notifications/templates/`

---

## 🗄️ Database

### Supabase Project
- **Project ID**: arzvingdtnttiejcvucs
- **Region**: us-east-2
- **Database**: PostgreSQL

### Key Tables
- `tenants` - Multi-tenant isolation
- `profiles` - User profiles with locale
- `employees` - Employee records
- `timesheets` - Timesheet headers
- `timesheet_entries` - Individual entries
- `timesheet_annotations` - Manager feedback
- `approvals` - Approval audit trail
- `groups` - Employee grouping
- `manager_group_assignments` - Manager delegation

### Access
- Dashboard: https://app.supabase.com
- Project: Painel_ABZGroup

---

## 🔐 Authentication

### Supabase Auth
- Email/password authentication
- JWT tokens
- Session management
- Row Level Security (RLS)

### Roles
- `ADMIN_GLOBAL` - Full system access
- `TENANT_ADMIN` - Tenant admin
- `GERENTE` - Manager
- `COLAB` - Employee

---

## 🐛 Troubleshooting

### Build Fails
```bash
# Clear cache and rebuild
rm -rf .next
npm run build
```

### Tests Fail
```bash
# Clear cache and rerun
npm test -- --clearCache
npm test
```

### Port Already in Use
```bash
# Use different port
PORT=3001 npm run dev
```

### Database Connection Issues
1. Check `.env.local` has correct Supabase credentials
2. Verify Supabase project is active
3. Check network connectivity

### Email Not Sending
1. Verify Gmail credentials in `.env.local`
2. Check Gmail account allows "Less secure apps"
3. Review email logs in Supabase

---

## 📖 Documentation

### Quick Reference
- **README-DELIVERY.md** - Delivery report
- **EXECUTIVE-SUMMARY.md** - Executive summary
- **GETTING-STARTED.md** - This file

### Detailed Documentation
- **docs/Plano-de-Acao.md** - Master action plan
- **docs/Regras-e-Tarefas.md** - Rules and requirements
- **docs/TESTING.md** - Testing strategy
- **docs/ROADMAP.md** - Phase breakdown
- **docs/PROJECT-STATUS.md** - Current status
- **docs/NEXT-STEPS.md** - Continuation guide

---

## 🚀 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# Then redeploy
vercel --prod
```

### Docker

```bash
# Build image
docker build -t timesheet-manager .

# Run container
docker run -p 3000:3000 timesheet-manager
```

### Manual Server

```bash
# Build
npm run build

# Start
npm start
```

---

## 📞 Support

### Common Issues

**Q: How do I create a new user?**
A: Use the admin panel at `/[locale]/admin/users` or Supabase dashboard

**Q: How do I change the language?**
A: Click language selector in header or change URL locale

**Q: How do I export data?**
A: Use `/api/export?format=json|csv` endpoint

**Q: How do I add a new tenant?**
A: Use admin panel at `/[locale]/admin/tenants`

### Getting Help

1. Check documentation in `docs/` directory
2. Review test files for examples
3. Check git history: `git log --oneline`
4. Review Supabase dashboard for data issues

---

## 🎯 Next Steps

1. **Review** the application features
2. **Test** with sample data
3. **Provide feedback** on any adjustments
4. **Plan** Phase 16 development
5. **Deploy** to production when ready

---

## 📋 Useful Commands

```bash
# Development
npm run dev              # Start dev server
npm test                 # Run tests
npm test:ui             # Run tests with UI
npm run build           # Production build
npm start               # Start production server
npm run lint            # Run ESLint

# Git
git log --oneline       # View commit history
git status              # Check changes
git diff                # View changes
git branch -a           # List branches

# Database (Supabase)
# Use dashboard at https://app.supabase.com
# Project: Painel_ABZGroup (arzvingdtnttiejcvucs)
```

---

## ✅ Verification Checklist

Before going live:

- [ ] All tests passing (`npm test`)
- [ ] Build successful (`npm run build`)
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Email notifications working
- [ ] Multi-tenant isolation verified
- [ ] RLS policies tested
- [ ] Admin panel functional
- [ ] User roles assigned
- [ ] Sample data created

---

**Status**: ✅ Ready for Production  
**Last Updated**: 2025-10-16  
**Support**: See docs/ directory for detailed documentation

