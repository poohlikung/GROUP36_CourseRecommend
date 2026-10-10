INSERT INTO platforms (name, slug, allowed_host) VALUES
('Coursera', 'coursera', 'coursera.org'),
('Udemy', 'udemy', 'udemy.com'),
('Chula MOOC', 'chula-mooc', 'mooc.chula.ac.th'),
('FutureSkill', 'futureskill', 'futureskill.co'),
('edX', 'edx', 'edx.org');

INSERT INTO providers (name, slug, description, website_url, status, version) VALUES
('Chulalongkorn University', 'chulalongkorn-university', 'สถาบันการศึกษาระดับอุดมศึกษาชั้นนำของประเทศไทย ให้บริการคอร์สเรียนออนไลน์ผ่าน Chula MOOC', 'https://mooc.chula.ac.th', 'ACTIVE', 0),
('DeepLearning.AI', 'deeplearning-ai', 'สถาบันการศึกษาด้าน AI และ Machine Learning ก่อตั้งโดย Andrew Ng มุ่งเน้นการสอนปัญญาประดิษฐ์ระดับสากล', 'https://www.deeplearning.ai', 'ACTIVE', 0),
('Borntodev', 'borntodev', 'คอมมูนิตี้และผู้สร้างสรรค์คอร์สเรียนด้านการเขียนโปรแกรมและการพัฒนาซอฟต์แวร์ภาษาไทย', 'https://www.borntodev.com', 'ACTIVE', 0),
('Google Cloud Training', 'google-cloud-training', 'หลักสูตรฝึกอบรมอย่างเป็นทางการจาก Google Cloud ครอบคลุม Cloud Architecture, Data และ DevOps', 'https://cloud.google.com/training', 'ACTIVE', 0),
('Harvard Online', 'harvard-online', 'สถาบันการศึกษาออนไลน์จากมหาวิทยาลัยฮาร์วาร์ด ผู้ผลิตหลักสูตรชื่อดังระดับโลก เช่น CS50', 'https://online-learning.harvard.edu', 'ACTIVE', 0);

INSERT INTO users (email, password_hash, role, status) VALUES
('admin@coursehub.local', '$2a$10$7EqJtq98hPqEX7fNZaFWoOsi/w840f3QpQxKjD6D0vC4u7QG5T/5q', 'ADMIN', 'ACTIVE'),
('instructor.cs@kku.ac.th', '$2a$10$7EqJtq98hPqEX7fNZaFWoOsi/w840f3QpQxKjD6D0vC4u7QG5T/5q', 'LEARNER', 'ACTIVE'),
('learner.keattisak@kkumail.com', '$2a$10$7EqJtq98hPqEX7fNZaFWoOsi/w840f3QpQxKjD6D0vC4u7QG5T/5q', 'LEARNER', 'ACTIVE'),
('learner.sorawit@kkumail.com', '$2a$10$7EqJtq98hPqEX7fNZaFWoOsi/w840f3QpQxKjD6D0vC4u7QG5T/5q', 'LEARNER', 'ACTIVE');

INSERT INTO user_profiles (user_id, display_name, bio, avatar_path) VALUES
(1, 'CourseHub Administrator', 'ผู้ดูแลระบบ CourseHub Platform', '/avatars/admin.png'),
(2, 'Asst. Prof. Dr. Instructor (KKU)', 'อาจารย์ประจำสาขาวิชาวิทยาการคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น', '/avatars/instructor-kku.png'),
(3, 'Keattisak Nantharat', 'นักศึกษาสาขาวิชาวิทยาการคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น ผู้หลงใหลใน Full-Stack Development', '/avatars/keattisak.png'),
(4, 'Sorawit Wansen', 'นักศึกษาสาขาวิชาวิทยาการคอมพิวเตอร์ ผู้เชี่ยวชาญด้าน Software Architecture', '/avatars/sorawit.png');

INSERT INTO provider_members (provider_id, user_id, member_role) VALUES
(1, 2, 'OWNER');

INSERT INTO categories (name, slug) VALUES
('Computer Science & Programming', 'programming'),
('Data Science & AI', 'data-science-ai'),
('Web & Mobile Development', 'web-mobile-dev'),
('Cloud Computing & DevOps', 'cloud-devops'),
('Business & Digital Marketing', 'business-marketing'),
('UI/UX & Graphic Design', 'design-uiux');

INSERT INTO courses (provider_id, platform_id, title, slug, description, url, level, language, effort_hours, status, version) VALUES
(5, 5, 'Introduction to Computer Science (CS50x)', 'cs50-introduction-to-computer-science', 'หลักสูตรปูพื้นฐานวิทยาการคอมพิวเตอร์ระดับตำนานจาก Harvard มุ่งเน้นการคิดเชิงคำนวณ การแก้ปัญหา และการเขียนโปรแกรมด้วย C, Python, SQL และ Web Technologies', 'https://www.edx.org/learn/computer-science/harvard-university-cs50-s-introduction-to-computer-science', 'BEGINNER', 'ENGLISH', 120, 'PUBLISHED', 0),
(2, 1, 'Machine Learning Specialization', 'machine-learning-specialization', 'หลักสูตรเจาะลึก Machine Learning สอนโดย Andrew Ng ครอบคลุม Supervised Learning, Advanced Learning Algorithms และ Unsupervised Learning', 'https://www.coursera.org/specializations/machine-learning-introduction', 'INTERMEDIATE', 'ENGLISH', 60, 'PUBLISHED', 0),
(3, 4, 'Full-Stack Web Development Bootcamp', 'full-stack-web-development-bootcamp', 'คอร์สเรียนพัฒนาเว็บแอปพลิเคชันแบบครบวงจรภาษาไทย ตั้งแต่ HTML, CSS, JavaScript, Node.js ไปจนถึง React และ Database พร้อมทำโปรเจกต์จริง', 'https://futureskill.co/course/detail/fullstack-bootcamp', 'BEGINNER', 'THAI', 45, 'PUBLISHED', 0),
(1, 3, 'Data Analytics and Python for Everyone', 'data-analytics-python-everyone', 'คอร์สเรียนฟรีจาก Chula MOOC เรียนรู้หลักการวิเคราะห์ข้อมูลเบื้องต้น การเตรียมข้อมูล และการนำ Python มาประยุกต์ใช้ในงาน Data Science', 'https://mooc.chula.ac.th/courses/data-python', 'BEGINNER', 'THAI', 20, 'PUBLISHED', 0),
(4, 1, 'Google Cloud Associate Cloud Engineer', 'google-cloud-associate-cloud-engineer', 'เตรียมพร้อมสู่การเป็นวิศวกรคลาวด์มืออาชีพ เรียนรู้การจัดการระบบเครือข่าย Storage, Compute Engine และ Kubernetes บน Google Cloud Platform', 'https://www.coursera.org/professional-certificates/gcp-cloud-engineer', 'INTERMEDIATE', 'ENGLISH', 35, 'PUBLISHED', 0),
(3, 2, 'UI/UX Design Masterclass: From Wireframe to Prototype', 'ui-ux-design-masterclass', 'เรียนรู้กระบวนการออกแบบ User Interface และ User Experience อย่างมืออาชีพ ทำความเข้าใจ Design Thinking และการใช้งาน Figma สร้าง Interactive Prototype', 'https://www.udemy.com/course/ui-ux-masterclass', 'BEGINNER', 'THAI', 18, 'PUBLISHED', 0);

INSERT INTO course_prices (course_id, payment_type, amount, currency) VALUES
(1, 'FREE', 0.00, 'THB'),
(2, 'SUBSCRIPTION', 1750.00, 'THB'),
(3, 'ONE_TIME', 2490.00, 'THB'),
(4, 'FREE', 0.00, 'THB'),
(5, 'SUBSCRIPTION', 1750.00, 'THB'),
(6, 'ONE_TIME', 1290.00, 'THB');

INSERT INTO course_categories (course_id, category_id) VALUES
(1, 1), -- CS50 -> Computer Science
(1, 3), -- CS50 -> Web & Mobile
(2, 2), -- ML Spec -> Data Science & AI
(3, 1), -- Full-Stack -> Computer Science
(3, 3), -- Full-Stack -> Web & Mobile
(4, 2), -- Data Analytics -> Data Science & AI
(5, 4), -- Google Cloud -> Cloud Computing & DevOps
(6, 6); -- UI/UX -> Design

INSERT INTO reviews (course_id, user_id, overall_score, content_score, teaching_score, difficulty_score, body, status) VALUES
(1, 3, 5, 5, 5, 4, 'เนื้อหาดีมากๆ ปูพื้นฐานวิทยาการคอมพิวเตอร์อย่างลึกซึ้ง อาจารย์สอนสนุกและเห็นภาพชัดเจน แนะนำสำหรับทุกคนที่อยากเริ่มเขียนโค้ด', 'PUBLISHED'),
(3, 4, 5, 5, 4, 3, 'คอร์สภาษาไทยที่อธิบายเข้าใจง่าย Workshop มีประโยชน์มาก ช่วยให้เข้าใจภาพรวมของการทำ Full-Stack ได้ดีเยี่ยม', 'PUBLISHED'),
(4, 3, 5, 5, 5, 3, 'คอร์สฟรีคุณภาพระดับพรีเมียมจากจุฬาฯ เหมาะมากสำหรับคนที่ไม่มีพื้นฐาน Data มาก่อนและอยากเริ่มต้นด้วย Python', 'PUBLISHED');

INSERT INTO saved_courses (user_id, course_id) VALUES
(3, 2), -- Keattisak saved Machine Learning Specialization
(4, 1); -- Sorawit saved CS50

INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, old_status, new_status) VALUES
(1, 'PUBLISH_COURSE', 'COURSE', 1, 'DRAFT', 'PUBLISHED'),
(1, 'PUBLISH_COURSE', 'COURSE', 2, 'DRAFT', 'PUBLISHED'),
(1, 'PUBLISH_COURSE', 'COURSE', 3, 'DRAFT', 'PUBLISHED'),
(1, 'PUBLISH_COURSE', 'COURSE', 4, 'DRAFT', 'PUBLISHED'),
(1, 'PUBLISH_COURSE', 'COURSE', 5, 'DRAFT', 'PUBLISHED'),
(1, 'PUBLISH_COURSE', 'COURSE', 6, 'DRAFT', 'PUBLISHED');
