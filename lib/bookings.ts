import { promises as fs } from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';

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

const BOOKINGS_FILE = path.join(process.cwd(), 'data', 'bookings.json');

async function ensureFile() {
  try {
    await fs.access(BOOKINGS_FILE);
  } catch {
    await fs.mkdir(path.dirname(BOOKINGS_FILE), { recursive: true });
    await fs.writeFile(BOOKINGS_FILE, '[]', 'utf8');
  }
}

export async function saveBooking(payload: BookingPayload): Promise<BookingRecord> {
  await ensureFile();
  const record: BookingRecord = {
    ...payload,
    id: randomBytes(10).toString('hex'),
    createdAt: new Date().toISOString(),
    status: 'pending'
  };

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
  }

  const raw = await fs.readFile(BOOKINGS_FILE, 'utf8');
  let list: BookingRecord[] = [];
  try {
    list = JSON.parse(raw);
    if (!Array.isArray(list)) list = [];
  } catch {
    list = [];
  }
  list.push(record);
  await fs.writeFile(BOOKINGS_FILE, JSON.stringify(list, null, 2), 'utf8');
  return record;
}
