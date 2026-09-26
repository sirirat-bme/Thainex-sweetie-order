# บันทึกสำหรับการพัฒนาโปรเจกต์นี้ต่อ

## เวอร์ชัน Next.js

โปรเจกต์นี้ใช้ Next.js เวอร์ชันล่าสุด (App Router)

**สำคัญ:** ใน Dynamic Route (เช่น `app/order/[tableNumber]/page.js`) `params` (และ `searchParams`)
ที่ Next.js ส่งเข้ามาเป็น **Promise** ไม่ใช่ object ธรรมดาอีกต่อไป ต้อง unwrap ทุกครั้ง ห้ามเข้าถึง
`params.xxx` ตรง ๆ เด็ดขาด เพราะจะ error หรือ warning

### วิธีใช้งานที่ถูกต้อง

**Client Component** — ต้อง unwrap ด้วย `use()` จาก React เสมอ:

```jsx
'use client';
import { use } from 'react';

export default function OrderPage({ params }) {
  const { tableNumber } = use(params);
  // ...
}
```

**Server Component** — ต้อง `await` ก่อนใช้งาน:

```jsx
export default async function OrderPage({ params }) {
  const { tableNumber } = await params;
  // ...
}
```

กฎนี้ต้องใช้กับทุกหน้าที่มี Dynamic Route ในโปรเจกต์นี้ (เช่นหน้าสั่งอาหารที่จะสร้างในขั้นตอนถัดไป)

## ฐานข้อมูล Supabase (มีอยู่แล้ว — ห้ามสร้างตารางใหม่ทับ)

- `sessions (id, table_number, adult_count, child_count, status, created_at)`
- `menu_categories (id, name, sort_order)`
- `menu_items (id, category_id, name)`
- `orders (id, session_id, table_number, items jsonb, status, created_at)`

ใช้ client จาก `lib/supabaseClient.js` ในการเชื่อมต่อทุกครั้ง ห้ามสร้าง Supabase client ซ้ำที่อื่น

## หน้าที่สร้างแล้ว

- `/` — หน้าแรก แสดงชื่อร้าน Thainexsweetie พร้อมลิงก์ไป `/generate-qr` และ `/kitchen` (ไว้ทดสอบ deploy)

## หน้าที่ยังไม่ได้สร้าง (ขั้นตอนถัดไป)

- `/generate-qr` — ฟอร์มเปิดโต๊ะสำหรับพนักงาน
- `/order/[tableNumber]` — หน้าสั่งอาหารของลูกค้า (ต้องใช้ `use(params)` ตามที่ระบุด้านบน)
- `/kitchen` — จอครัว realtime แสดงออเดอร์
