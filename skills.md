# AMS PROJECT AGENT SKILLS

## Skill 01 — AMS Domain Analysis

Understand:

- Incident management
- Service requests
- Problem management
- Change management
- SLA
- Escalation
- Shift operations
- Handover
- Monitoring
- IT service management

Always consider operational impact before implementation.

---

## Skill 02 — SLA Engineering

You must understand SLA calculations.

Never assume:

elapsed_time = current_time - created_time

SLA may depend on:

- Business hours
- Holidays
- Weekends
- Pause states
- Priority
- Escalation
- Support calendar

Implement SLA calculations as independently testable services.

---

## Skill 03 — Workforce Scheduling

Understand:

- Fixed shifts
- Rotating shifts
- Night shifts
- Cross-midnight shifts
- Overtime
- Breaks
- Rest days
- Leave

Special attention must be given to shifts crossing midnight.

Example:

Start:
2026-08-21 20:00

End:
2026-08-22 05:00

This is one shift, not two attendance records.

---

## Skill 04 — Ticket Integration

All external ticketing systems must use an abstraction.

Example:

TicketProvider

Methods:

get_ticket()
get_tickets()
get_agents()
get_statuses()
get_priorities()

Never couple the entire application directly to UVdesk.

---

## Skill 05 — Slack Integration

Slack should be treated as an event and notification provider.

Never make Slack the source of truth.

The database is the source of truth.

---

## Skill 06 — RBAC

Always enforce authorization server-side.

Never trust:

- Frontend role
- Hidden UI elements
- Client-provided permissions

Example:

An Agent must not be able to modify SLA policies even if they manipulate the frontend request.

---

## Skill 07 — Auditability

For important operations record:

- Actor
- Action
- Entity
- Timestamp
- Before
- After

Audit records should be immutable.

---

## Skill 08 — Database Engineering

Prefer:

- PostgreSQL
- Foreign keys
- Constraints
- Indexes
- Transactions
- UUIDs
- Soft deletion where appropriate

Avoid:

- Unstructured JSON for core business entities
- Duplicate data
- Missing foreign keys
- N+1 queries

---

## Skill 09 — API Design

Use REST conventions.

Use:

GET
POST
PATCH
DELETE

Validate input using Pydantic.

Return consistent error responses.

Document APIs using OpenAPI.

---

## Skill 10 — Frontend Engineering

Use:

Next.js
TypeScript
Tailwind CSS

Prioritize:

- Fast loading
- Responsive tables
- Clear status indicators
- Accessible forms
- Minimal unnecessary animations

---

## Skill 11 — Testing

Every critical business rule requires tests.

Minimum tests:

Attendance:

- On time
- Late
- Missing
- Overnight shift
- Overtime

SLA:

- Met
- At risk
- Breached
- Paused
- Business hours
- Weekend
- Holiday

Handover:

- On time
- Late
- Missing

RBAC:

- Agent access
- Manager access
- Admin access

---

## Skill 12 — Security

Never:

- Hard-code secrets
- Log credentials
- Return tokens in API responses
- Store plaintext passwords
- Trust client authorization

Use environment variables or secret management.

---

## Skill 13 — AI Engineering

AI features must be isolated from core business logic.

AI failure must never prevent:

- Attendance
- Ticket logging
- SLA calculation
- Handover

AI results should be treated as recommendations.

---

## Skill 14 — Reporting

Reports must use consistent definitions.

Example:

SLA Compliance:

Tickets meeting SLA / Tickets eligible for SLA

Do not calculate metrics differently across dashboards.

---

## Skill 15 — UX for AMS Agents

Agent workflows should be extremely fast.

Starting a shift should take approximately:

1 click

Logging a ticket:

1–2 minutes maximum

Submitting handover:

less than 2 minutes for normal shifts.

Avoid unnecessary forms.

---

## Skill 16 — Manager UX

Managers need information at a glance.

Use:

- KPI cards
- Tables
- Filters
- Search
- Drill-down
- Status indicators
- Trends

Avoid decorative dashboards that hide operational information.

---

## Skill 17 — Integration Failure Handling

External APIs can fail.

Implement:

- Timeouts
- Retries
- Logging
- Circuit-breaking strategy where appropriate
- Sync status
- Last successful sync

UVdesk failure must not stop attendance.

---

## Skill 18 — Documentation

Every major module must have:

- Purpose
- Data model
- API
- Business rules
- Security considerations
- Test cases

---

## Skill 19 — Code Quality

Prefer:

- Small modules
- Clear naming
- Type safety
- Dependency injection
- Service layer
- Repository pattern where justified

Avoid:

- Giant files
- Giant functions
- Hidden business logic
- Duplicate code

---

## Skill 20 — Deployment

Application must support:

Docker
PostgreSQL
Environment variables
Production configuration
Health checks
Logging

Provide:

/health

and appropriate readiness checks.

---

# AGENT BEHAVIOR

Before implementing a feature:

1. Understand business requirements.
2. Identify affected modules.
3. Identify database changes.
4. Identify API changes.
5. Identify authorization requirements.
6. Identify audit requirements.
7. Identify tests.
8. Implement.
9. Test.
10. Document.

Never silently change business rules.

Never invent SLA requirements.

Ask for clarification when the requirement materially affects SLA or employee accountability.