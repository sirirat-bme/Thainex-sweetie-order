'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import styles from './generate-qr.module.css';

// สมมติฐานเรื่องค่า status ของตาราง sessions:
// - 'open'   = โต๊ะกำลังเปิดใช้งานอยู่
// - 'closed' = โต๊ะปิดแล้ว (เรียกเก็บเงิน/ลูกค้ากลับแล้ว)
// ถ้าระบบจริงใช้ค่าอื่น ให้แก้ไขค่าคงที่ 2 ตัวนี้ที่เดียว
const STATUS_OPEN = 'open';
const STATUS_CLOSED = 'closed';

export default function GenerateQrPage() {
  const [tableNumber, setTableNumber] = useState('');
  const [adultCount, setAdultCount] = useState('');
  const [childCount, setChildCount] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // session ที่เปิดค้างอยู่แล้วบนโต๊ะนี้ (ถ้ามี) รอให้พนักงานตัดสินใจ
  const [existingSession, setExistingSession] = useState(null);

  // session ที่เพิ่งสร้างสำเร็จ ใช้แสดง QR
  const [createdSession, setCreatedSession] = useState(null);

  const orderUrl = createdSession
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/order/${createdSession.table_number}`
    : '';

  const qrImageUrl = orderUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(orderUrl)}`
    : '';

  function resetForm() {
    setTableNumber('');
    setAdultCount('');
    setChildCount('');
    setExistingSession(null);
    setCreatedSession(null);
    setError('');
  }

  // ขั้นที่ 1: เช็คว่าโต๊ะนี้มี session ที่ status = open ค้างอยู่ไหม
  async function handleCheckTable(e) {
    e.preventDefault();
    setError('');

    if (!tableNumber.trim()) {
      setError('กรุณากรอกหมายเลขโต๊ะ');
      return;
    }

    setLoading(true);
    try {
      const { data, error: queryError } = await supabase
        .from('sessions')
        .select('id, table_number, adult_count, child_count, status, created_at')
        .eq('table_number', tableNumber.trim())
        .eq('status', STATUS_OPEN)
        .order('created_at', { ascending: false })
        .limit(1);

      if (queryError) throw queryError;

      if (data && data.length > 0) {
        setExistingSession(data[0]);
      } else {
        setExistingSession(null);
      }
    } catch (err) {
      setError(err.message || 'เกิดข้อผิดพลาดในการตรวจสอบโต๊ะ');
    } finally {
      setLoading(false);
    }
  }

  // ปิด session เดิมของโต๊ะนี้ (status -> closed) แล้วให้พนักงานกรอกข้อมูลเปิดใหม่ต่อ
  async function handleCloseExisting() {
    if (!existingSession) return;
    setLoading(true);
    setError('');
    try {
      const { error: updateError } = await supabase
        .from('sessions')
        .update({ status: STATUS_CLOSED })
        .eq('id', existingSession.id);

      if (updateError) throw updateError;

      setExistingSession(null);
    } catch (err) {
      setError(err.message || 'ปิดโต๊ะเดิมไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }

  // ขั้นที่ 2: สร้าง session ใหม่ (เฉพาะตอนไม่มี session เปิดค้างแล้วเท่านั้น)
  async function handleCreateSession(e) {
    e.preventDefault();
    setError('');

    if (!adultCount || Number(adultCount) < 0) {
      setError('กรุณากรอกจำนวนผู้ใหญ่ให้ถูกต้อง');
      return;
    }

    setLoading(true);
    try {
      const { data, error: insertError } = await supabase
        .from('sessions')
        .insert({
          table_number: tableNumber.trim(),
          adult_count: Number(adultCount),
          child_count: Number(childCount || 0),
          status: STATUS_OPEN,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setCreatedSession(data);
    } catch (err) {
      setError(err.message || 'เปิดโต๊ะไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }

  // แสดงผลตอนสร้าง session สำเร็จแล้ว -> QR code
  if (createdSession) {
    return (
      <main className={styles.container}>
        <h1 className={styles.title}>เปิดโต๊ะสำเร็จ</h1>
        <p className={styles.subtitle}>สแกน QR นี้เพื่อเข้าหน้าสั่งอาหารของโต๊ะ</p>

        <div className={styles.successBox}>
          <strong>โต๊ะ {createdSession.table_number}</strong>
          <p>
            ผู้ใหญ่ {createdSession.adult_count} คน · เด็ก {createdSession.child_count} คน
          </p>
          {qrImageUrl && <img src={qrImageUrl} alt="QR code สำหรับสั่งอาหาร" width={220} height={220} />}
          <p className={styles.link}>{orderUrl}</p>
        </div>

        <div className={styles.actions}>
          <button className={styles.button} onClick={resetForm}>
            เปิดโต๊ะอื่นต่อ
          </button>
          <Link href="/" className={styles.button} style={{ display: 'grid', placeItems: 'center', background: '#757575', textDecoration: 'none' }}>
            กลับหน้าแรก
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>เปิดโต๊ะ / สร้าง QR</h1>
      <p className={styles.subtitle}>สำหรับพนักงาน — กรอกหมายเลขโต๊ะเพื่อตรวจสอบก่อนเปิดโต๊ะใหม่</p>

      {error && <div className={styles.error}>{error}</div>}

      {/* ขั้นที่ 1: กรอกหมายเลขโต๊ะเพื่อตรวจสอบ */}
      <form onSubmit={handleCheckTable}>
        <div className={styles.field}>
          <label htmlFor="tableNumber">หมายเลขโต๊ะ</label>
          <input
            id="tableNumber"
            type="text"
            value={tableNumber}
            onChange={(e) => {
              setTableNumber(e.target.value);
              setExistingSession(null);
            }}
            placeholder="เช่น 5"
            disabled={loading}
          />
        </div>
        <button type="submit" className={styles.button} disabled={loading}>
          {loading ? 'กำลังตรวจสอบ...' : 'ตรวจสอบโต๊ะ'}
        </button>
      </form>

      {/* กรณีมี session เปิดค้างอยู่แล้ว */}
      {existingSession && (
        <div className={styles.notice}>
          โต๊ะ {existingSession.table_number} มี session เปิดค้างอยู่แล้ว
          (ผู้ใหญ่ {existingSession.adult_count} เด็ก {existingSession.child_count})
          <div className={styles.actions}>
            <button
              className={`${styles.button} ${styles.buttonDanger}`}
              onClick={handleCloseExisting}
              disabled={loading}
            >
              ปิดโต๊ะเดิมแล้วเปิดใหม่
            </button>
          </div>
        </div>
      )}

      {/* ขั้นที่ 2: กรอกจำนวนคน แล้วเปิดโต๊ะ — แสดงเมื่อเช็คแล้วว่าไม่มี session เปิดค้าง */}
      {!existingSession && tableNumber.trim() !== '' && (
        <form onSubmit={handleCreateSession} style={{ marginTop: '1.5rem' }}>
          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="adultCount">จำนวนผู้ใหญ่</label>
              <input
                id="adultCount"
                type="number"
                min="0"
                value={adultCount}
                onChange={(e) => setAdultCount(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="childCount">จำนวนเด็ก</label>
              <input
                id="childCount"
                type="number"
                min="0"
                value={childCount}
                onChange={(e) => setChildCount(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? 'กำลังเปิดโต๊ะ...' : 'เปิดโต๊ะและสร้าง QR'}
          </button>
        </form>
      )}
    </main>
  );
}
