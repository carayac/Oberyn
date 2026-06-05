# Oberyn Supabase Database

Run these files in order:

1. `schema.sql`
2. `policies.sql`

For an existing Supabase project that already has the base schema, run the migration files in `database/migrations` in numeric order instead of re-running `schema.sql`.

PayGuard tables are added by `database/migrations/006_payguard.sql`. `database/migrations/007_remove_payguard_demo_seed.sql` removes the old demo PayGuard seed rows if they were inserted before mock fallback was removed. `database/migrations/008_require_real_payguard_tokens.sql` removes token defaults so every wallet/request must carry the real token selected by the project.

No seed data is included. Organizations, projects, integrations and rules must be created through the authenticated app/API so the workspace only contains real user data.

The frontend must not connect directly to Supabase for sensitive logic. Clerk validates user and organization context in the backend, and the backend uses Supabase clients for data access.

Private customer API keys should not be stored by Oberyn. SDK and Gateway configuration should reference customer-owned infrastructure and only persist safe metadata.

Audit events may include hashes, Merkle roots, and Stellar transaction references. Sensitive payloads must not be written to blockchain.
