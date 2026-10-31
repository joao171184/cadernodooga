# Architecture rules

- Keep daily access reports in the shared report view with a mode selector; use admin-checked public RPCs for aggregated account data so account details are not exposed.
- Count registrations from account creation timestamps in the São Paulo timezone; keep login user-day counts separate because they measure different events.
- Store point variants in `ponto_versions` and save the parent, variants and classification links atomically through the authorized `save_ponto_with_versions` RPC; keep legacy point fields synchronized to the first published variant for compatibility with deployed clients and SEO.
- Cache only published variants, never drafts; public version selection is shared between the point page and fullscreen reader so ordering and privacy remain consistent.