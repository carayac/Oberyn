# Oberyn Supabase Database

Run these files in order:

1. `schema.sql`
2. `policies.sql`
3. `seed.sql`

The frontend must not connect directly to Supabase for sensitive logic. Clerk validates user and organization context in the backend, and the backend uses Supabase clients for data access.

Private customer API keys should not be stored by Oberyn. SDK and Gateway configuration should reference customer-owned infrastructure and only persist safe metadata.

Audit events may include hashes, Merkle roots, and Stellar transaction references. Sensitive payloads must not be written to blockchain.

