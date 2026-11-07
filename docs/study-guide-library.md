# Study Guides — replacement upload collection

The /study-guides page now shows ONLY the 19 PDFs uploaded by the user for this replacement, rather than the earlier generated sheets or any existing Supabase guide rows. The source files are preserved byte-for-byte. The collection contains 55 pages total. Search, multi-topic filters, Preview and Download remain available.

## Active files

1. Antepartum Assessment & Discomforts of Pregnancy — 3 pages — 01_Antepartum_Assessment_and_Discomforts.pdf
2. Chorioamnionitis & Neonatal Sepsis — 3 pages — 02_Chorioamnionitis_and_Neonatal_Sepsis.pdf
3. Ectopic & Molar Pregnancy — 2 pages — 03_Ectopic_and_Molar_Pregnancy.pdf
4. Fetal Monitoring — 3 pages — 04_Fetal_Monitoring.pdf
5. Gestational Diabetes — 3 pages — 05_Gestational_Diabetes.pdf
6. Hyperbilirubinemia & Hemolytic Disease of the Newborn — 3 pages — 06_Hyperbilirubinemia_and_Hemolytic_Disease.pdf
7. Labor Emergencies — 3 pages — 07_Labor_Emergencies.pdf
8. Neonatal Abstinence Syndrome & Fetal Alcohol Syndrome — 2 pages — 08_NAS_and_Fetal_Alcohol_Syndrome.pdf
9. Newborn Care — 3 pages — 09_Newborn_Care.pdf
10. Newborn Respiratory Complications — 3 pages — 10_Newborn_Respiratory_Complications.pdf
11. OB Medications — 3 pages — 11_OB_Medications.pdf
12. Placenta Previa & Placental Abruption — 3 pages — 12_Placenta_Previa_and_Abruption.pdf
13. Postpartum Care — 3 pages — 13_Postpartum_Care.pdf
14. Postpartum Hemorrhage (PPH) — 3 pages — 14_Postpartum_Hemorrhage.pdf
15. Preeclampsia — 3 pages — 15_Preeclampsia.pdf
16. Preterm Labor & Delivery — 3 pages — 16_Preterm_Labor_and_Delivery.pdf
17. Process of Labor & OB Procedures — 3 pages — 17_Process_of_Labor_and_OB_Procedures.pdf
18. Spontaneous Abortion, Incompetent Cervix & Intrauterine Fetal Demise — 3 pages — 18_Spontaneous_Abortion_Incompetent_Cervix_IUFD.pdf
19. TORCH Infections — 3 pages — 19_TORCH_Infections.pdf

## Replacement behavior

The PDFs overwrite the corresponding private bundled assets, retaining stable /api/study-guides/[slug] URLs so previously shared in-app links still work. Downloads use the original uploaded filenames. List titles and page counts match the new documents. The earlier generated-draft badges and one-page labels do not apply to these uploads and are no longer displayed for this collection. This is a file replacement, not a clinical review or a certification of the content.

The page no longer queries or merges Supabase guides. Older database records and Storage files are retained as an archive, not deleted, and will not be listed. Future additions must be added to the active bundled catalog unless the management workflow is changed separately. No production database operation or migration is required.

## Authentication and packaging

PDFs remain outside public, served only after Supabase getUser verifies sign-in. The handler accepts only catalog slugs, never an arbitrary request filename. Preview responses are inline; ?download=1 responses are attachments. Headers remain private/no-store with nosniff. next.config.ts includes all 19 private PDFs in the Vercel function trace.

content/study-guides/upload-manifest.json records the source filename, page count, and SHA-256 hash for each upload. It contains no private workspace paths. Tests verify every bundled PDF matches the uploaded original and check that the page renders only this replacement collection, requires sign-in, and rejects traversal. Existing exam and auth functionality is unchanged.

## Validation and release

Run the test suite, TypeScript, scoped ESLint and the production build; confirm the route trace contains all 19 PDFs. Browser checks cover 19 rows only, uploaded titles, correct 2/3-page labels, absence of old draft/one-page labels, filters/search/reset, link targets, and mobile widths. The local build uses temporary offline font fixtures because Google Fonts is blocked in the managed environment; these fixtures are not shipped.

This update is on the existing codex/study-guide-cheat-sheets review branch, based on current main. If its pull request is already open, the new commit updates it automatically. Review the authenticated Vercel preview at /study-guides and open/download a PDF before merging. No automatic production deployment was performed.
