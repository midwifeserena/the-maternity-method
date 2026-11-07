# Study Guide cheat-sheet library

The authenticated /study-guides page lists the 19 newly created stacked-style PDF cheat sheets, followed by existing published guides from Supabase. Students can search by topic, filter by category, preview a PDF, or download it. Cross-topic entries appear under each relevant category. The PDF clinical-review draft labels are retained and shown in the list.

## Included topics

1. Prenatal assessment & pregnancy discomforts — Antepartum
2. Intraamniotic infection & newborn sepsis — Intrapartum / Newborn
3. Ectopic & molar pregnancy — Antepartum
4. Fetal heart rate monitoring — Intrapartum
5. Gestational diabetes — Antepartum
6. Newborn jaundice & hemolytic disease — Newborn
7. Labor emergencies — Intrapartum
8. Newborn withdrawal & prenatal alcohol exposure — Newborn
9. Newborn care essentials — Newborn
10. Newborn respiratory complications — Newborn
11. OB medication safety — Antepartum / Intrapartum / Postpartum
12. Placenta previa & placental abruption — Antepartum / Intrapartum
13. Postpartum assessment & recovery — Postpartum
14. Postpartum hemorrhage — Postpartum
15. Preeclampsia & eclampsia — Antepartum / Postpartum
16. Preterm labor & membrane rupture — Antepartum / Intrapartum
17. Labor progress & OB procedures — Intrapartum
18. Pregnancy loss, cervical insufficiency & fetal death — Antepartum
19. Congenital infections: TORCH & beyond — Antepartum / Newborn

## Files and access

- PDF files live in content/study-guides, outside public.
- lib/study-guide-catalog.mjs defines their names, categories, and allowlisted filenames.
- app/(platform)/study-guides/page.tsx is a dedicated authenticated page; it takes precedence over the existing generic section route. Other section pages remain unchanged.
- app/api/study-guides/[slug]/route.ts verifies the Supabase user before serving bytes. Unknown slugs return 404; requests cannot choose arbitrary filenames. Preview uses inline Content-Disposition; ?download=1 uses attachment. Responses are private and no-store.
- next.config.ts adds outputFileTracingIncludes only for the PDF API route, ensuring all 19 files are packaged in Vercel. Existing configuration was absent.
- No database migration, SQL import, public Storage bucket, or manual PDF upload is required for this batch. Existing published Supabase guide rows remain visible. A database loading error shows a notice while retaining the bundled library.

## Content status

These are the user-requested educational drafts, not newly verified clinical guidelines. They remain visibly labeled Clinical review draft. Clinical review before use as final student teaching material remains necessary. This change does not remove those labels or claim clinical approval.

## Validation and release

Automated tests cover catalog completeness, PDF signatures, preserving older guides, combined search/category filters, authenticated PDF access, traversal protection, private response headers, preview/download disposition, and controlled missing-file errors. Browser fixture checks cover all 19 names plus an older guide, search/reset, multi-category filtering, link targets, and mobile/desktop sizing. Production build output tracing must include all 19 PDFs. The environment blocks Google Fonts downloads; the local build uses temporary offline font fixtures outside the repository.

Review the feature branch through Vercel Preview, sign in, and visit /study-guides. Preview and download one or more PDFs before merging. Nothing was deployed automatically, and no production database content was changed.
