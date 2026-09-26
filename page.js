'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import styles from './kitchen.module.css';

// สมมติฐานเรื่องค่า status ของตาราง orders:
// - 'received' = ออเดอร์เข้ามาใหม่ ยังไม่เริ่มทำ
// - 'cooking'  = กำลังทำอยู่
// - 'served'   = เสิร์ฟแล้ว (การ์ดจะหายไปจากจอนี้ทันทีที่สถานะเปลี่ยนเป็นค่านี้)
// ถ้าระบบจริงใช้ค่าอื่น ให้แก้ไขค่าคงที่ 3 ตัวนี้ที่เดียว
const STATUS_RECEIVED = 'received';
const STATUS_COOKING = 'cooking';
const STATUS_SERVED = 'served';

const ACTIVE_STATUSES = [STATUS_RECEIVED, STATUS_COOKING];

// items ในตาราง orders เป็น jsonb — สมมติว่าเป็น array ของ { name, qty } หรือ { name, quantity }
// ถ้ารูปแบบจริงต่างจากนี้ ให้แก้เฉพาะฟังก์ชันนี้ที่เดียว
function renderItems(items) {
  let parsed = items;
  if (typeof items === 'string') {
    try {
      parsed = JSON.parse(items);
    } catch {
      return <p>{items}</p>;
    }
  }

  if (Array.isArray(parsed)) {
    return (
      <ul className={styles.itemsList}>
        {parsed.map((item, idx) => (
          <li key={idx}>
            <span>{item.name || item.item_name || 'รายการ'}</span>
            <span className={styles.itemQty}>x{item.qty ?? item.quantity ?? 1}</span>
          </li>
        ))}
      </ul>
    );
  }

  return <p>{JSON.stringify(parsed)}</p>;
}

function formatTime(isoString) {
  try {
    return new Date(isoString).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function KitchenPage() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchActiveOrders = useCallback(async () => {
    const { data, error: queryError } = await supabase
      .from('orders')
      .select('id, session_id, table_number, items, status, created_at')
      .in('status', ACTIVE_STATUSES)
      .order('created_at', { ascending: true });

    if (queryError) {
      setError(queryError.message || 'โหลดออเดอร์ไม่สำเร็จ');
      return;
    }
    setError('');
    setOrders(data || []);
  }, []);

  // โหลดออเดอร์ที่ค้างอยู่ตอนเปิดหน้าครั้งแรก
  useEffect(() => {
    fetchActiveOrders();
  }, [fetchActiveOrders]);

  // ฟัง realtime การเปลี่ยนแปลงของตาราง orders
  // สำคัญ: ต้องเปิด Realtime ให้ตาราง orders ใน Supabase Dashboard > Database > Replication ก่อน
  useEffect(() => {
    const channel = supabase
      .channel('kitchen-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          setOrders((current) => {
            if (payload.eventType === 'DELETE') {
              return current.filter((o) => o.id !== payload.old.id);
            }

            const row = payload.new;
            const isActive = ACTIVE_STATUSES.includes(row.status);

            const withoutRow = current.filter((o) => o.id !== row.id);

            if (!isActive) {
              // ออเดอร์เปลี่ยนเป็น served (หรือสถานะอื่นที่ไม่ active) -> เอาการ์ดออกจากจอ
              return withoutRow;
            }

            // เพิ่ม/อัปเดตการ์ด แล้วเรียงตามเวลาที่สร้างใหม่
            return [...withoutRow, row].sort(
              (a, b) => new Date(a.created_at) - new Date(b.created_at)
            );
          });
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function updateStatus(orderId, newStatus) {
    setUpdatingId(orderId);
    setError('');
    try {
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (updateError) throw updateError;
      // ไม่ต้องอัปเดต state เอง เพราะ realtime subscription ด้านบนจะจัดการให้
    } catch (err) {
      setError(err.message || 'อัปเดตสถานะไม่สำเร็จ');
    } finally {
      setUpdatingId(null);
    }
  }

  const receivedOrders = orders.filter((o) => o.status === STATUS_RECEIVED);
  const cookingOrders = orders.filter((o) => o.status === STATUS_COOKING);

  function renderCard(order, actionLabel, nextStatus, buttonClass) {
    return (
      <div className={styles.card} key={order.id}>
        <div className={styles.cardHeader}>
          <span className={styles.tableNumber}>โต๊ะ {order.table_number}</span>
          <span className={styles.time}>{formatTime(order.created_at)}</span>
        </div>
        {renderItems(order.items)}
        <button
          className={`${styles.button} ${buttonClass}`}
          onClick={() => updateStatus(order.id, nextStatus)}
          disabled={updatingId === order.id}
        >
          {updatingId === order.id ? 'กำลังอัปเดต...' : actionLabel}
        </button>
      </div>
    );
  }

  return (
    <main className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>จอครัว</h1>
        <span className={styles.connection}>
          <span
            className={`${styles.connectionDot} ${isConnected ? styles.dotOnline : styles.dotOffline}`}
          />
          {isConnected ? 'เชื่อมต่อ realtime แล้ว' : 'กำลังเชื่อมต่อ...'}
        </span>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.columns}>
        <div className={styles.column}>
          <h2 className={styles.columnTitle}>
            รอทำ <span className={styles.count}>{receivedOrders.length}</span>
          </h2>
          {receivedOrders.length === 0 && <p className={styles.empty}>ไม่มีออเดอร์รอทำ</p>}
          {receivedOrders.map((order) =>
            renderCard(order, 'เริ่มทำ', STATUS_COOKING, styles.buttonStart)
          )}
        </div>

        <div className={styles.column}>
          <h2 className={styles.columnTitle}>
            กำลังทำ <span className={styles.count}>{cookingOrders.length}</span>
          </h2>
          {cookingOrders.length === 0 && <p className={styles.empty}>ไม่มีออเดอร์ที่กำลังทำ</p>}
          {cookingOrders.map((order) =>
            renderCard(order, 'จัดเสิร์ฟแล้ว', STATUS_SERVED, styles.buttonServe)
          )}
        </div>
      </div>
    </main>
  );
}
