# Lab 1 — Peer Review Record

**Author:** Kantawan Inthanon — 67070505229 — GitHub: @Achikan

**Peer reviewers:**
- ธีรภัทร ใจงาม — 67070501063 — GitHub: @thrxpt
- ปทิตญา แก้ววิเชียร — 67070505220 — GitHub: @babywinter01
- สุประวีณ์ สุทธิเสรีนิวัฒน์ — 67070505227 — GitHub: @Suprawi5227

## Pull Requests I authored (reviewed by my partner)

### PR 1 — feature/1-project-foundation → lab1-staging
- PR Link: https://github.com/Achikan/TokTickIT/pull/1
- Reviewer: ธีรภัทร ใจงาม 67070501063 (@thrxpt)
- Review Comment: "LGTM"
- My Response: No changes required. PR approved and merged.
- Outcome: Approved and merged

### PR 2 — feature/2-health-check → lab1-staging
- PR Link: https://github.com/Achikan/TokTickIT/pull/6
- Reviewer: ปทิตญา แก้ววิเชียร 67070505220 (@babywinter01)
- Review Comment: "ใน server/src/app.ts ยังมี res.status(501) และ TODO เดิมอยู่ก่อน response 200 ควรลบออกให้เหลือ implementation ของ 200 เพียงอันเดียว"
- My Response: ชี้แจงว่า stub 501/TODO ถูกลบออกแล้วใน commit 7e7a2dd เหลือเฉพาะ implementation 200 (สิ่งที่เห็นใน diff เป็นบรรทัดที่ถูกลบ)
- Outcome: Approved and merged — "ดีเยี่ยม"

### PR 3 — feature/3-category-seed → lab1-staging
- PR Link: https://github.com/Achikan/TokTickIT/pull/7
- Reviewer: ปทิตญา แก้ววิเชียร 67070505220 (@babywinter01)
- Review Comment: "อยากให้มี test หรือ evidence ของการรัน seed โดยเฉพาะทดสอบว่า seed แล้วได้ครบ 4 categories และเมื่อรันซ้ำแล้วไม่เกิด duplicate"
- My Response: refactor seed เป็น seedCategories() และเพิ่ม server/tests/lab-01/seed.test.ts 2 tests — ผ่านทั้งคู่
- Outcome: Approved and merged

### PR 4 — feature/4-category-list → lab1-staging
- PR Link: https://github.com/Achikan/TokTickIT/pull/9
- Reviewer: ปทิตญา แก้ววิเชียร 67070505220 (@babywinter01)
- Review Comment: "อยากให้เช็ก scope ของ PR เพราะมี commit ของ Issue 2 ติดมาด้วย ควรเช็กว่า PR ไม่ได้เอา code เดิมมาซ้ำ"
- My Response: rebase feature/4-category-list ขึ้น lab1-staging ล่าสุด — commit ที่ซ้ำหายไป เหลือเฉพาะ commit ของ Issue 4 (diff เหลือ 6 ไฟล์)
- Outcome: Approved and merged — "ยอดเยี่ยม เริ่ดๆ"

### PR 10 — lab1-staging → main (final promotion)
- PR Link: https://github.com/Achikan/TokTickIT/pull/10
- Reviewer: สุประวีณ์ สุทธิเสรีนิวัฒน์ 67070505227 (@Suprawi5227)
- Review Comment: "โค้ดเขียนได้สะอาด เป็นระเบียบ และโครงสร้างโปรเจกต์ (React + Express + Prisma) วางมาดีมาก มีการแยกส่วนการทำงานของ API, UI State และ Database อย่างชัดเจน"
- My Response: No changes required. PR approved and merged.
- Outcome: Approved and merged

## Pull Requests I reviewed for my partner

### 1. Issue 3 — Create and seed IT request categories
- PR Link: https://github.com/jejaebubu/toktickit/pull/7#event-29345036584
- Partner: พัฒนาวดี แสงเงินยอด 67070505222 (@jejaebubu)
- My Review Comment: รัน npx prisma migrate dev --name init ในเครื่อง และ commit ตัว migration file ขึ้นมาด้วย จะได้ให้เพื่อนรัน migration บนฐานข้อมูลของตัวเองได้
- Partner's Response: ขอบคุณค่าา ทำตามที่แนะนำแล้ว รัน npx prisma migrate dev --name init บน DB จริงแล้ว push migration file ขึ้นมา
- Outcome: Approved and merged — ดีค่ะ

### 2. Feature 4: Display IT request category list and system status UI (Issue #4)
- PR Link: https://github.com/natthakamol1130/toktickit/pull/8#event-29354232061
- Partner: ณัฏฐกมล มอญปาน 67070505215 (@natthakamol1130)
- My Review Comment: แก้หลัก ๆ 3 อย่าง
  1. ลบ it.todo() 2 อันใน App.test.tsx เพราะมี test จริงอยู่แล้ว
  2. ลบ TODO/comment ที่บอกว่ายังไม่ได้ implement ทั้งที่ทำเสร็จแล้ว เพิ่ม Peer Reviewer → ให้เพื่อน Review และ Approve ก่อน Merge
  3. ส่วน /api/categories, การดึงข้อมูลผ่าน Prisma, Loading/Success/Error และ tests หลัก ๆ ถูกตามโจทย์แล้ว ไม่ต้องแก้
- Partner's Response: ขอบคุณค่าา ทำตามที่แนะนำแล้ว รัน npx prisma migrate dev --name init บน DB จริงแล้ว push migration file ขึ้นมา
- Outcome: Approved and merged

### 3. Lab 1 Integration to Production — #9
- PR Link: https://github.com/il0lk3/TokTickIT/pull/9#event-29509716886
- Partner: ธนากร พหุลรัตน์ 67070505217 (@il0lk3)
- My Review Comment:
  1. README.md — # TokTickIT ซ้ำ เพราะเป็น duplicate heading ทำให้โครงสร้างเอกสารไม่เรียบร้อย และไม่ได้มีประโยชน์อะไรจากการมีหัวข้อซ้ำ ควรเหลือแค่หนึ่งอันเพื่อให้ README อ่านง่ายและเป็นมาตรฐานมากขึ้น
  2. README.md — เรื่อง prisma migrate dev กับ seed เพราะ README ระบุชัดว่า npx prisma migrate dev จะ run seed script automatically แต่ตรงนี้เป็นคำสั่งที่สำคัญ เพราะคนอื่นจะใช้ README เป็นขั้นตอน setup database ถ้า seed ไม่ได้ถูกตั้งค่าให้รันอัตโนมัติจริง จะทำให้ database ไม่มี initial Categories ทั้งที่ README บอกว่าจะมี
- Partner's Response: ขอบคุณที่ช่วยรีวิวให้เห็นจุดนี้ครับ จัดการลบ Heading ที่ซ้ำใน README.md ออกเรียบร้อยแล้ว และได้เพิ่มคำสั่ง npx prisma db seed กำกับในขั้นตอนการ Setup ให้ชัดเจนขึ้นเรียบร้อยครับผม
- Outcome: Approved and merged