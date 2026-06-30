# SL Paytrack

A payroll and workforce management system for Social Loop employees.

## Current version

The repository contains a responsive payroll dashboard and a dedicated authentication flow designed for Cloudflare Pages Functions. It supports either a temporary database-free development account or Supabase Auth.

All payroll values currently displayed are fictional sample data. Live payroll records have not yet been connected.

## Included features

### Dashboard

- Payroll and workforce summary cards
- Weekly employee-hours overview
- Current payroll-cycle progress
- Recent employee payroll records
- Upcoming payroll deadlines
- Responsive desktop and mobile navigation

### Authentication

- Dedicated `login.html` payroll sign-in page
- Database-free development login mode
- Server-side Supabase password authentication when configured
- Signed development sessions that cannot be forged by editing browser storage
- `HttpOnly`, `SameSite=Strict` session cookies
- Automatic Supabase access-token validation and refresh
- Fail-closed dashboard session verification
- Server-side logout and cookie clearing
- Optional email-domain and role restrictions
- Browser security headers and disabled caching for login and dashboard HTML

## Database-free development login

Random credentials are intentionally rejected. Define one private development account through environment variables.

### Local setup

Copy `.dev.vars.example` to `.dev.vars`:

```bash
cp .dev.vars.example .dev.vars
```

On Windows PowerShell:

```powershell
Copy-Item .dev.vars.example .dev.vars
```

Edit `.dev.vars` and set private values:

```text
DEV_AUTH_ENABLED=true
DEV_AUTH_EMAIL=your-email@example.com
DEV_AUTH_PASSWORD=choose-a-private-password
DEV_AUTH_SECRET=use-a-random-secret-with-at-least-32-characters
DEV_AUTH_NAME=Zai
DEV_AUTH_ROLE=admin

SUPABASE_URL=
SUPABASE_ANON_KEY=
PAYROLL_ALLOWED_ORIGIN=http://localhost:8788
```

Start the Cloudflare Pages development server:

```bash
npx wrangler pages dev .
```

Open `/login.html` and sign in using the exact `DEV_AUTH_EMAIL` and `DEV_AUTH_PASSWORD` values from `.dev.vars`.

The development password is never committed to GitHub. The server issues a signed `HttpOnly` session cookie after a successful login.

### Temporary Cloudflare deployment

The same `DEV_AUTH_*` variables can be added under the Cloudflare Pages project environment variables for temporary testing. Use private values that are not committed to the repository.

Disable and remove all `DEV_AUTH_*` values before production use:

```text
DEV_AUTH_ENABLED=false
```

## Supabase authentication

When the database is ready, configure:

```text
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Optional production restrictions:

```text
PAYROLL_ALLOWED_ORIGIN=https://payroll.example.com
PAYROLL_ALLOWED_EMAIL_DOMAIN=example.com
PAYROLL_ALLOWED_ROLES=admin,payroll
```

When `PAYROLL_ALLOWED_ROLES` is configured, assign authorized roles using trusted server-side Supabase administration through `app_metadata.role`. Users must not be allowed to edit their own authorization role.

## Authentication architecture

The browser sends credentials to the same-origin `/api/auth/login` Cloudflare Pages Function. In development mode, the function checks private environment variables and issues a signed session cookie. With Supabase configured, the function authenticates against Supabase and stores session tokens in protected cookies.

The dashboard calls `/api/auth/session` before displaying the interface. Passwords and session tokens are not saved in `localStorage`, `sessionStorage`, or source files.

## Project structure

```text
SL-Paytrack/
├── functions/
│   ├── _lib/
│   │   └── auth.js              # Cookies, signed dev sessions, and Supabase helpers
│   └── api/auth/
│       ├── login.js             # Development or Supabase login endpoint
│       ├── logout.js            # Session termination endpoint
│       └── session.js           # Session validation and token refresh
├── _headers                     # Cloudflare browser-security headers
├── index.html                   # Protected dashboard interface
├── login.html                   # Dedicated payroll login page
├── login.css                    # Login page styling
├── login.js                     # Login form and authentication requests
├── styles.css                   # Dashboard styling
├── script.js                    # Dashboard session guard and interactions
├── .dev.vars.example            # Local environment-variable template
└── README.md
```

## Security boundary

The development account is intended only for interface development and controlled testing. It is not a substitute for a production identity database.

Before connecting real payroll data:

1. Disable development authentication.
2. Load payroll records only through authenticated server endpoints.
3. Enforce role authorization inside every payroll API function.
4. Enable Supabase Row Level Security for employee and payroll tables.
5. Keep service-role keys server-side and never expose them to browser code.
6. Add audit logs for payroll views, edits, approvals, and payment releases.
7. Add rate limiting, multi-factor authentication, and recovery controls.
8. Test authorization using accounts with different roles.

## Recommended next phases

1. Define employee, attendance, payroll, deduction, and payment data models.
2. Add Supabase tables and Row Level Security policies.
3. Create administrator, payroll manager, manager, and employee roles.
4. Build employee management and time-entry pages.
5. Connect dashboard metrics to authenticated database records.
6. Add payroll calculations, approval workflows, payslips, and audit logs.

## Important

All names, amounts, dates, and employee records currently shown are fictional sample data for interface development only.
