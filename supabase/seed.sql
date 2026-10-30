-- Sample editorial content for development. Have an OB clinical educator independently review before public release.
with q as (
 insert into public.questions(category,type,stem,options,published)
 values ('Antepartum','single','A pregnant patient at 32 weeks reports painless bright red vaginal bleeding. Which action should the nurse prioritize?',
 '[{"id":"a","label":"Prepare for a digital vaginal examination"},{"id":"b","label":"Assess maternal vital signs and fetal status, and notify the provider"},{"id":"c","label":"Encourage walking to evaluate the bleeding"},{"id":"d","label":"Administer a uterotonic without an order"}]'::jsonb,true)
 returning id
) insert into public.question_solutions(question_id,answer_key,rationale)
select id,'"b"'::jsonb,'Painless bleeding in the third trimester is concerning for placenta previa, although several conditions can cause antepartum bleeding. The immediate nursing priority is maternal assessment, fetal surveillance, and escalation to the obstetric team.\n\nDigital vaginal examination should be avoided until placenta location is established because it can precipitate severe hemorrhage if previa is present. Continue to monitor hemodynamic status and follow facility hemorrhage protocols.' from q;
with q as (
 insert into public.questions(category,type,stem,options,published)
 values ('Postpartum','sata','Which findings warrant prompt assessment for postpartum hemorrhage? Select all that apply.',
 '[{"id":"a","label":"Boggy uterus with heavy vaginal bleeding"},{"id":"b","label":"Increasing heart rate and dizziness"},{"id":"c","label":"Saturating a perineal pad rapidly"},{"id":"d","label":"Firm midline uterus with scant lochia and stable vital signs"},{"id":"e","label":"New pallor and low blood pressure"}]'::jsonb,true)
 returning id
) insert into public.question_solutions(question_id,answer_key,rationale)
select id,'["a","b","c","e"]'::jsonb,'Postpartum hemorrhage may present with heavy bleeding, uterine atony, and evolving signs of hypovolemia. A boggy uterus is consistent with uterine atony and requires urgent intervention following the hemorrhage protocol.\n\nTachycardia, dizziness, pallor, and hypotension are concerning for significant blood loss. A firm uterus with scant lochia and stable vital signs is less suggestive of active hemorrhage. Always assess the overall clinical picture.' from q;
with q as (
 insert into public.questions(category,type,stem,options,matrix_rows,chart,published)
 values ('Intrapartum','matrix','For each finding, identify the most appropriate classification.',
 '[{"id":"reassuring","label":"Reassuring"},{"id":"concerning","label":"Requires prompt evaluation"}]'::jsonb,
 '[{"id":"r1","label":"Baseline fetal heart rate 140 bpm with moderate variability"},{"id":"r2","label":"Recurrent late decelerations with minimal variability"},{"id":"r3","label":"Maternal blood pressure 80/48 mmHg after epidural"}]'::jsonb,
 '{"Nurses’ Notes":"Laboring patient at 39 weeks, receiving oxytocin. Epidural placed 15 minutes ago.","Vital Signs":"Maternal BP: 80/48 mmHg; HR: 112 bpm.","Lab Results":"No new results.","Provider Orders":"Continuous fetal monitoring. Notify provider for recurrent late decelerations or significant hypotension."}'::jsonb,true)
 returning id
) insert into public.question_solutions(question_id,answer_key,rationale)
select id,'{"r1":"reassuring","r2":"concerning","r3":"concerning"}'::jsonb,'Moderate baseline variability at a normal baseline rate is generally a reassuring fetal finding. It reflects current autonomic nervous system responsiveness.\n\nRecurrent late decelerations with minimal variability warrant prompt evaluation for potential uteroplacental insufficiency. Significant maternal hypotension after neuraxial anesthesia can reduce placental perfusion and requires rapid maternal support and communication with the care team.' from q;
