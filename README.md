# SL Paytrack

A payroll and workforce management system for Social Loop employees.

## Current version

The repository currently contains the first responsive dashboard prototype. It uses sample data and does not yet connect to authentication, a database, time-tracking records, or a payment provider.

### Included dashboard sections

- Payroll and workforce summary cards
- Weekly employee-hours overview
- Current payroll-cycle progress
- Recent employee payroll records
- Upcoming payroll deadlines
- Responsive desktop and mobile navigation
- Accessible semantic HTML and keyboard-friendly controls

## Run locally

No installation or build step is required.

1. Clone the repository.
2. Open `index.html` in a browser.

For a local development server, use one of the following:

```bash
npx serve .
```

or

```bash
python -m http.server 8000
```

Then open the local URL shown in the terminal.

## Project structure

```text
SL-Paytrack/
├── index.html   # Dashboard structure and sample content
├── styles.css   # Responsive dashboard styling
├── script.js    # Navigation, date, and prototype interactions
└── README.md    # Project documentation
```

## Recommended next phases

1. Define employee, attendance, payroll, deduction, and payment data models.
2. Add authentication and role-based access for administrators, payroll managers, managers, and employees.
3. Build employee management and time-entry pages.
4. Connect the dashboard to live database records.
5. Add payroll calculation, approval, payslip, and audit-log workflows.
6. Add security controls, automated tests, and deployment configuration.

## Important

All names, amounts, dates, and employee records in the current dashboard are fictional sample data for interface development only.
