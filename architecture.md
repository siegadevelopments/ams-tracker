# AMS Architecture

## Frontend

Next.js
TypeScript
Tailwind CSS

Responsibilities:

- UI
- Forms
- Dashboard
- Tables
- Charts
- Authentication UI

Frontend must not contain authoritative SLA calculations.

---

## Backend

FastAPI

Layers:

API
↓
Application Services
↓
Domain Services
↓
Repositories
↓
Database

---

## Domain Services

AttendanceService

ShiftService

ActivityService

TicketService

SLAService

HandoverService

MonitoringService

ReportingService

NotificationService

AuditService

---

## Integration Layer

TicketProvider

SlackProvider

NotificationProvider

AIProvider

Implementations:

ManualTicketProvider

UVdeskTicketProvider

SlackProvider

MockAIProvider

FutureAIProvider

---

## Database

PostgreSQL

Primary entities:

User
Team
Shift
Attendance
Activity
Ticket
SLA Policy
SLA Calculation
SLA Event
Monitoring Item
Monitoring Record
Handover
Notification
Audit Log
Integration

---

## Background Jobs

Use background workers for:

SLA monitoring
Notification processing
UVdesk synchronization
Report generation
AI summaries

Do not block user requests for long-running operations.

---

## Source of Truth

Attendance:

AMS Database

Activities:

AMS Database

Handover:

AMS Database

SLA:

AMS SLA Engine

Ticket details:

AMS Database + external provider when available

Slack:

Communication channel

UVdesk:

External ticket provider