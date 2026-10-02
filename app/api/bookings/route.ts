import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { saveBooking, BookingPayload } from '@/lib/bookings';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Нэвтэрсэн байх шаардлагатай.' }, { status: 401 });
  }

  let body: Partial<BookingPayload>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const advertiserName = String(body.advertiserName ?? '').trim();
  const advertiserPhone = String(body.advertiserPhone ?? '').trim();
  const advertiserEmail = String(body.advertiserEmail ?? session.email).trim();
  const days = Array.isArray(body.days) ? body.days.map(String) : [];
  const pricingType = body.pricingType === 'peak' ? 'peak' : 'free';
  const totalPrice = Number(body.totalPrice) || 0;

  if (!advertiserName || !advertiserPhone || !advertiserEmail) {
    return NextResponse.json(
      { error: 'Захиалагчийн нэр, утас, имэйл заавал бөглөнө үү.' },
      { status: 400 }
    );
  }
  if (!days.length || !body.slotStart || !body.slotEnd) {
    return NextResponse.json({ error: 'Цагийн мэдээлэл дутуу байна.' }, { status: 400 });
  }

  const record = await saveBooking({
    advertiserName,
    advertiserPhone,
    advertiserEmail,
    company: body.company ? String(body.company).trim() : undefined,
    slotId: String(body.slotId ?? ''),
    slotStart: String(body.slotStart),
    slotEnd: String(body.slotEnd),
    pricingType,
    days,
    times: (body.times && typeof body.times === 'object' ? body.times : {}) as Record<string, string>,
    totalPrice,
    tvcFileName: body.tvcFileName ? String(body.tvcFileName) : undefined,
    note: body.note ? String(body.note) : undefined
  });

  return NextResponse.json({
    ok: true,
    id: record.id,
    status: record.status,
    message:
      'Захиалга бүртгэгдлээ. ТВК видео файлыг тусад нь илгээнэ үү — одоогоор зөвхөн файлын нэр хадгалагдана.'
  });
}
