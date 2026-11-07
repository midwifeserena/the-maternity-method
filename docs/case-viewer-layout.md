# Case-study patient information layout

Case questions in the shared Study/Timed player show Question N of 6 above the scenario and tabbed patient chart in the left pane. The question stem, answer controls and permitted feedback stay in the right pane. The top bar retains overall exam position, including in mixed exams. Completed exam review reuses the same patient-information component. The legacy NGN window also uses Question rather than Item.

Desktop live-exam panes scroll independently with fixed header and footer. Mobile screens stack patient context above the question. CSS uses existing light/dark theme variables. Patient scenario and chart retain the annotation-region attributes for existing text highlighting; question selection and reveal rules are unchanged.

No database, scoring, submission, authentication or content changes are required. Node tests, TypeScript, scoped ESLint and production build pass. Chromium tests with mock exam APIs cover local case numbering, patient/question placement, chart tabs, light/dark viewing, case-only and mixed sessions, six NGN formats, submission/partial scoring, preserved saved review and phone/tablet widths. No production deployment was performed.
