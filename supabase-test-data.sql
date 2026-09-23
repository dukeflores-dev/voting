-- Demo seed data for local/staging testing only.
-- Run supabase-security.sql first, then run this file in Supabase SQL Editor.
-- This intentionally uses election id 1 because the current app reads election id 1.
-- Do not run this against production election data without a backup.

begin;

update public.elections
set title = 'Demo Student Council Election 2026',
    status = 'active',
    start_date = current_date,
    end_date = current_date + 7,
    deadline = '23:59',
    eligible_voters = 5
where id = 1;

insert into public.candidates (
  election_id, name, group_name, position, initials, description,
  background, credentials, achievements, relevant_information
)
select 1, candidate.name, candidate.group_name, candidate.position, candidate.initials,
       candidate.description, candidate.background, candidate.credentials,
       candidate.achievements, candidate.relevant_information
from (values
  ('Alyssa Cruz', 'Student First', 'PRESIDENT', 'AC', 'A practical leader focused on student welfare.', 'Grade 12 student and class representative.', 'Class leadership and peer mentoring.', 'Organized a school supply drive.' , 'Prioritizes transparent student council updates.'),
  ('Marco Reyes', 'Student First', 'VICE PRESIDENT', 'MR', 'Building a more active and inclusive student community.', 'Grade 11 student volunteer.', 'Event planning and student activities.', 'Coordinated three campus events.', 'Supports accessible activities for every year level.'),
  ('Bea Santos', 'Independent', 'SECRETARY', 'BS', 'Clear records and reliable communication for students.', 'Grade 10 student and club officer.', 'Documentation and organization.', 'Maintained club records for one school year.', 'Plans to publish regular council announcements.'),
  ('Noah Garcia', 'Independent', 'TREASURER', 'NG', 'Responsible budgeting for meaningful student projects.', 'Grade 12 student volunteer.', 'Basic project budgeting and fundraising.', 'Helped manage a classroom fundraising project.', 'Supports public summaries of approved project spending.'),
  ('Ella Flores', 'Campus Voice', 'AUDITOR', 'EF', 'Accountability and careful review of council activities.', 'Grade 11 student leader.', 'Reviewing project plans and reports.', 'Served as a club committee reviewer.', 'Encourages regular checks of council records.')
) as candidate(name, group_name, position, initials, description, background, credentials, achievements, relevant_information)
where not exists (
  select 1 from public.candidates existing
  where existing.election_id = 1
    and existing.name = candidate.name
    and existing.position = candidate.position
);

commit;

-- Scenario switches:
-- Active election:   update public.elections set status = 'active' where id = 1;
-- Closed election:   update public.elections set status = 'closed' where id = 1;
-- Reset to active:   delete from public.vote_ballots where election_id = 1 and voter_id = '<TEST_VOTER_UUID>';
-- Never place real candidate selections in this seed file.
