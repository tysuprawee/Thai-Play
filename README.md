# ThaiPlay (ไทยเพลย์) - ตลาดซื้อขายไอดีเกมและบริการ

ThaiPlay คือแพลตฟอร์ม Marketplace สำหรับเกมเมอร์ชาวไทย ที่เน้นความปลอดภัยด้วยระบบ Escrow (คนกลางถือเงิน) และระบบยืนยันตัวตน

## ฟีเจอร์หลัก (MVP)

- **ค้นหาและเลือกซื้อ**: ค้นหาไอดีเกม, บริการดันแรงค์, และไอเท็มต่างๆ
- **ระบบสมาชิก**: สมัครสมาชิก, จัดการโปรไฟล์, และยืนยันตัวตน
- **ระบบซื้อขายปลอดภัย (Escrow)**:
  - ผู้ซื้อชำระเงิน -> เงินอยู่ที่ระบบกลาง
  - ผู้ขายส่งของ -> ผู้ซื้อตรวจสอบ -> กดยืนยัน
  - ระบบโอนเงินให้ผู้ขาย
- **แชทในตัว**: พูดคุยระหว่างผู้ซื้อ-ผู้ขาย ได้ทันทีที่มีคำสั่งซื้อ
- **รีวิว**: ให้คะแนนร้านค้าหลังจากทำรายการสำเร็จ

## การติดตั้งและใช้งาน (Local Development)

1. **ติดตั้งโปรแกรมที่จำเป็น**:
   - Node.js (v18 ขึ้นไป)
   - npm

2. **ติดตั้ง Dependencies**:
   ```bash
   npm install
   ```

3. **เตรียม Environment Variables**:
   สร้างไฟล์ `.env.local` ที่ root directory และใส่ค่าจาก Supabase ของคุณ:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=ของคุณ
   NEXT_PUBLIC_SUPABASE_ANON_KEY=ของคุณ
   ```

4. **เตรียมฐานข้อมูล (Supabase)**:
   - ไปที่ [Supabase Dashboard](https://supabase.com/dashboard)
   - เข้าเมนู **SQL Editor**
   - รันคำสั่งจากไฟล์ `supabase/schema.sql` ให้ครบถ้วน

5. **เริ่มรันโปรแกรม**:
   ```bash
   npm run dev
   ```
   เว็บจะเปิดที่ [http://localhost:3000](http://localhost:3000)

## การ Deploy ไป Vercel

โปรเจกต์นี้รองรับการ Deploy บน Vercel ทันที:

1. ดันโค้ดขึ้น GitHub
2. ไปที่ [Vercel](https://vercel.com) -> **Add New Project**
3. เลือก Repository ของคุณ
4. ในหน้าตั้งค่า **Environment Variables**:
   - เพิ่ม `NEXT_PUBLIC_SUPABASE_URL`
   - เพิ่ม `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. กด **Deploy**

---
พัฒนาโดยทีมงาน ThaiPlay
