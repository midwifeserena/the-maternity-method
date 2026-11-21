# Prelaunch course access

The public homepage redirects to the launch list. Course admission and payments are independent. The application currently has no checkout. Enabling course admission restrictions does not open sales on January 11, 2027.

## Activate tester access

1. Apply `supabase/migrations/202611210001_course_access.sql` to the hosted Supabase database. It installs the access checks in staging mode.
2. In Supabase SQL Editor, insert the approved testers' emails and the owner and admin sign-in emails. An invite has no expiry unless an `expires_at` is set. Testers can use existing accounts or create accounts at `/login`. Each account must have its invited email confirmed.

   ```sql
   insert into course_access_private.invites (email)
   values ('owner@example.com'), ('tester@example.com')
   on conflict (email) do nothing;
   ```

3. Set `COURSE_ACCESS_GATE=1` on the production Vercel project and deploy. This connects the portal routes and APIs to the database check. The flag requires the migration to be installed.
4. Switch the database to invite-only. Verify an approved account can open the portal and an unapproved account is sent to the enrollment notice. Check a direct PDF link or another course API with both accounts.

   ```sql
   update course_access_private.settings set invite_only=true where singleton;
   ```

To revoke a tester, delete their email from the private invite table or set an expiry. To restore the previous signed-in access during a rollback, set `invite_only=false`. The launch list and sign-in remain reachable in either mode.

The launch-day payment provider and the purchase-to-access flow are a separate setup. Keep billing closed until that flow is connected and tested.
