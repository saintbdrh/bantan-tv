import { randomBytes } from 'crypto';
import { getDb } from '@/lib/db';

export type BookingPayload = {
  advertiserName: string;
  advertiserPhone: string;
  advertiserEmail: string;
  company?: string;
  slotId: string;
  slotStart: string;
  slotEnd: string;
  pricingType: 'free' | 'peak';
  days: string[];
  times: Record<string, string>;
  totalPrice: number;
  tvcFileName?: string;
  note?: string;
};

export type BookingRecord = BookingPayload & {
  id: string;
  createdAt: string;
  status: 'pending' | 'forwarded' | 'error';
  forwardError?: string;
};

/**
 * Stores the booking in D1 first (so it is never lost), then forwards it to
 * BOOKING_WEBHOOK_URL when set and records whether that worked.
 */
export async function saveBooking(payload: BookingPayload): Promise<BookingRecord> {
  const record: BookingRecord = {
    ...payload,
    id: randomBytes(10).toString('hex'),
    createdAt: new Date().toISOString(),
    status: 'pending'
  };

  const db = await getDb();
  await db
    .prepare(
      `INSERT INTO bookings (
        id, created_at, status, forward_error,
        advertiser_name, advertiser_phone, advertiser_email, company,
        slot_id, slot_start, slot_end, pricing_type, days, times,
        total_price, tvc_file_name, note
      ) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      record.id,
      record.createdAt,
      record.status,
      record.advertiserName,
      record.advertiserPhone,
      record.advertiserEmail,
      record.company ?? null,
      record.slotId,
      record.slotStart,
      record.slotEnd,
      record.pricingType,
      JSON.stringify(record.days),
      JSON.stringify(record.times),
      record.totalPrice,
      record.tvcFileName ?? null,
      record.note ?? null
    )
    .run();

  const webhook = process.env.BOOKING_WEBHOOK_URL;
  if (webhook) {
    try {
      const res = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'ad_booking', ...record })
      });
      if (res.ok) {
        record.status = 'forwarded';
      } else {
        record.status = 'error';
        record.forwardError = `Webhook status ${res.status}`;
      }
    } catch (err) {
      record.status = 'error';
      record.forwardError = err instanceof Error ? err.message : String(err);
    }

    try {
      await db
        .prepare('UPDATE bookings SET status = ?, forward_error = ? WHERE id = ?')
        .bind(record.status, record.forwardError ?? null, record.id)
        .run();
    } catch (err) {
      console.error('Could not record webhook status for booking', record.id, err);
    }
  }

  return record;
}
