# UVdesk Integration Skill

UVdesk is an optional external ticket provider.

The client owns the UVdesk environment.

The system must never assume administrator access.

Never:

- scrape UVdesk
- automate browser login
- store user passwords
- bypass authentication
- reverse-engineer private APIs

Only use an official API with authorized credentials.

Implement:

UVdeskTicketProvider

behind:

TicketProvider

The application must remain fully functional when:

- API credentials are missing
- API is unavailable
- API request fails
- ticket does not exist
- synchronization fails

Integration must use:

timeouts
retry handling
structured logs
sync status
last successful synchronization

External ticket IDs must be stored separately from internal ticket IDs.