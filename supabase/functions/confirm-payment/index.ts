// 토스페이먼츠 결제 서버 승인 (Supabase Edge Function, Deno)
// - 시크릿 키로 토스 승인 → orders/enrollments 기록 (service role)
// - 멱등(order_key) + 금액 서버 재검증
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// 결제 완료 텔레그램 알림 (best-effort — 실패해도 결제 흐름에 영향 없음)
async function notifyTelegram(text: string) {
  const token = Deno.env.get('TELEGRAM_BOT_TOKEN')
  const chatId = Deno.env.get('TELEGRAM_CHAT_ID')
  if (!token || !chatId) return
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    })
  } catch (e) {
    console.error('telegram notify failed:', e)
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const TOSS_SECRET = Deno.env.get('TOSS_SECRET_KEY')
    if (!TOSS_SECRET) return json({ ok: false, message: 'TOSS_SECRET_KEY 미설정' }, 500)

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

    // 1) 사용자 검증
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    const {
      data: { user },
    } = await admin.auth.getUser(token)
    if (!user) return json({ ok: false, message: '인증이 필요합니다.' }, 401)

    // 2) 입력
    const { paymentKey, orderId, amount, itemType, itemId } = await req.json()
    if (!paymentKey || !orderId || !amount || !itemType || !itemId) {
      return json({ ok: false, message: '필수 값이 누락되었습니다.' }, 400)
    }
    if (itemType !== 'course' && itemType !== 'ebook') {
      return json({ ok: false, message: '잘못된 상품 유형' }, 400)
    }

    // 3) 멱등 — 이미 결제 완료면 즉시 성공
    const { data: existing } = await admin
      .from('orders')
      .select('status')
      .eq('order_key', orderId)
      .maybeSingle()
    if (existing?.status === 'paid') return json({ ok: true, already: true })

    // 4) 가격 서버 재검증
    const table = itemType === 'course' ? 'courses' : 'ebooks'
    const { data: itemRow } = await admin
      .from(table)
      .select('price, title')
      .eq('id', itemId)
      .maybeSingle()
    if (!itemRow) return json({ ok: false, message: '상품을 찾을 수 없습니다.' }, 404)
    if (Number(itemRow.price) !== Number(amount)) {
      return json({ ok: false, message: '결제 금액이 일치하지 않습니다.' }, 400)
    }

    // 5) 토스 승인
    const basic = btoa(`${TOSS_SECRET}:`)
    const tossRes = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    })
    const pay = await tossRes.json()

    if (!tossRes.ok || pay.status !== 'DONE') {
      await admin.from('orders').upsert(
        {
          order_key: orderId,
          user_id: user.id,
          item_type: itemType,
          item_id: itemId,
          amount,
          status: 'failed',
          raw_response: pay,
        },
        { onConflict: 'order_key' },
      )
      return json({ ok: false, message: pay.message || '결제 승인에 실패했습니다.' }, 400)
    }

    // 6) 주문 기록 (paid) + 수강 등록 (멱등)
    const { data: order } = await admin
      .from('orders')
      .upsert(
        {
          order_key: orderId,
          user_id: user.id,
          item_type: itemType,
          item_id: itemId,
          amount,
          status: 'paid',
          payment_key: paymentKey,
          method: pay.method ?? null,
          raw_response: pay,
          paid_at: new Date().toISOString(),
        },
        { onConflict: 'order_key' },
      )
      .select('id')
      .single()

    await admin.from('enrollments').upsert(
      {
        user_id: user.id,
        item_type: itemType,
        item_id: itemId,
        order_id: order?.id ?? null,
      },
      { onConflict: 'user_id,item_type,item_id' },
    )

    await notifyTelegram(
      [
        '💰 결제 완료',
        `상품: [${itemType === 'course' ? '강의' : '전자책'}] ${itemRow.title}`,
        `금액: ${Number(amount).toLocaleString('ko-KR')}원`,
        `구매자: ${user.email ?? user.id}`,
        `결제수단: ${pay.method ?? '-'}`,
      ].join('\n'),
    )

    return json({ ok: true })
  } catch (e) {
    return json({ ok: false, message: String(e) }, 500)
  }
})
