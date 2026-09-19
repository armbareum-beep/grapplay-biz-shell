import Icon from '../components/Icon'
// 문의하기 — 이메일·전화 안내 + 사업자 정보 (그래플레이 Contact 참고)
export default function Contact() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-black text-stone-900">문의하기</h1>
      <p className="mt-2 text-stone-500">
        서비스 이용, 결제·환불, 전문가 등록 등 무엇이든 문의해 주세요. 빠르게 도와드리겠습니다.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <a
          href="mailto:grapplay.com@gmail.com"
          className="rounded-2xl border border-stone-200 bg-white p-6 transition hover:border-brand-300 hover:shadow-md"
        >
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-700"><Icon name="mail" size={22} /></div>
          <h2 className="mt-3 font-bold text-stone-900">이메일 문의</h2>
          <p className="mt-1 text-sm text-brand-600">grapplay.com@gmail.com</p>
          <p className="mt-1 text-xs text-stone-400">평일 영업일 기준 1~2일 내 답변</p>
        </a>
        <a
          href="tel:02-599-6315"
          className="rounded-2xl border border-stone-200 bg-white p-6 transition hover:border-brand-300 hover:shadow-md"
        >
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-700"><Icon name="phone" size={22} /></div>
          <h2 className="mt-3 font-bold text-stone-900">전화 문의</h2>
          <p className="mt-1 text-sm text-brand-600">02-599-6315</p>
          <p className="mt-1 text-xs text-stone-400">평일 10:00 ~ 18:00 (점심 12~13시 제외)</p>
        </a>
      </div>

      <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50 p-6 text-sm text-stone-500">
        <h2 className="font-bold text-stone-800">사업자 정보</h2>
        <div className="mt-3 space-y-1.5 text-[13px] leading-relaxed">
          <p><strong className="text-stone-600">상호명:</strong> 그래플레이 · <strong className="text-stone-600">대표자:</strong> 이바름</p>
          <p><strong className="text-stone-600">사업자등록번호:</strong> 111-39-34149 · <strong className="text-stone-600">통신판매업 신고번호:</strong> 2026-서울동작-0405</p>
          <p><strong className="text-stone-600">주소:</strong> 서울 동작구 동작대로29길 119, 102-1207</p>
          <p><strong className="text-stone-600">이메일:</strong> grapplay.com@gmail.com · <strong className="text-stone-600">전화:</strong> 02-599-6315</p>
        </div>
      </div>
    </div>
  )
}
