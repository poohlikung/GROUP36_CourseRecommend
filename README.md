# กลุ่ม 36 **คอร์สดีบอกต่อ(ระบบแนะนำคอร์สเรียน) SEC.1**

# รายชื่อสมาชิกกลุ่ม
| ลำดับ | รหัสนักศึกษา | ชื่อ-นามสกุล | Emaill | Branch | หน้าที่รับผิดชอบ |
| :---: | :---: | :--- | :--- | :---: | :--- |
| 1 | 673380054-1 | นายภาคิน เมฆสุวรรณ  | phakin.m@kkumail.com | | |
| 2 | 673380072-9 | นายเกียรติศักดิ์ นันทรัตน์ | keattisak.n@kkumail.com | | |
| 3 | 673380062-2 |  นายศุภวัฒน์ ข่ายทอง | supawat.kh@kkumail.com | | |
| 4 | 673380064-8 | นายสรวิชญ์ วันเสน | sorawit.wan@kkumail.com | | |

## เริ่มระบบบนเครื่อง

1. คัดลอก `.env.example` เป็น `.env` แล้วตั้ง `POSTGRES_PASSWORD` เป็นรหัสผ่านสำหรับเครื่องตนเอง
2. รัน `docker compose up --build`
3. ตรวจ backend ที่ `http://localhost:8080/api/v1/system/liveness` และ Swagger ที่ `http://localhost:8080/swagger-ui.html`

ฐานข้อมูลสร้างด้วย Flyway migration เท่านั้น โดย JPA ใช้ `validate` เพื่อป้องกัน schema ถูกแก้โดยอัตโนมัติ
