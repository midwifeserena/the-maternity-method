# Case-only and mixed exam selection

The former format buttons toggled membership. Clicking NGN Case Studies Only from the default standalone selection therefore selected both formats. The presets now choose exactly the named format. Separate labeled checkboxes preserve combinations; All Questions selects available formats without making an empty standalone NGN pool mandatory.

Case-only exams require multiples of six, with enough complete published cases in the selected subjects. Mixed exams retain complete six-item case groups and existing player, scoring, submission, review and ownership behavior. Standard mode randomizes the eligible standalone and case pools before selection. Maximum total remains 150.

No new migration is introduced or applied. Existing combined-exam infrastructure is still required: supabase/migrations/202611100001_combined_exam_sessions.sql followed by 202611110001_exam_limit_150.sql, with their documented prerequisites. Review those existing migrations in staging before production. A failed capability check does not confirm that production is configured; live credentials were unavailable during development. The builder displays the required filenames when setup is unavailable.

Validation: Node suite, TypeScript, scoped ESLint, production build; Chromium checks for six and eighteen case-only questions, mixed All Questions with no standalone NGN pool, all formats at 150, study/timed players, partial scoring, post-submission case reveal, saved review and mobile layouts. Browser data APIs are mocked; production SQL has not been applied or tested by this change.
