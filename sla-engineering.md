# SLA Engineering Skill

SLA is a core business capability.

Never implement SLA calculations directly inside controllers or frontend components.

Create a dedicated SLA service.

Support:

- Response SLA
- Resolution SLA
- Business hours
- 24/7
- Holidays
- Weekends
- Pause
- Resume
- Warning thresholds
- Escalation

SLA calculation must be deterministic and testable.

All calculations must use UTC internally.

Display timestamps using configured timezone.

Every SLA calculation must be reproducible from stored events.

Never overwrite historical SLA calculations without creating an audit record.