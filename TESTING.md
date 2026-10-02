# Test Accounts and Demo Data

These accounts are for local or staging testing only. Create them in Supabase Dashboard > Authentication > Users with **Auto Confirm User** enabled.

| Account | Email | Password | Metadata |
| --- | --- | --- | --- |
| Test voter | `voter.test@elourdes.local` | `20260001` | `full_name`: `Demo Voter`, `student_id`: `20260001`, `role`: `voter` |
| Test admin | `admin.test@elourdes.local` | `TestAdmin!2026` | `full_name`: `Demo Admin`, `app_metadata.role`: `admin` |

The admin role must be set in server-managed `app_metadata` before opening `admin.html`. Never grant admin access through client-editable `user_metadata`.
New voter passwords initially match their Student IDs. Voters can set a different password from My Profile > Edit Profile while signed in.

## Admin-Created Student Accounts

1. Disable public signups in Supabase Dashboard > Authentication > Sign In / Providers so students cannot register through the Auth API. The local Supabase configuration also disables signups.
2. Deploy the admin-only account function with `supabase functions deploy create-student-account`.
3. Sign in as an admin, open `admin.html`, and use **Create Student Account**. Enter the student's name, Student ID, email, gender, and year level.
4. The student logs in with their Student ID and the same value as the initial password, then may change their password from My Profile > Edit Profile.
5. Verify a voter session receives a forbidden response from `create-student-account`, duplicate Student IDs are rejected, and the admin-created student can log in.

The function verifies the caller's access token and `app_metadata.role` before using the service-role key. The service-role key remains server-side.

## Enable Student ID Login

1. Run `supabase-student-id-login.sql` in the Supabase SQL Editor. It creates a private Student ID lookup, backfills existing registrations, and maps future registrations automatically.
2. Install and authenticate the Supabase CLI, then link this folder to project `ilwixrwknjywonoahmof` with `supabase link --project-ref ilwixrwknjywonoahmof`.
3. Deploy the login function with `supabase functions deploy login-with-student-id`.
4. Create a test voter through the admin portal, then verify that their Student ID and initial password log in. Confirm that an unregistered ID or incorrect password returns a generic error.
5. Sign in as the voter, open My Profile > Edit Profile, set matching New Password and Confirm Password values, and save. Verify Student ID login accepts the new password and rejects the old one. Also verify mismatched values are rejected without saving.

The function uses Supabase's server-provided `SUPABASE_SERVICE_ROLE_KEY` only on the server. Never add that key to an HTML or JavaScript file. The lookup table grants no access to browser roles.

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
