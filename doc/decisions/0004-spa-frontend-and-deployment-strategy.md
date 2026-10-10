# 0004: สถาปัตยกรรม Frontend (SPA) และกลยุทธ์การ Deploy บน Cloud

- **สถานะ:** ยอมรับ (Accepted)
- **วันที่:** 15 กันยายน 2026
- **ผู้ตัดสินใจ:** ทีมพัฒนา กลุ่ม 36

---

## 1. บริบทและปัญหา (Context)
รายวิชา CP353002 กำหนดให้ระบบต้องมี:
1. ฝั่ง Frontend ที่เชื่อมต่อกับ REST API ได้จริง (สามารถเลือก Thymeleaf หรือ SPA Framework เช่น React/Vue/Angular)
2. ระบบต้อง Deploy ขึ้น Cloud/Server และสามารถเข้าใช้งานผ่าน Public URL ได้จริง ณ วันตรวจส่งงาน
3. มีข้อจำกัดด้านค่าใช้จ่าย (งบประมาณ 0 บาท) สำหรับงานส่งวิชาของนักศึกษา

---

## 2. การตัดสินใจ (Decision)
ทีมตัดสินใจเลือกพัฒนา Frontend เป็นแบบ **SPA (Single Page Application)** และเลือกใช้บริการ Cloud Free Tier โดยมีรายละเอียดดังนี้:

1. **เทคโนโลยี Frontend:**
   - ใช้ **React 18 + TypeScript + Vite + Tailwind CSS**
   - ใช้ **React Router** ในการจัดการหน้าจอ (SPA Routing)
   - ตัดความซับซ้อนของ Server-Side Rendering (SSR) ออกในรอบส่งงาน เพื่อลดภาระการประมวลผล

2. **โครงสร้างสถาปัตยกรรมการ Deploy (Cloud Free Tier):**
   - **Frontend:** Deploy บน **Vercel Hobby** (บริการฟรี รวดเร็ว และมี CDN ทั่วโลก)
   - **Backend:** Deploy บน **Render Free Web Service** ผ่าน Dockerfile
   - **Database:** Deploy บน **Neon Free Serverless PostgreSQL**
   - **Network & Proxy:** ใช้ **Vercel Rewrite Proxy** ในการส่งคำขอ `/api/v1/*` ไปยัง Render เพื่อแก้ไขปัญหา Cross-Origin Cookie และ CORS ระหว่างโดเมน

3. **การจัดการข้อจำกัดของ Cloud Free Tier (Cold-Start Management):**
   - Render Free จะสั่ง Instance เข้าสู่โหมดพัก (Sleep) เมื่อไม่มีการเรียกใช้งานเกิน 15 นาที ซึ่งต้องใช้เวลาปลุกประมาณ 50-70 วินาที
   - ออกแบบหน้าเว็บ Frontend ให้เปิดโครงหน้าเว็บและ Skeleton Loading ได้ทันทีโดยไม่ต้องรอ Backend ตื่น
   - มีระบบตรวจสอบสถานะระบบเบื้องต้น (Liveness Probe) และแสดงหน้าจอ "กำลังเตรียมระบบ..." พร้อมปุ่มลองใหม่ (Retry) โดยไม่ทำให้ผู้ใช้เข้าใจผิดว่าระบบพัง

---

## 3. ผลลัพธ์และข้อพิจารณา (Consequences)

### ข้อดี:
- ค่าใช้จ่ายเริ่มต้นเป็น 0 บาท ผ่านโควตา Free Tier ของทุกแพลตฟอร์ม
- หน้าเว็บโหลดเร็ว ใช้งานลื่นไหลแบบ SPA
- มีการแก้ไขปัญหา Cross-Origin Cookie และ CORS ตั้งแต่ระดับการออกแบบ (Vercel Proxy)

### ข้อจำกัด / สิ่งที่ต้องระวัง:
- ต้องยอมรับเรื่องความล่าช้าในการเปิดหน้าเว็บครั้งแรก (Cold Start) จากฝั่ง Render และ Neon
- ต้องเตรียมระบบ Local สำรองด้วย Docker Compose ไว้เผื่อกรณี Cloud Free Tier มีปัญหาในวันนำเสนอจริง
