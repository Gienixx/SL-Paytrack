# SL Paytrack

A payroll and workforce management system for Social Loop employees.

## Current version

The repository contains a responsive payroll dashboard and a dedicated authentication flow designed for Cloudflare Pages Functions and Supabase Auth.

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
- Email and password validation
- Password visibility control
- Server-side Supabase password authentication
- `HttpOnly`, `SameSite=Strict` session cookies
- Automatic access-token validation and refresh
- Fail-closed dashboard session verification
- Server-side logout and cookie clearing
- Optional allowed email-domain restriction
- Optional role restriction using Supabase `app_metadata.role`
- Browser security headers and disabled caching for login and dashboard HTML

## Authentication architecture

The browser sends credentials to the same-origin `/api/auth/login` Cloudflare Pages Function. The function authenticates against Supabase and stores the returned session tokens in protected cookies. The dashboard calls `/api/auth/session` before displaying its interface.

Passwords and tokens are not saved in `localStorage`, `sessionStorage`, or source files.

### Required Cloudflare environment variables

Configure these under the Cloudflare Pages project settings:

```text
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Optional restrictions:

```text
PAYROLL_ALLOWED_ORIGIN=https://payroll.example.com
PAYROLL_ALLOWED_EMAIL_DOMAIN=example.com
PAYROLL_ALLOWED_ROLES=admin,payroll
```

When `PAYROLL_ALLOWED_ROLES` is configured, assign authorized roles through trusted server-side Supabase administration using `app_metadata.role`. Do not let users edit their own authorization role.

## Run locally with authentication

Install or run Wrangler and start Cloudflare Pages development mode:

```bash
npx wrangler pages dev .
```

Create a local `.dev.vars` file based on `.dev.vars.example`, then open the URL Wrangler displays and visit:

```text
/login.html
```

Opening the dashboard without a valid session redirects back to the login page.

## Project structure

```text
SL-Paytrack/
├── functions/
│   ├── _lib/
│   │   └── auth.js              # Cookies, Supabase requests, and access rules
│   └── api/auth/
│       ├── login.js             # Password authentication endpoint
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

The dashboard guard prevents normal unauthenticated access to the interface, but sensitive payroll data must also be protected at the server and database layers.

Before connecting real data:

1. Load payroll records only through authenticated server endpoints.
2. Enforce role authorization inside every payroll API function.
3. Enable Supabase Row Level Security for employee and payroll tables.
4. Keep service-role keys server-side and never expose them to browser code.
5. Add audit logs for payroll views, edits, approvals, and payment releases.
6. Add rate limiting, multi-factor authentication, and account recovery controls.
7. Test authorization using users with different roles before deployment.

## Recommended next phases

1. Define employee, attendance, payroll, deduction, and payment data models.
2. Add Supabase tables and Row Level Security policies.
3. Create administrator, payroll manager, manager, and employee roles.
4. Build employee management and time-entry pages.
5. Connect dashboard metrics to authenticated database records.
6. Add payroll calculations, approval workflows, payslips, and audit logs.

## Important

All names, amounts, dates, and employee records currently shown are fictional sample data for interface development only.
