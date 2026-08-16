# Lab 1 — AI Use and Reflection

**LLM/agent used:** opencode CLI (model: deepseek-v4-flash-free) ผ่าน terminal — ใช้เป็น AI coding agent ช่วยวางแผน, เขียนโค้ด, ทำ Git operations, และเตรียมเอกสารรายงาน

## Selected key prompts (6–10)

| # | Prompt Name | Prompt (summarised) | What I did with the result |
|---|-------------|---------------------|----------------------------|
| 1 | Plan Lab 1 Implementation | อ่านไฟล์ Lab1_Labsheet.pdf และสรุปว่าต้องทำอะไรใน Lab 1 | ได้ภาพรวมงาน: 4 issues, โครงสร้าง repo, acceptance criteria, และเอกสารที่ต้องส่ง |
| 2 | Set Up Git Workflow | ทำ PR แยกเป็น 4 issues ตาม feature branches ที่ Lab Sheet กำหนด แต่อย่าเพิ่ง merge | สร้าง feature/1 ถึง feature/4 + PR ทั้ง 4 ตัวชี้ไปที่ lab1-staging |
| 3 | Implement Health Check | Implement GET /api/health ให้คืน 200 + { status:"ok", service:"TokTickIT API" } จน test ผ่าน | เขียน route ใน server/src/app.ts และรัน Supertest test ให้ผ่าน |
| 4 | Implement Category Feature | สร้าง Prisma Category model + migration + seed แบบ idempotent (upsert) | เพิ่ม model ใน schema.prisma, สร้าง migration, เขียน seed.ts ที่รันซ้ำได้ |
| 5 | Add Seed Tests | เพิ่ม test ให้ seed ว่าครบ 4 categories และรันซ้ำไม่เกิด duplicate | refactor seed เป็น seedCategories() แล้วเขียน server/tests/lab-01/seed.test.ts |
| 6 | Implement Category List UI | Implement GET /api/categories ผ่าน Prisma + client checkSystem() + UI แสดง loading/success/error | เขียน route, api.ts, App.tsx และ Vitest UI tests 3 ตัว |
| 7 | Fix PR Scope | rebase feature/4 ให้เหลือเฉพาะ commit ของ Issue 4 (ลบ commit Issue 2 ที่ติดปนมา) | rebase ขึ้น lab1-staging ล่าสุด ทำให้ PR scope สะอาดตามที่ reviewer แนะนำ |
| 8 | Prepare Report | ทำ Report Audit แบ่งตาม Part 1–4 ของ Lab Sheet และหาว่าอะไรยังขาด | ได้ checklist ว่าต้อง merge ขึ้น main, กรอก docs, และแคป screenshot อะไรบ้าง |

## Reflection

Prompts ที่ให้ผลดีที่สุดคือแบบที่ระบุ **constraint ชัดเจน** เช่น ต้องใช้ endpoint/response ที่แน่นอน หรือ "ห้าม merge ก่อน review" — ได้ผลตรงเป้าหมายโดยไม่ต้องแก้รอบสองหลายรอบ สิ่งที่ต้องแก้เองคือตอน rebase PR ของ Issue 4: agent สร้าง PR ที่มี commit ของ Issue 2 ติดปนมา ผมเลยต้อง rebase ขึ้น staging ใหม่เพื่อให้ scope สะอาด ซึ่งเป็นจุดที่ผมต้องตรวจเอง ไม่ใช่เชื่อผลลัพธ์ครั้งแรกทันที สรุปคือต้อง review งานของ agent ทุกครั้ง โดยเฉพาะเรื่อง git history และ scope ของ PR