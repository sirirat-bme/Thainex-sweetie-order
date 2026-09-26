# Thainexsweetie — ระบบสั่งอาหารร้านขนมหวาน

โปรเจกต์ Next.js (App Router, JavaScript) สำหรับระบบสั่งอาหาร deploy บน Vercel เชื่อมต่อฐานข้อมูล Supabase

## เริ่มต้นใช้งาน

```bash
npm install
cp .env.local.example .env.local   # แล้วใส่ค่าจริงจาก Supabase
npm run dev
```

เปิด http://localhost:3000

## Environment Variables (ตั้งใน Vercel Project Settings ด้วย)

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## โครงสร้างตารางฐานข้อมูล (มีอยู่แล้วใน Supabase — อ้างอิงเท่านั้น ไม่ต้องสร้างใหม่)

- **sessions**: `id`, `table_number`, `adult_count`, `child_count`, `status`, `created_at`
- **menu_categories**: `id`, `name`, `sort_order`
- **menu_items**: `id`, `category_id`, `name`
- **orders**: `id`, `session_id`, `table_number`, `items` (jsonb), `status`, `created_at`

## สถานะโปรเจกต์

โครงนี้เป็นขั้นตอนแรกสำหรับทดสอบการ deploy เท่านั้น หน้า `/generate-qr` และ `/kitchen`
ยังไม่ได้สร้างจริง (ลิงก์จากหน้าแรกมีไว้เพื่อทดสอบ routing) — จะสร้างเนื้อหาจริงในขั้นตอนถัดไป

## หมายเหตุสำคัญสำหรับการพัฒนาต่อ

ดูรายละเอียดใน `CLAUDE.md`
