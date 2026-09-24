DELETE FROM audit_logs
WHERE actor_user_id IN (
    SELECT id FROM users WHERE email IN (
        'admin@coursehub.local',
        'instructor.cs@kku.ac.th',
        'learner.keattisak@kkumail.com',
        'learner.sorawit@kkumail.com'
    )
);

DELETE FROM users
WHERE email IN (
    'admin@coursehub.local',
    'instructor.cs@kku.ac.th',
    'learner.keattisak@kkumail.com',
    'learner.sorawit@kkumail.com'
);
