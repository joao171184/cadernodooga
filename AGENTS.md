# Architecture rules

- Keep daily access reports in the shared report view with a mode selector; use admin-checked public RPCs for aggregated account data so account details are not exposed.
- Count registrations from account creation timestamps in the São Paulo timezone; keep login user-day counts separate because they measure different events.