import StaticPage, { Section, OL, UL } from './StaticPage'

// 개인정보처리방침 — 그래플레이 본 방침(Privacy.tsx) 차용, 파이네시스로 조정
export default function Privacy() {
  return (
    <StaticPage title="개인정보처리방침" updated="2026년 9월 19일">
      <p className="text-sm text-stone-600">
        그래플레이(이하 "회사")는 파이네시스(PHYNESIS) 서비스 운영과 관련하여 정보통신망 이용촉진 및
        정보보호 등에 관한 법률, 개인정보보호법 등 관련 법령에 따라 이용자의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수
        있도록 다음과 같이 개인정보처리방침을 수립·공개합니다.
      </p>

      <Section heading="1. 개인정보의 수집 및 이용 목적">
        <UL
          items={[
            <><strong>회원 가입 및 관리:</strong> 가입의사 확인, 본인 식별·인증, 회원자격 유지·관리</>,
            <><strong>서비스 제공:</strong> 콘텐츠 제공, 맞춤 서비스, 요금결제·정산</>,
            <><strong>마케팅 및 광고:</strong> 신규 서비스 개발, 이벤트 및 광고성 정보 제공</>,
            <><strong>고충처리:</strong> 민원인 신원 확인, 사실조사 연락·통지, 처리결과 통보</>,
          ]}
        />
      </Section>

      <Section heading="2. 수집하는 개인정보의 항목">
        <p><strong className="text-stone-700">가. 필수:</strong> 이메일 주소, 비밀번호(암호화 저장), 이름 또는 닉네임</p>
        <p><strong className="text-stone-700">나. 선택:</strong> 프로필 이미지, 전화번호(전문가 등록 시)</p>
        <p><strong className="text-stone-700">다. 자동 수집:</strong> IP 주소·쿠키·방문 일시, 서비스 이용 기록, 기기 정보(OS·브라우저)</p>
        <p><strong className="text-stone-700">라. 결제 정보:</strong> 결제 수단 정보(PG사 처리), 결제 내역, 환불 계좌 정보</p>
        <p className="text-xs text-stone-400">
          * 회사는 신용카드 번호·계좌번호 등 민감한 결제 정보를 직접 저장하지 않으며, 결제대행업체(PG사)를
          통해 안전하게 처리됩니다.
        </p>
      </Section>

      <Section heading="3. 개인정보의 보유 및 이용 기간">
        <OL
          items={[
            '회사는 법령에 따른 보유·이용기간 또는 정보주체로부터 동의받은 기간 내에서 개인정보를 처리·보유합니다.',
            <>
              회원 탈퇴 시 지체 없이 파기합니다. 다만, 다음 정보는 관련 법령에 따라 보존합니다:
              <UL
                items={[
                  '계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래법)',
                  '대금결제 및 재화 등의 공급에 관한 기록: 5년 (전자상거래법)',
                  '소비자 불만 또는 분쟁처리에 관한 기록: 3년 (전자상거래법)',
                  '표시·광고에 관한 기록: 6개월 (전자상거래법)',
                  '로그 기록: 3개월 (통신비밀보호법)',
                ]}
              />
            </>,
          ]}
        />
      </Section>

      <Section heading="4. 개인정보의 제3자 제공">
        <p>회사는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, 이용자가 사전 동의한 경우 또는 법령에 근거한 경우는 예외로 합니다.</p>
        <p className="font-semibold text-stone-700">결제 처리를 위한 제공</p>
        <UL items={[<>토스페이먼츠 — 결제 처리 (이름, 이메일, 결제 금액)</>]} />
      </Section>

      <Section heading="5. 개인정보 처리의 위탁">
        <p>회사는 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리업무를 위탁합니다:</p>
        <UL
          items={[
            'Supabase — 데이터 저장 및 관리',
            'Vimeo — 동영상 호스팅 및 스트리밍',
            'Vercel — 웹 호스팅',
            '토스페이먼츠 — 결제 처리',
          ]}
        />
      </Section>

      <Section heading="6. 정보주체의 권리·의무 및 행사방법">
        <p>이용자는 언제든지 다음 권리를 행사할 수 있습니다:</p>
        <UL items={['개인정보 열람 요구', '개인정보 정정·삭제 요구', '개인정보 처리 정지 요구', '회원 탈퇴(동의 철회)']} />
        <p className="text-xs text-stone-400">권리 행사는 서면·전화·이메일로 하실 수 있으며, 회사는 지체 없이 조치합니다.</p>
      </Section>

      <Section heading="7. 개인정보의 파기">
        <OL
          items={[
            '회사는 보유기간 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때 지체 없이 파기합니다.',
            '전자적 파일은 복구 불가능한 방법으로 영구 삭제하고, 종이 문서는 분쇄 또는 소각합니다.',
          ]}
        />
      </Section>

      <Section heading="8. 개인정보 보호책임자">
        <p>회사는 개인정보 처리에 관한 업무를 총괄하고 정보주체의 불만처리 및 피해구제를 위해 아래와 같이 보호책임자를 지정합니다:</p>
        <UL items={['성명: 이바름 (대표)', '이메일: grapplay.com@gmail.com', '전화: 02-599-6315']} />
      </Section>

      <Section heading="9. 개인정보의 안전성 확보 조치">
        <UL
          items={[
            '개인정보 취급 직원의 최소화 및 교육',
            '개인정보에 대한 접근 제한',
            '개인정보의 암호화(비밀번호 등)',
            '해킹 등에 대비한 기술적 대책',
            '접속기록의 보관 및 위변조 방지',
          ]}
        />
      </Section>

      <Section heading="10. 개인정보 처리방침의 변경">
        <p>
          이 방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경내용의 추가·삭제·정정이 있는 경우
          변경사항의 시행 7일 전부터 공지사항을 통하여 고지합니다.
        </p>
      </Section>

      <p className="border-t border-stone-200 pt-6 text-sm text-stone-400">
        <strong className="text-stone-500">부칙</strong>
        <br />본 방침은 2026년 6월 9일부터 시행됩니다.
      </p>
    </StaticPage>
  )
}
