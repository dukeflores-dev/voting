# Test Accounts and Demo Data

These accounts are for local or staging testing only. Create them in Supabase Dashboard > Authentication > Users with **Auto Confirm User** enabled.

| Account | Email | Password | Metadata |
| --- | --- | --- | --- |
| Test voter | `voter.test@elourdes.local` | `TestVoter!2026` | `full_name`: `Demo Voter`, `student_id`: `TEST-0001`, `role`: `voter` |
| Test admin | `admin.test@elourdes.local` | `TestAdmin!2026` | `full_name`: `Demo Admin`, `role`: `admin` |

The admin role must be placed in the user's metadata before opening `admin.html`. For production, use server-managed `app_metadata` instead of trusting client-editable metadata.

## Seed Demo Data

1. Run `supabase-security.sql` in the Supabase SQL Editor if the schema is not set up yet.
2. Create the two test users above and copy the test voter's UUID.
3. Run `supabase-test-data.sql` to seed the demo election and five candidates.
4. Sign in through `index.html` with either test account.

The seed uses election id `1` because the current application reads that election. It changes that election to an active demo election, so use it only in a test project or after backing up existing data.

## Scenarios

- **New voter:** Sign in as the test voter and submit one ballot. Verify the persistent receipt and `Voted` status.
- **Already voted:** Reload the dashboard with the same test voter. The vote button stays disabled and the receipt remains visible.
- **Closed election:** Run `update public.elections set status = 'closed' where id = 1;` and reload. Verify that voting is disabled and results access follows the closed-election flow.
- **Reset voter:** Remove only the test voter's ballot with `delete from public.vote_ballots where election_id = 1 and voter_id = '<TEST_VOTER_UUID>';`, then set the election back to active.
- **Admin management:** Sign in as the test admin and add, edit, delete, and restore a candidate from the admin portal.

Never use these credentials or the demo seed in production.
