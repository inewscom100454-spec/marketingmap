const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// --- .env 로더 (외부 패키지 없음): KEY=VALUE 형식. 이미 설정된 환경변수는 덮어쓰지 않는다. (.env 는 웹으로 제공되지 않음) ---
(function loadEnvFile() {
  try {
    const envPath = process.env.ENV_FILE || path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) return;
    fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach((line) => {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!m || line.trim().startsWith('#')) return;
      const value = m[2].replace(/^(['"])(.*)\1$/, '$2');
      if (process.env[m[1]] === undefined) process.env[m[1]] = value;
    });
  } catch (e) {
    console.warn('[경고] .env 파일을 읽지 못했습니다:', e.message);
  }
})();

const PORT = Number(process.env.PORT) || 3000;
const USERS_DB_PATH = process.env.USERS_DB_PATH || path.join(__dirname, 'users.json');

// --- 소셜 로그인 서버 검증 설정 (클라이언트가 보낸 이메일/이름은 신뢰하지 않고, 제공사 API로 직접 확인한다) ---
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '922694159566-8t2dun8coqv923h9qvg1fd3hir4hkana.apps.googleusercontent.com';
const GOOGLE_TOKENINFO_URL = process.env.GOOGLE_TOKENINFO_URL || 'https://oauth2.googleapis.com/tokeninfo';
const GOOGLE_USERINFO_URL = process.env.GOOGLE_USERINFO_URL || 'https://www.googleapis.com/oauth2/v3/userinfo';
const KAKAO_API_BASE = process.env.KAKAO_API_BASE || 'https://kapi.kakao.com';
const KAKAO_APP_ID = process.env.KAKAO_APP_ID || ''; // 카카오 개발자 콘솔 > 앱 설정 > 앱 ID (설정 시 다른 앱에서 발급된 토큰 거부)
const NAVER_API_BASE = process.env.NAVER_API_BASE || 'https://openapi.naver.com';
const SOCIAL_PLACEHOLDER_DOMAIN = 'social.marketingmap.kr'; // 제공사가 이메일을 주지 않을 때 쓰는 내부용 주소 (이메일 가입에서는 사용 금지)
const PROVIDER_LABELS = { kakao: '카카오톡(Kakao)', google: 'Google', naver: '네이버(NAVER)', email: '이메일' };

// --- 오드리 고객지원 AI 챗봇 설정 (.env 환경변수 연동) ---
const GEMINI_API_BASE = process.env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com';
const OPENAI_API_BASE = process.env.OPENAI_API_BASE || 'https://api.openai.com';
const AUDREY_SYSTEM_INSTRUCTION =
  '당신은 BuildMap 서비스 및 마케팅 전략 관련 질문에 친절하고 전문적으로 답하는 비즈니스 어시스턴트 오드리입니다. ' +
  '소상공인·자영업자·스타트업·프랜차이즈 대표님들의 비즈니스 성장을 돕기 위해 다음 원칙에 따라 답변하세요:\n' +
  '1. BuildMap(MarketingMap) 서비스 안내: 좌측 입력폼에 ①상호명, ②업종 및 주력상품, ③지역(상권)/판매채널, ④강점 및 주요 고객층, ⑤마케팅 고민을 입력하고 [맞춤 마케팅 전략 생성하기] 버튼을 누르면 우측에 5대 핵심 리포트(플레이스 SEO, AI 검색 AEO·GEO, 채널별 홍보 원고, 경쟁사·자사 분석, 브랜드 스토리)가 즉시 생성되며 원클릭 복사와 PDF 리포트 다운로드가 가능함을 안내합니다.\n' +
  '2. 실전 마케팅 전략 자문: 네이버 플레이스 상위노출, 블로그·인스타그램 릴스·유튜브 쇼츠·당근마켓 지역 광고, AI 검색(챗GPT·퍼플렉시티·네이버 AI 브리핑) 추천 선점, 객단가·재방문율 향상, 리뷰 이벤트 설계 등 질문에 업종·상권 맞춤형 실전 팁과 실행 순서를 구체적으로 제시합니다.\n' +
  '3. 대화 맥락 유지: 이전 대화 내역(history)을 기억하여 후속 질문에도 문맥이 자연스럽게 이어지도록 답변하고, 핵심 포인트는 읽기 쉽게 줄바꿈과 강조 표시(**굵게**)를 활용해 간결하고 정중하게 전달합니다.';

function sanitizeChatHistory(rawHistory) {
  if (!Array.isArray(rawHistory)) return [];
  return rawHistory
    .slice(-20)
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const roleRaw = String(item.role || '').toLowerCase();
      const role = (roleRaw === 'assistant' || roleRaw === 'model' || roleRaw === 'bot') ? 'assistant' : 'user';
      const content = String(item.content || item.text || '').trim().slice(0, 2000);
      if (!content) return null;
      return { role, content };
    })
    .filter(Boolean);
}

function buildContextPromptPrefix(context) {
  if (!context || typeof context !== 'object') return '';
  const parts = [];
  if (context.brand) parts.push(`상호명: ${String(context.brand).trim()}`);
  if (context.category) parts.push(`업종: ${String(context.category).trim()}`);
  if (context.idea) parts.push(`주력상품/메뉴: ${String(context.idea).trim()}`);
  if (context.region) parts.push(`지역/상권: ${String(context.region).trim()}`);
  if (context.target) parts.push(`강점/타깃: ${String(context.target).trim()}`);
  if (context.revenue) parts.push(`현재 마케팅 고민: ${String(context.revenue).trim()}`);
  return parts.length > 0 ? `[현재 대표님이 입력 중인 비즈니스 정보: ${parts.join(' | ')}]\n\n` : '';
}

async function callGeminiChatApi({ apiKey, model, message, history, context }) {
  const targetModel = (model || process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim();
  const base = (process.env.GEMINI_API_BASE || GEMINI_API_BASE).replace(/\/+$/, '');
  const url = `${base}/v1beta/models/${encodeURIComponent(targetModel)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const contents = [];
  for (const turn of history) {
    contents.push({
      role: turn.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: turn.content }]
    });
  }
  const prefix = buildContextPromptPrefix(context);
  contents.push({
    role: 'user',
    parts: [{ text: prefix + message }]
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: AUDREY_SYSTEM_INSTRUCTION }]
        },
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024
        }
      }),
      signal: controller.signal
    });
    if (!resp.ok) {
      const errBody = await resp.json().catch(() => ({}));
      throw new Error(errBody.error?.message || `Gemini API status ${resp.status}`);
    }
    const data = await resp.json();
    const reply = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('').trim();
    if (!reply) throw new Error('Empty Gemini response');
    return { reply, provider: 'gemini', model: targetModel };
  } finally {
    clearTimeout(timer);
  }
}

async function callOpenAIChatApi({ apiKey, model, message, history, context }) {
  const targetModel = (model || process.env.OPENAI_MODEL || 'gpt-4o-mini').trim();
  const base = (process.env.OPENAI_API_BASE || OPENAI_API_BASE).replace(/\/+$/, '');
  const url = `${base}/v1/chat/completions`;

  const prefix = buildContextPromptPrefix(context);
  const messages = [
    { role: 'system', content: AUDREY_SYSTEM_INSTRUCTION },
    ...history.map((turn) => ({
      role: turn.role === 'assistant' ? 'assistant' : 'user',
      content: turn.content
    })),
    { role: 'user', content: prefix + message }
  ];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: targetModel,
        messages,
        temperature: 0.7
      }),
      signal: controller.signal
    });
    if (!resp.ok) {
      const errBody = await resp.json().catch(() => ({}));
      throw new Error(errBody.error?.message || `OpenAI API status ${resp.status}`);
    }
    const data = await resp.json();
    const reply = (data.choices?.[0]?.message?.content || '').trim();
    if (!reply) throw new Error('Empty OpenAI response');
    return { reply, provider: 'openai', model: targetModel };
  } finally {
    clearTimeout(timer);
  }
}

function buildAudreyAssistantReply(message, history = [], context = {}) {
  const q = String(message || '').trim();
  const qLower = q.toLowerCase();
  const prevUserTurns = history.filter((h) => h.role === 'user').map((h) => h.content);
  const combinedContextText = [
    context.brand || '',
    context.category || '',
    context.idea || '',
    context.region || '',
    ...prevUserTurns,
    q
  ].join(' ');

  // 이전 대화나 현재 질문에서 업종/비즈니스 힌트 추출
  let detectedBiz = (context.brand || context.idea || context.category || '').trim();
  if (!detectedBiz) {
    const bizMatch = combinedContextText.match(/(고깃집|삼겹살|음식점|식당|카페|베이커리|디저트|술집|이자카야|미용실|헤어샵|네일|필라테스|헬스장|PT|학원|교습소|병원|치과|한의원|성형외과|피부과|부동산|인테리어|쇼핑몰|스마트스토어|프랜차이즈|스타트업|B2B|변호사|세무사|노무사)/);
    if (bizMatch) detectedBiz = bizMatch[1];
  }
  const bizPrefix = detectedBiz ? `**${detectedBiz}** 비즈니스 맥락을 기준으로 ` : '';

  if (/^(안녕|안녕하세요|반가워|하이|hello|hi|오드리)/i.test(q) && q.length < 18) {
    return `안녕하세요 대표님! **BuildMap 비즈니스 어시스턴트 오드리**입니다. 😊\n\n${detectedBiz ? `현재 관심 있으신 **${detectedBiz}** 마케팅 전략부터 ` : ''}**네이버 플레이스 SEO, 블로그·릴스·쇼츠 콘텐츠, AI 검색(챗GPT·네이버 AI 브리핑) 노출, 예산별 광고 운영, BuildMap Studio 활용법**까지 무엇이든 편하게 물어보세요!`;
  }

  if (/누구|정체|무슨s*일|역할|어떤s*봇/.test(qLower)) {
    return `저는 **BuildMap 서비스 및 마케팅 전략 관련 질문에 친절하고 전문적으로 답하는 비즈니스 어시스턴트 오드리**입니다! 💡\n\n- **BuildMap Studio 활용 안내**: 5대 마케팅 리포트 생성, 원클릭 복사, PDF 저장, 계정·API 연동\n- **맞춤형 마케팅 전략 자문**: 업종·상권별 플레이스 상위노출, 숏폼·블로그 콘텐츠, AI 검색(GEO) 선점, 객단가·단골 확대 전략\n\n현재 고민 중인 업종이나 마케팅 채널을 말씀해 주시면 맞춤 실행 플랜을 바로 제안해 드릴게요.`;
  }

  if (/apis*키|apis*설정|키s*오류|.env|엔진s*설정|제미나이|gemini|openai|gpt/.test(qLower)) {
    return `🔑 **BuildMap AI 엔진 & API 연동 안내**입니다.\n\n1. **별도 키 없이 즉시 사용**: 기본 탑재된 **[오드리 로컬 마케팅 엔진]**으로 실행하시면 API 키 없이도 업종·상권 맞춤 5대 마케팅 전략 리포트가 무료로 생성됩니다.\n2. **실시간 AI 엔진 연동**: 서버의 **.env** 파일에 **GEMINI_API_KEY** 또는 **OPENAI_API_KEY**를 설정하시거나, 화면 우측 상단 **[AI 엔진 설정]** 버튼에서 키를 입력하시면 실시간 생성형 AI 엔진으로 연동됩니다.\n\n추가로 설정 중 막히는 부분이 있으시면 말씀해 주세요!`;
  }

  if (/요금|가격|결제|무료|유료|보관함|저장|회원가입/.test(qLower)) {
    return `💳 **BuildMap 요금제 및 리포트 보관 안내**입니다.\n\n- **첫 1회 무료 체험**: 비회원도 접속 즉시 첫 번째 맞춤 마케팅 전략 리포트를 무료로 생성·열람하실 수 있습니다.\n- **무료 회원가입 혜택**: 3초 간편가입(이메일·카카오·네이버·Google)만 완료하시면 **무제한 리포트 생성, 내 계정 영구 보관, 홍보 원고 원클릭 복사, PDF 다운로드**를 모두 무료로 이용하실 수 있습니다.`;
  }

  if (/사용법|사용s*방법|어떻게s*써|리포트s*생성|시작하는s*법/.test(qLower)) {
    return `💻 **BuildMap Studio 100% 활용 가이드**입니다!\n\n1. 좌측 설계 폼에 **①상호명, ②업종/주력상품, ③지역(상권), ④강점/타깃 고객, ⑤마케팅 고민**을 입력합니다.\n2. 하단의 **[맞춤 마케팅 전략 생성하기]** 버튼을 클릭합니다.\n3. 우측 대시보드에 **①플레이스 SEO 키워드, ②AI 검색(AEO·GEO) Q&A, ③블로그·쇼츠·릴스·당근 홍보 원고, ④경쟁사·자사 분석, ⑤브랜드 스토리**가 즉시 완성됩니다.\n4. 마음에 드는 원고는 **[원클릭 복사]** 또는 **[PDF 리포트 다운로드]**로 바로 실전에 활용하세요!`;
  }

  if (/제휴|도입|다점포|프랜차이즈s*본사|대행사|엔터프라이즈|협업/.test(qLower)) {
    return `🏢 **프랜차이즈·다점포·기관 제휴 도입 안내**입니다.\n\n가맹점별 상권 맞춤 마케팅 리포트 일괄 생성, 소상공인 교육 프로그램 도입, 마케팅 대행사 화이트라벨 제휴는 **support@marketingmap.kr**로 문의 주시면 전담 파트너팀이 맞춤 제안서를 안내해 드립니다.`;
  }

  if (/플레이스|스마트플레이스|지도|상위s*노출|순위|영수증s*리뷰|seo/.test(qLower)) {
    return `📍 ${bizPrefix}**네이버 플레이스 상위노출(SEO) 핵심 3단계 전략**입니다.\n\n1. **대표 키워드 5개 조합 세팅**: '[지역명 + 세부메뉴/업종 + 방문목적(회식·데이트·혼밥 등)]' 조합으로 플레이스 대표 키워드와 상세 설명 첫 2줄을 구성하세요.\n2. **소식(새소식) 주 2회 정기 발행**: 단순 공지가 아닌 '이번 주 인기 메뉴·신규 혜택·예약 팁'을 검색 키워드와 함께 올리면 플레이스 활성도 점수가 빠르게 오릅니다.\n3. **사진 포함 영수증 리뷰 유도**: 테이블·카운터 안내문으로 고객이 직접 찍은 사진+키워드 리뷰를 유도하고, 사장님 답글에 매장 강점 키워드를 자연스럽게 포함해 주세요.\n\n더 구체적인 대표 키워드 리스트가 필요하시면 좌측 폼에서 전략 리포트를 생성해 보시거나 상권(지역)을 알려주세요!`;
  }

  if (/블로그|체험단|포스팅|원고|상위/.test(qLower)) {
    return `✍️ ${bizPrefix}**검색 유입을 실제 방문으로 바꾸는 블로그 마케팅 전략**입니다.\n\n1. **초기에는 '세부 키워드(롱테일)' 공략**: 경쟁이 치열한 광역 키워드 대신 '[동네명 + 골목/역세권 + 메뉴/고민 해결]' 키워드로 상위 노출을 먼저 확보하세요.\n2. **후기형 + 정보형 원고 7:3 비율**: 고객 입장의 솔직 체험기(주차·좌석·시그니처 메뉴·가격표) 70%와 대표님의 전문성 칼럼(재료 손질·노하우) 30%를 조합하면 신뢰도가 극대화됩니다.\n3. **플레이스 지도 첨부 필수**: 본문 하단에 네이버 플레이스 지도와 예약 링크를 반드시 삽입해 검색 이탈을 막으세요.`;
  }

  if (/인스타|릴스|유튜브|쇼츠|숏폼|영상|틱톡|sns/.test(qLower)) {
    return `🎬 ${bizPrefix}**알고리즘을 타는 15초 숏폼(릴스·쇼츠) 실전 공식**입니다.\n\n1. **첫 3초 후킹(Hook)**: 완성된 모습이나 가장 역동적인 순간(시즐감·비포애프터·핵심 질문)을 0~3초에 배치해 스크롤을 멈추게 하세요.\n2. **자막은 화면 중앙 상단 배치**: 소리 없이 보는 시청자가 많으므로 핵심 혜택과 위치 정보를 큼직한 자막으로 넣어주세요.\n3. **프로필 링크 & 고정 댓글 전환**: 영상 마지막에 '프로필 링크에서 첫 방문 쿠폰 받기' 또는 '댓글에 지역명 남기면 위치 DM 발송' 같은 명확한 행동 유도(CTA)를 넣으면 실제 매출로 직결됩니다.`;
  }

  if (/당근|동네|지역s*광고|단골|재방문|쿠폰|리뷰s*이벤트/.test(qLower)) {
    return `🥕 ${bizPrefix}**반경 1.5km 진성 단골을 모으는 로컬 & 리텐션 전략**입니다.\n\n1. **당근마켓 비즈프로필 소식 발행**: 동네 주민이 바로 체감할 수 있는 '당근 단골 전용 웰컴 혜택'을 쿠폰으로 발행하고 단골 맺기를 유도하세요.\n2. **2회차 방문 골든타임 쿠폰**: 첫 방문 고객에게 '14일 이내 재방문 시 사용할 수 있는 시그니처 사이드/할인 혜택'을 제공하면 단골 전환율이 2배 이상 높아집니다.\n3. **체감 가치가 높은 리뷰 이벤트**: 원가는 낮고 고객 만족도는 높은 미니 시그니처 메뉴나 뽑기 이벤트를 활용하면 자발적인 고품질 리뷰가 쌓입니다.`;
  }

  if (/예산|비용|광고비|얼마|소액|10만원|적은s*돈/.test(qLower)) {
    return `💰 ${bizPrefix}**월 예산 0원~10만 원대 고효율 마케팅 배분 플랜**입니다.\n\n1. **무료 자산화 (예산 0원)**: 네이버 플레이스 상세설명·대표키워드 최적화 + 주 2회 새소식 업로드 + 인스타그램/유튜브 주 2회 숏폼 업로드\n2. **매장 내 리뷰 전환 (월 3~5만 원)**: 테이블 QR 영수증 리뷰 이벤트용 서비스 원가 투자 (외부 대행 광고비보다 전환율이 5배 높습니다)\n3. **초정밀 타깃 광고 (월 5만 원)**: 당근마켓 동네 광고 또는 플레이스 클릭초이스를 피크타임(주말·저녁 등)에만 집중 집행\n\n현재 생각하시는 월 마케팅 예산 범위를 알려주시면 그에 딱 맞춘 주간 실행표를 짜드릴게요!`;
  }

  if (/ais*검색|챗gpt|chatgpt|퍼플렉시티|perplexity|aeo|geo|ais*브리핑/.test(qLower)) {
    return `🤖 ${bizPrefix}**AI 검색(AEO·GEO: 챗GPT·퍼플렉시티·네이버 AI 브리핑) 추천 선점 전략**입니다.\n\n최근 고객들은 "강남역 단체 회식하기 좋은 고깃집 추천해줘"처럼 문장형으로 AI에게 질문합니다.\n1. **질문-답변(Q&A) 구조 콘텐츠 발행**: 블로그와 플레이스 소개글에 고객이 자주 묻는 질문(주차 가능 여부, 단체석 규모, 대표 메뉴 특징, 가격대)을 명확한 문장으로 작성하세요.\n2. **구체적 팩트 데이터 명시**: '맛있는 집' 대신 '72시간 저온 숙성 한돈, 40석 단독 룸 완비, 역 도보 3분'처럼 AI가 인용하기 좋은 수치·팩트를 명시하면 AI 추천 후보에 최우선 노출됩니다.`;
  }

  // 일반 마케팅/비즈니스 질문 또는 후속 질문에 대한 자연스러운 맞춤형 답변
  const prevNote = prevUserTurns.length > 0
    ? `앞서 말씀해주신 내용("${prevUserTurns[prevUserTurns.length - 1].slice(0, 35)}")에 이어 `
    : '';

  return `대표님, ${prevNote}${bizPrefix}질문해주신 **"${q}"**에 대한 오드리의 실전 마케팅 제안입니다! 💡\n\n1. **핵심 타깃 & 검색 접점 확보**: 고객이 우리 매장·서비스를 찾을 때 가장 먼저 검색하는 **[지역/상황 + 핵심 상품/강점]** 키워드를 네이버 플레이스와 블로그 제목에 일관되게 배치하세요.\n2. **시각적 신뢰 & 전환 장치**: 첫 방문 고객이 망설이지 않도록 대표 시그니처 상품의 고화질 비주얼과 **첫 이용 웰컴 혜택(또는 리뷰 이벤트)**을 상단에 고정해 문의·방문 전환율을 높이세요.\n3. **AI 검색(GEO) & 재방문 루프**: 고객이 자주 묻는 질문(가격·주차·예약·차별점)을 Q&A 형태로 정리해 두시면 네이버 AI 브리핑과 챗GPT 추천 노출에 매우 유리합니다.\n\n더 구체적인 **상권(지역), 주력 상품, 또는 목표 예산**을 편하게 말씀해 주시면 그에 맞춰 한 단계 더 깊이 있는 실행 전략을 안내해 드릴게요!`;
}


const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml'
};

// --- Signed auth token (HMAC-SHA256). 비밀키는 환경변수 AUTH_SECRET 또는 .auth_secret 파일(서버 최초 실행 시 자동 생성) ---
const AUTH_SECRET_PATH = path.join(__dirname, '.auth_secret');
function loadAuthSecret() {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  try {
    return fs.readFileSync(AUTH_SECRET_PATH, 'utf8').trim();
  } catch (e) {
    const secret = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(AUTH_SECRET_PATH, secret, { mode: 0o600 });
    return secret;
  }
}
const AUTH_SECRET = loadAuthSecret();
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function signToken(user) {
  const payload = Buffer.from(JSON.stringify({ uid: user.id, email: user.email, tv: user.tokenVersion || 0, exp: Date.now() + TOKEN_TTL_MS })).toString('base64url');
  const sig = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url');
  return payload + '.' + sig;
}

function verifyToken(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url');
  const a = Buffer.from(sig || '');
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.exp || data.exp < Date.now()) return null;
    return data;
  } catch (e) {
    return null;
  }
}

function getAuthUser(req) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  return verifyToken(token);
}

// 토큰이 유효하고, 해당 회원이 아직 존재하며, 비밀번호 변경 등으로 무효화되지 않았을 때만 회원을 돌려준다
function authenticateUser(req, users) {
  const payload = getAuthUser(req);
  if (!payload) return null;
  const user = users.find(u => u.id === payload.uid && u.email.toLowerCase() === String(payload.email).toLowerCase());
  if (!user) return null;
  if ((payload.tv || 0) !== (user.tokenVersion || 0)) return null;
  return user;
}

function publicUser(user) {
  const isEmailAccount = normalizeProvider(user.provider) === 'email';
  return {
    id: user.id,
    name: user.name,
    brand: user.brand || '',
    email: user.email,
    marketingOptIn: Boolean(user.marketingOptIn),
    provider: user.provider || 'email',
    createdAt: user.createdAt,
    emailVerified: isEmailAccount ? user.emailVerified === true : true
  };
}

// --- 이메일 발송 (Brevo 무료 요금제: 하루 300통) ---
const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const BREVO_API_URL = process.env.BREVO_API_URL || 'https://api.brevo.com/v3/smtp/email';
const MAIL_FROM_EMAIL = process.env.MAIL_FROM_EMAIL || '';
const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME || 'MarketingMap';
// 메일 속 링크는 반드시 설정된 주소로 만든다 (요청의 Host 헤더를 쓰면 비밀번호 재설정 링크 조작이 가능해짐)
const PUBLIC_BASE_URL = String(process.env.PUBLIC_BASE_URL || '').trim().replace(/\/+$/, '');
const MAIL_DAILY_LIMIT = Number(process.env.MAIL_DAILY_LIMIT) || 250; // 무료 한도(300)보다 낮게
const MAIL_ENABLED = Boolean(BREVO_API_KEY && MAIL_FROM_EMAIL && PUBLIC_BASE_URL);
const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
let mailDay = '';
let mailCount = 0;

function linkBase() {
  return PUBLIC_BASE_URL || `http://localhost:${PORT}`;
}

function sha256Hex(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

// 일회용 토큰: 메일에는 원본을, DB에는 해시만 저장한다
function newOneTimeToken() {
  const token = crypto.randomBytes(32).toString('base64url');
  return { token, hash: sha256Hex(token) };
}

function escapeHtmlServer(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function mailLayout(title, bodyHtml, ctaLabel, ctaLink) {
  return `<!doctype html><html lang="ko"><body style="margin:0;background:#f4f4f5;font-family:-apple-system,'Malgun Gothic',sans-serif;">
<div style="max-width:520px;margin:0 auto;padding:28px 16px;">
<div style="background:#ffffff;border-radius:14px;padding:32px 28px;border:1px solid #e5e7eb;">
<div style="font-size:13px;font-weight:800;color:#ff6b00;letter-spacing:.4px;margin-bottom:18px;">MarketingMap</div>
<h1 style="font-size:20px;color:#111;margin:0 0 14px;">${escapeHtmlServer(title)}</h1>
<div style="font-size:14px;line-height:1.7;color:#374151;">${bodyHtml}</div>
<div style="margin:26px 0;"><a href="${escapeHtmlServer(ctaLink)}" style="display:inline-block;background:#ff6b00;color:#ffffff;text-decoration:none;font-weight:700;padding:13px 26px;border-radius:10px;">${escapeHtmlServer(ctaLabel)}</a></div>
<div style="font-size:12px;color:#6b7280;line-height:1.6;">버튼이 열리지 않으면 아래 주소를 브라우저에 붙여 넣어 주세요.<br><span style="word-break:break-all;color:#374151;">${escapeHtmlServer(ctaLink)}</span></div>
</div>
<div style="font-size:11px;color:#9ca3af;text-align:center;margin-top:16px;line-height:1.6;">본 메일은 MarketingMap 서비스 이용과 관련하여 발송된 안내 메일입니다.<br>본인이 요청하지 않았다면 이 메일을 무시하셔도 됩니다.</div>
</div></body></html>`;
}

function buildVerificationMail(user, link) {
  const subject = '[MarketingMap] 이메일 인증을 완료해 주세요';
  const html = mailLayout(
    '이메일 인증',
    `<strong>${escapeHtmlServer(user.name)}</strong>님, MarketingMap에 가입해 주셔서 감사합니다.<br>아래 버튼을 눌러 이메일 주소 인증을 완료해 주세요. 링크는 24시간 동안 유효합니다.`,
    '이메일 인증하기',
    link
  );
  const text = `${user.name}님, MarketingMap에 가입해 주셔서 감사합니다.\n아래 주소를 열어 이메일 인증을 완료해 주세요. (24시간 유효)\n\n${link}\n\n본인이 요청하지 않았다면 이 메일을 무시해 주세요.`;
  return { subject, html, text };
}

function buildResetMail(user, link) {
  const subject = '[MarketingMap] 비밀번호 재설정 안내';
  const html = mailLayout(
    '비밀번호 재설정',
    `<strong>${escapeHtmlServer(user.name)}</strong>님, 비밀번호 재설정을 요청하셨습니다.<br>아래 버튼을 눌러 새 비밀번호를 설정해 주세요. 링크는 30분 동안만 유효하며 한 번만 사용할 수 있습니다.`,
    '비밀번호 재설정하기',
    link
  );
  const text = `${user.name}님, 비밀번호 재설정을 요청하셨습니다.\n아래 주소를 열어 새 비밀번호를 설정해 주세요. (30분 유효, 1회용)\n\n${link}\n\n본인이 요청하지 않았다면 이 메일을 무시해 주세요. 비밀번호는 변경되지 않습니다.`;
  return { subject, html, text };
}

function buildPasswordChangedMail(user) {
  const subject = '[MarketingMap] 비밀번호가 변경되었습니다';
  const html = mailLayout(
    '비밀번호 변경 안내',
    `<strong>${escapeHtmlServer(user.name)}</strong>님의 계정 비밀번호가 방금 변경되었습니다.<br>본인이 변경하지 않았다면 즉시 비밀번호 재설정을 다시 진행해 주세요.`,
    'MarketingMap 열기',
    linkBase() + '/'
  );
  const text = `${user.name}님의 계정 비밀번호가 방금 변경되었습니다.\n본인이 변경하지 않았다면 즉시 비밀번호 재설정을 다시 진행해 주세요.\n${linkBase()}/`;
  return { subject, html, text };
}

// 반환: { ok, mode?, reason? } - 실패해도 예외를 던지지 않는다 (메일 장애가 가입/로그인을 막지 않도록)
async function sendMail({ to, subject, html, text }) {
  if (!MAIL_ENABLED) {
    console.log(`[메일(콘솔 모드)] 수신: ${to} | 제목: ${subject}\n${text}\n`);
    return { ok: true, mode: 'console' };
  }
  const today = new Date().toISOString().slice(0, 10);
  if (mailDay !== today) { mailDay = today; mailCount = 0; }
  if (mailCount >= MAIL_DAILY_LIMIT) {
    console.warn('[메일] 일일 발송 한도에 도달해 발송하지 않았습니다.');
    return { ok: false, reason: 'daily_limit' };
  }
  mailCount++;
  try {
    const resp = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ sender: { name: MAIL_FROM_NAME, email: MAIL_FROM_EMAIL }, to: [{ email: to }], subject, htmlContent: html, textContent: text }),
      signal: AbortSignal.timeout(10000)
    });
    if (!resp.ok) {
      const detail = await resp.text().catch(() => '');
      console.error(`[메일] 발송 실패 (${resp.status}): ${detail.slice(0, 200)}`);
      return { ok: false, reason: 'provider_error' };
    }
    return { ok: true, mode: 'brevo' };
  } catch (e) {
    console.error('[메일] 발송 오류:', e.message + (e.cause ? ' (' + (e.cause.code || e.cause.message || e.cause) + ')' : ''));
    return { ok: false, reason: 'network' };
  }
}

// --- Social credential verification ---
function authError(status, publicMessage) {
  const err = new Error(publicMessage);
  err.status = status;
  err.publicMessage = publicMessage;
  return err;
}

async function fetchProviderJson(url, headers = {}) {
  let resp;
  try {
    resp = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
  } catch (e) {
    throw authError(503, '소셜 인증 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  }
  if (!resp.ok) {
    throw authError(401, '소셜 인증 정보가 유효하지 않거나 만료되었습니다. 다시 로그인해 주세요.');
  }
  try {
    return await resp.json();
  } catch (e) {
    throw authError(502, '소셜 인증 응답을 해석하지 못했습니다.');
  }
}

function normalizeProvider(label) {
  const s = String(label || '').toLowerCase();
  if (s.includes('kakao') || s.includes('카카오')) return 'kakao';
  if (s.includes('google') || s.includes('구글')) return 'google';
  if (s.includes('naver') || s.includes('네이버')) return 'naver';
  return 'email';
}

// 반환: { providerKey, providerId, email, emailVerified, name }  (모두 제공사 응답에서 가져온 값)
async function verifySocialCredential(body) {
  const key = String(body.providerKey || '').toLowerCase();
  const accessToken = typeof body.accessToken === 'string' ? body.accessToken.trim() : '';
  const idToken = typeof body.idToken === 'string' ? body.idToken.trim() : '';

  if (key === 'kakao') {
    if (!accessToken) throw authError(401, '카카오 인증 정보가 없습니다. 다시 로그인해 주세요.');
    const auth = { Authorization: 'Bearer ' + accessToken };
    const me = await fetchProviderJson(KAKAO_API_BASE + '/v2/user/me', auth);
    if (!me || !me.id) throw authError(401, '카카오 계정 정보를 확인하지 못했습니다.');
    if (KAKAO_APP_ID) {
      const info = await fetchProviderJson(KAKAO_API_BASE + '/v1/user/access_token_info', auth);
      if (String(info.app_id) !== String(KAKAO_APP_ID)) {
        throw authError(401, '이 서비스에서 발급된 카카오 인증 정보가 아닙니다.');
      }
    }
    const acct = me.kakao_account || {};
    const hasVerifiedEmail = Boolean(acct.email && acct.is_email_valid && acct.is_email_verified);
    return {
      providerKey: 'kakao',
      providerId: String(me.id),
      email: String(acct.email || ('kakao_' + me.id + '@' + SOCIAL_PLACEHOLDER_DOMAIN)).toLowerCase(),
      emailVerified: hasVerifiedEmail,
      name: (acct.profile && acct.profile.nickname) || (me.properties && me.properties.nickname) || '카카오 회원'
    };
  }

  if (key === 'google') {
    if (!accessToken && !idToken) throw authError(401, 'Google 인증 정보가 없습니다. 다시 로그인해 주세요.');
    const query = idToken ? 'id_token=' + encodeURIComponent(idToken) : 'access_token=' + encodeURIComponent(accessToken);
    const info = await fetchProviderJson(GOOGLE_TOKENINFO_URL + '?' + query);
    if (info.aud !== GOOGLE_CLIENT_ID && info.azp !== GOOGLE_CLIENT_ID) {
      throw authError(401, '이 서비스에서 발급된 Google 인증 정보가 아닙니다.');
    }
    if (!info.sub) throw authError(401, 'Google 계정 정보를 확인하지 못했습니다.');
    if (!info.email) throw authError(401, 'Google 계정에서 이메일을 가져오지 못했습니다. 이메일 제공에 동의해 주세요.');
    let name = info.name || '';
    if (!name && accessToken) {
      try {
        const profile = await fetchProviderJson(GOOGLE_USERINFO_URL, { Authorization: 'Bearer ' + accessToken });
        name = profile.name || '';
      } catch (e) { /* 이름은 선택 정보 */ }
    }
    return {
      providerKey: 'google',
      providerId: String(info.sub),
      email: String(info.email).toLowerCase(),
      emailVerified: String(info.email_verified) === 'true',
      name: name || '구글 회원'
    };
  }

  if (key === 'naver') {
    if (!accessToken) throw authError(401, '네이버 인증 정보가 없습니다. 다시 로그인해 주세요.');
    const me = await fetchProviderJson(NAVER_API_BASE + '/v1/nid/me', { Authorization: 'Bearer ' + accessToken });
    const r = me && me.response;
    if (!me || me.resultcode !== '00' || !r || !r.id) throw authError(401, '네이버 계정 정보를 확인하지 못했습니다.');
    return {
      providerKey: 'naver',
      providerId: String(r.id),
      email: String(r.email || ('naver_' + r.id + '@' + SOCIAL_PLACEHOLDER_DOMAIN)).toLowerCase(),
      emailVerified: false, // 네이버 연락처 이메일은 소유 확인이 보장되지 않으므로 이메일만으로 기존 계정과 연결하지 않는다
      name: r.name || r.nickname || '네이버 회원'
    };
  }

  throw authError(400, '지원하지 않는 소셜 로그인 방식입니다.');
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, originalHash] = storedHash.split(':');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'));
}

const USERS_BAK_PATH = USERS_DB_PATH + '.bak';

// 임시 파일에 쓴 뒤 교체(rename)하여, 쓰는 도중 중단되어도 기존 파일이 깨지지 않게 한다
function writeFileAtomic(filePath, data) {
  const tmpPath = filePath + '.tmp';
  fs.writeFileSync(tmpPath, data, { encoding: 'utf-8', mode: 0o600 });
  fs.renameSync(tmpPath, filePath);
}

function readUsersFile(filePath) {
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  if (!Array.isArray(parsed)) throw new Error('회원 파일 형식이 올바르지 않습니다(배열이 아님)');
  return parsed;
}

function restoreUsersFromBackup(reason) {
  if (!fs.existsSync(USERS_BAK_PATH)) return null;
  try {
    const users = readUsersFile(USERS_BAK_PATH);
    writeFileAtomic(USERS_DB_PATH, JSON.stringify(users, null, 2));
    console.warn('[복구] ' + reason + ' → 백업(' + path.basename(USERS_BAK_PATH) + ')에서 회원 ' + users.length + '명을 복구했습니다.');
    return users;
  } catch (e) {
    console.error('[치명] 백업 파일도 읽을 수 없습니다:', e.message);
    return null;
  }
}

// 손상된 파일을 빈 목록으로 간주해 덮어쓰지 않는다: 백업 복구에 실패하면 예외를 던져 서버가 멈추게 한다
function loadUsers() {
  if (!fs.existsSync(USERS_DB_PATH)) {
    const restored = restoreUsersFromBackup('회원 파일이 없음');
    if (restored) return restored;
    writeFileAtomic(USERS_DB_PATH, '[]');
    return [];
  }
  try {
    return readUsersFile(USERS_DB_PATH);
  } catch (err) {
    console.error('[치명] 회원 파일을 읽을 수 없습니다:', err.message);
    const corruptCopy = USERS_DB_PATH.replace(/\.json$/, '') + '.corrupt-' + Date.now() + '.json';
    try {
      fs.copyFileSync(USERS_DB_PATH, corruptCopy);
      console.error('[보존] 손상된 파일을 ' + path.basename(corruptCopy) + ' 로 보관했습니다.');
    } catch (copyErr) { /* 보관 실패는 무시 */ }
    const restored = restoreUsersFromBackup('회원 파일 손상');
    if (restored) return restored;
    const fatal = new Error('USERS_DB_UNREADABLE');
    fatal.code = 'USERS_DB_UNREADABLE';
    throw fatal;
  }
}

// 저장 실패 시 예외를 던진다 (실패했는데 성공으로 응답하는 일이 없도록)
function saveUsers(users) {
  if (!Array.isArray(users)) throw new Error('saveUsers: 배열이 아닙니다');
  if (fs.existsSync(USERS_DB_PATH)) {
    try {
      fs.copyFileSync(USERS_DB_PATH, USERS_BAK_PATH);
    } catch (e) {
      console.error('[경고] 회원 파일 백업 실패:', e.message);
    }
  }
  writeFileAtomic(USERS_DB_PATH, JSON.stringify(users, null, 2));
}

// --- 보안 헬퍼: 클라이언트 IP, 요청 제한(rate limit), CORS, 보안 헤더 ---
const RATE_SCALE = Number(process.env.RATE_LIMIT_SCALE) || 1; // 테스트용 배율
const rateBuckets = new Map();
const failureBuckets = new Map();

function pruneBucket(list, windowMs, now) {
  while (list.length && list[0] <= now - windowMs) list.shift();
  return list;
}

function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  const list = pruneBucket(rateBuckets.get(key) || [], windowMs, now);
  if (list.length >= limit * RATE_SCALE) {
    rateBuckets.set(key, list);
    return { ok: false, retryAfter: Math.max(1, Math.ceil((list[0] + windowMs - now) / 1000)) };
  }
  list.push(now);
  rateBuckets.set(key, list);
  return { ok: true, retryAfter: 0 };
}

function failureCount(key, windowMs) {
  const list = pruneBucket(failureBuckets.get(key) || [], windowMs, Date.now());
  failureBuckets.set(key, list);
  return list.length;
}
function recordFailure(key) {
  const list = failureBuckets.get(key) || [];
  list.push(Date.now());
  failureBuckets.set(key, list);
}
function clearFailures(key) {
  failureBuckets.delete(key);
}

setInterval(() => {
  const now = Date.now();
  for (const [k, list] of rateBuckets) { pruneBucket(list, 3600 * 1000, now); if (!list.length) rateBuckets.delete(k); }
  for (const [k, list] of failureBuckets) { pruneBucket(list, 3600 * 1000, now); if (!list.length) failureBuckets.delete(k); }
}, 10 * 60 * 1000).unref();

// 프록시(Cloudflare 터널 등) 뒤에서는 로컬호스트로 접속하므로, 로컬 연결일 때만 전달 헤더의 실제 IP를 사용한다
function clientIp(req) {
  const remote = (req.socket && req.socket.remoteAddress) || '';
  const isLoopback = remote === '127.0.0.1' || remote === '::1' || remote === '::ffff:127.0.0.1';
  if (isLoopback) {
    const forwarded = req.headers['cf-connecting-ip'] || String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    if (forwarded) return String(forwarded);
  }
  return remote || 'unknown';
}

const ALLOWED_ORIGINS = String(process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
function allowedCorsOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return '';
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  try {
    if (new URL(origin).host === req.headers.host) return origin; // 같은 출처
  } catch (e) { /* 잘못된 Origin */ }
  return '';
}

function applySecurityHeaders(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (String(req.url || '').startsWith('/api/')) res.setHeader('Cache-Control', 'no-store');
  const corsOrigin = allowedCorsOrigin(req);
  if (corsOrigin) {
    res.setHeader('Access-Control-Allow-Origin', corsOrigin);
    res.setHeader('Vary', 'Origin');
  }
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload), 'utf-8');
}

const MAX_BODY_BYTES = 100 * 1024;
function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf-8');
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

if (!MAIL_ENABLED) console.warn('[메일] BREVO_API_KEY / MAIL_FROM_EMAIL / PUBLIC_BASE_URL 중 설정되지 않은 값이 있어 이메일을 실제로 보내지 않고 콘솔에만 출력합니다. (이메일 인증·비밀번호 재설정 메일 사용 시 .env 설정 필요)');
if (!KAKAO_APP_ID) console.warn('[보안] KAKAO_APP_ID가 설정되지 않았습니다. 다른 카카오 앱에서 발급된 토큰도 허용됩니다. (환경변수 KAKAO_APP_ID 설정 권장)');

// 시작 시 회원 DB 검사: 손상되었고 복구도 불가능하면 빈 목록으로 덮어쓰지 않고 서버를 중단한다
try {
  loadUsers();
} catch (e) {
  console.error('\n[치명] 회원 데이터를 불러올 수 없어 서버를 시작하지 않습니다.');
  console.error('       손상된 users 파일과 .bak 백업을 확인해 주세요. (손상 파일은 users.corrupt-*.json 으로 보관됨)\n');
  process.exit(1);
}

process.on('unhandledRejection', (reason) => {
  console.error('[오류] 처리되지 않은 비동기 오류:', reason);
});

const server = http.createServer(async (req, res) => {
  applySecurityHeaders(req, res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '600'
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const reqPath = parsedUrl.pathname;
  const ip = clientIp(req);
  const limited = (key, limit, windowMs) => {
    const r = rateLimit(key, limit, windowMs);
    if (r.ok) return false;
    res.setHeader('Retry-After', String(r.retryAfter));
    sendJson(res, 429, { ok: false, message: `요청이 너무 많습니다. ${r.retryAfter}초 후 다시 시도해 주세요.` });
    return true;
  };
  if (reqPath === '/api/auth/check-email' && req.method === 'GET' && limited('chk:' + ip, 30, 60 * 1000)) return;
  if (reqPath === '/api/auth/register' && req.method === 'POST' && limited('reg:' + ip, 10, 60 * 60 * 1000)) return;
  if (reqPath === '/api/auth/login' && req.method === 'POST' && limited('login:' + ip, 40, 15 * 60 * 1000)) return;
  if (reqPath === '/api/auth/social' && req.method === 'POST' && limited('soc:' + ip, 30, 10 * 60 * 1000)) return;
  if (reqPath === '/api/auth/account/delete' && req.method === 'POST' && limited('del:' + ip, 10, 15 * 60 * 1000)) return;
  if (reqPath === '/api/auth/profile/marketing' && req.method === 'POST' && limited('mkt:' + ip, 30, 10 * 60 * 1000)) return;
  if (reqPath === '/api/auth/verify-email' && req.method === 'GET' && limited('ver:' + ip, 30, 10 * 60 * 1000)) return;
  if (reqPath === '/api/auth/resend-verification' && req.method === 'POST' && limited('rsv:' + ip, 10, 60 * 60 * 1000)) return;
  if (reqPath === '/api/auth/password-reset/request' && req.method === 'POST' && limited('rstr:' + ip, 10, 60 * 60 * 1000)) return;
  if (reqPath === '/api/auth/password-reset/confirm' && req.method === 'POST' && limited('rstc:' + ip, 20, 60 * 60 * 1000)) return;
  if (reqPath === '/api/auth/me' && req.method === 'GET' && limited('me:' + ip, 60, 10 * 60 * 1000)) return;
  if (reqPath === '/api/chat' && req.method === 'POST' && limited('chat:' + ip, 60, 10 * 60 * 1000)) return;

  // --- AUTHENTICATION API ENDPOINTS ---
  if (reqPath === '/api/auth/check-email' && req.method === 'GET') {
    const email = (parsedUrl.searchParams.get('email') || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      return sendJson(res, 400, { ok: false, message: '올바른 이메일 주소를 입력해 주세요.' });
    }
    const users = loadUsers();
    const exists = users.some(u => u.email.toLowerCase() === email);
    return sendJson(res, 200, {
      ok: true,
      available: !exists,
      message: exists ? '이미 가입된 이메일 주소입니다.' : '사용 가능한 이메일 주소입니다.'
    });
  }

  if (reqPath === '/api/auth/register' && req.method === 'POST') {
    try {
      const body = await parseRequestBody(req);
      const name = (body.name || '').trim();
      const brand = (body.brand || '').trim();
      const email = (body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      const marketingOptIn = Boolean(body.marketingOptIn);
      const termsAge = Boolean(body.termsAge);
      const termsService = Boolean(body.termsService);
      const termsPrivacy = Boolean(body.termsPrivacy);
        const phone = (body.phone || "").trim();
        const gender = (body.gender || "M").trim();
        const birth = (body.birth || "").trim();
        const vipCode = (body.vipCode || "").trim();
        const smsOptIn = Boolean(body.smsOptIn);
        const industry = (body.industry || '').trim();

      if (!name) {
        return sendJson(res, 400, { ok: false, message: '대표자 성함을 입력해 주세요.' });
      }
      if (!email || !email.includes('@')) {
        return sendJson(res, 400, { ok: false, message: '유효한 이메일 주소를 입력해 주세요.' });
      }
      if (email.endsWith('@' + SOCIAL_PLACEHOLDER_DOMAIN)) {
        return sendJson(res, 400, { ok: false, message: '사용할 수 없는 이메일 주소입니다.' });
      }
      if (password.length < 6) {
        return sendJson(res, 400, { ok: false, message: '비밀번호는 6자 이상 입력해 주세요.' });
      }
      if (!termsAge || !termsService || !termsPrivacy) {
        return sendJson(res, 400, { ok: false, message: '서비스 이용을 위해 필수 약관에 모두 동의해 주세요.' });
      }

      const users = loadUsers();
      const existing = users.find(u => u.email.toLowerCase() === email);
      if (existing) {
        return sendJson(res, 409, { ok: false, message: '이미 가입된 이메일 주소입니다. 로그인 탭에서 로그인해 주세요.' });
      }

      const now = new Date().toISOString();
      const newUser = {
        id: 'usr_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex'),
        name,
        brand,
        email,
        passwordHash: hashPassword(password),
        marketingOptIn,
          phone,
          gender,
          birth,
          vipCode,
          smsOptIn,
          industry,
        termsAgreedAt: now,
        marketingConsentAt: (marketingOptIn || smsOptIn) ? now : null,
        provider: 'email',
        createdAt: now,
        lastLoginAt: now
      };

      const verification = newOneTimeToken();
      newUser.emailVerified = false;
      newUser.emailVerifyHash = verification.hash;
      newUser.emailVerifyExpiresAt = Date.now() + VERIFY_TOKEN_TTL_MS;

      users.push(newUser);
      saveUsers(users);

      const verifyLink = `${linkBase()}/api/auth/verify-email?token=${encodeURIComponent(verification.token)}`;
      const sentResult = await sendMail({ to: newUser.email, ...buildVerificationMail(newUser, verifyLink) });

      const token = signToken(newUser);
      return sendJson(res, 201, {
        verificationSent: sentResult.ok,
        ok: true,
        message: `환영합니다, ${newUser.name}님! 회원가입이 완료되었습니다.`,
        token,
        user: {
          id: newUser.id,
          name: newUser.name,
          brand: newUser.brand,
          email: newUser.email,
          provider: newUser.provider,
          createdAt: newUser.createdAt,
          emailVerified: false
        }
      });
    } catch (err) {
      return sendJson(res, 400, { ok: false, message: '회원가입 요청 처리 중 오류가 발생했습니다.' });
    }
  }

  if (reqPath === '/api/auth/login' && req.method === 'POST') {
    try {
      const body = await parseRequestBody(req);
      const email = (body.email || '').trim().toLowerCase();
      const password = String(body.password || '');

      if (!email || !password) {
        return sendJson(res, 400, { ok: false, message: '이메일과 비밀번호를 모두 입력해 주세요.' });
      }

      const failKey = 'login:' + ip + '|' + email;
      if (failureCount(failKey, 15 * 60 * 1000) >= 8 * RATE_SCALE) {
        res.setHeader('Retry-After', '900');
        return sendJson(res, 429, { ok: false, message: '로그인 시도가 너무 많습니다. 15분 후 다시 시도해 주세요.' });
      }

      const users = loadUsers();
      const user = users.find(u => u.email.toLowerCase() === email);
      if (!user) {
        recordFailure(failKey);
        return sendJson(res, 401, { ok: false, message: '가입되지 않은 이메일입니다. 먼저 무료 회원가입을 진행해 주세요.' });
      }

      if (!verifyPassword(password, user.passwordHash)) {
        recordFailure(failKey);
        return sendJson(res, 401, { ok: false, message: '비밀번호가 일치하지 않습니다. 다시 확인해 주세요.' });
      }

      clearFailures(failKey);
      user.lastLoginAt = new Date().toISOString();
      saveUsers(users);

      const token = signToken(user);
      return sendJson(res, 200, {
        ok: true,
        message: `${user.name}님, 환영합니다!`,
        token,
        user: {
          id: user.id,
          name: user.name,
          brand: user.brand || '',
          email: user.email,
          marketingOptIn: Boolean(user.marketingOptIn),
          emailVerified: normalizeProvider(user.provider) === 'email' ? user.emailVerified === true : true,
          provider: user.provider || 'email',
          createdAt: user.createdAt
        }
      });
    } catch (err) {
      return sendJson(res, 400, { ok: false, message: '로그인 처리 중 오류가 발생했습니다.' });
    }
  }

  if (reqPath === '/api/auth/social' && req.method === 'POST') {
    try {
      const body = await parseRequestBody(req);
      const termsAgreed = Boolean(body.termsAgreed);
      const marketingOptIn = Boolean(body.marketingOptIn);

      // 이메일/이름은 클라이언트 입력이 아니라 제공사 API 응답으로만 결정한다
      let identity;
      try {
        identity = await verifySocialCredential(body);
      } catch (verifyErr) {
        return sendJson(res, verifyErr.status || 401, { ok: false, message: verifyErr.publicMessage || '소셜 인증 정보를 확인하지 못했습니다.' });
      }

      const users = loadUsers();
      const now = new Date().toISOString();
      let user = users.find(u => u.providerKey === identity.providerKey && u.providerId === identity.providerId);

      // 이전 버전에서 가입한 소셜 회원(providerId 없음)은, 제공사가 이메일 소유를 확인해 준 경우에만 연결한다
      if (!user && identity.emailVerified) {
        user = users.find(u => !u.providerId && u.email.toLowerCase() === identity.email && normalizeProvider(u.provider) === identity.providerKey);
        if (user) {
          user.providerKey = identity.providerKey;
          user.providerId = identity.providerId;
        }
      }

      if (!user) {
        // 같은 이메일로 이미 다른 방식(이메일 가입 등)으로 만든 계정이 있으면 자동 연결하지 않는다 (계정 선점 공격 방지)
        const sameEmail = users.find(u => u.email.toLowerCase() === identity.email);
        if (sameEmail) {
          const existingLabel = PROVIDER_LABELS[normalizeProvider(sameEmail.provider)] || sameEmail.provider;
          return sendJson(res, 409, { ok: false, message: '이 이메일은 이미 ' + existingLabel + ' 방식으로 가입되어 있습니다. 기존 방식으로 로그인해 주세요.' });
        }
        if (!termsAgreed) {
          return sendJson(res, 400, { ok: false, needsConsent: true, message: '서비스 이용약관과 개인정보 수집·이용에 동의해 주세요.' });
        }
        user = {
          id: 'usr_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex'),
          name: identity.name,
          brand: '',
          email: identity.email,
          passwordHash: hashPassword(crypto.randomBytes(12).toString('hex')),
          marketingOptIn: marketingOptIn,
          termsAgreedAt: now,
          marketingConsentAt: marketingOptIn ? now : null,
          provider: PROVIDER_LABELS[identity.providerKey],
          providerKey: identity.providerKey,
          providerId: identity.providerId,
          emailVerified: identity.emailVerified,
          createdAt: now,
          lastLoginAt: now
        };
        users.push(user);
      } else {
        user.lastLoginAt = now;
        if (!user.name && identity.name) user.name = identity.name;
        if (termsAgreed) {
          user.termsAgreedAt = now;
          user.marketingOptIn = marketingOptIn;
          user.marketingConsentAt = marketingOptIn ? now : null;
        }
      }
      saveUsers(users);

      const token = signToken(user);
      return sendJson(res, 200, {
        ok: true,
        message: `${user.name}님, ${user.provider} 계정으로 시작합니다!`,
        token,
        user: {
          id: user.id,
          name: user.name,
          brand: user.brand || '',
          email: user.email,
          marketingOptIn: Boolean(user.marketingOptIn),
          emailVerified: normalizeProvider(user.provider) === 'email' ? user.emailVerified === true : true,
          provider: user.provider,
          createdAt: user.createdAt
        }
      });
    } catch (err) {
      return sendJson(res, 400, { ok: false, message: '소셜 인증 처리 중 오류가 발생했습니다.' });
    }
  }

  // Update marketing opt-in
  if (reqPath === '/api/auth/profile/marketing' && req.method === 'POST') {
    try {
      const body = await parseRequestBody(req);
      const users = loadUsers();
      const user = authenticateUser(req, users);
      if (!user) {
        return sendJson(res, 401, { ok: false, message: '로그인이 필요합니다. 다시 로그인해 주세요.' });
      }
      const requestedEmail = (body.email || '').trim().toLowerCase();
      if (requestedEmail && requestedEmail !== user.email.toLowerCase()) {
        return sendJson(res, 403, { ok: false, message: '본인 계정의 수신 설정만 변경할 수 있습니다.' });
      }
      const marketingOptIn = Boolean(body.marketingOptIn);
      user.marketingOptIn = marketingOptIn;
      user.marketingConsentAt = marketingOptIn ? new Date().toISOString() : null;
      saveUsers(users);
      return sendJson(res, 200, { ok: true, message: '마케팅 수신 상태가 성공적으로 변경되었습니다.' });
    } catch (err) {
      return sendJson(res, 500, { ok: false, message: '서버 오류' });
    }
  }

  // 내 정보 조회 (로그인 상태 확인 + 최신 인증/수신 상태 동기화)
  if (reqPath === '/api/auth/me' && req.method === 'GET') {
    try {
      const users = loadUsers();
      const user = authenticateUser(req, users);
      if (!user) {
        return sendJson(res, 401, { ok: false, message: '로그인이 필요합니다.' });
      }
      return sendJson(res, 200, { ok: true, user: publicUser(user) });
    } catch (err) {
      return sendJson(res, 500, { ok: false, message: '서버 오류' });
    }
  }

  // 이메일 인증 링크 (메일 속 링크 클릭): 성공/실패와 관계없이 메인 화면으로 이동시키며 결과를 쿼리로 전달
  if (reqPath === '/api/auth/verify-email' && req.method === 'GET') {
    let verified = false;
    try {
      const token = parsedUrl.searchParams.get('token') || '';
      if (token) {
        const hash = sha256Hex(token);
        const users = loadUsers();
        const user = users.find(u => u.emailVerifyHash && u.emailVerifyHash === hash);
        if (user && (user.emailVerifyExpiresAt || 0) > Date.now()) {
          user.emailVerified = true;
          delete user.emailVerifyHash;
          delete user.emailVerifyExpiresAt;
          saveUsers(users);
          verified = true;
        }
      }
    } catch (err) {
      console.error('[이메일 인증] 처리 오류:', err.message);
    }
    res.writeHead(302, { Location: '/?emailVerified=' + (verified ? '1' : '0') });
    return res.end();
  }

  // 인증 메일 다시 보내기 (로그인 필요)
  if (reqPath === '/api/auth/resend-verification' && req.method === 'POST') {
    try {
      const users = loadUsers();
      const user = authenticateUser(req, users);
      if (!user) {
        return sendJson(res, 401, { ok: false, message: '로그인이 필요합니다. 다시 로그인해 주세요.' });
      }
      if (normalizeProvider(user.provider) !== 'email') {
        return sendJson(res, 400, { ok: false, message: '이메일로 가입한 회원만 이메일 인증이 필요합니다.' });
      }
      if (user.emailVerified === true) {
        return sendJson(res, 200, { ok: true, alreadyVerified: true, message: '이미 인증이 완료된 이메일입니다.' });
      }
      if (!rateLimit('rsvu:' + user.id, 3, 60 * 60 * 1000).ok) {
        return sendJson(res, 429, { ok: false, message: '인증 메일은 1시간에 3번까지 보낼 수 있습니다. 잠시 후 다시 시도해 주세요.' });
      }
      const verification = newOneTimeToken();
      user.emailVerifyHash = verification.hash;
      user.emailVerifyExpiresAt = Date.now() + VERIFY_TOKEN_TTL_MS;
      saveUsers(users);
      const link = `${linkBase()}/api/auth/verify-email?token=${encodeURIComponent(verification.token)}`;
      const result = await sendMail({ to: user.email, ...buildVerificationMail(user, link) });
      if (!result.ok) {
        return sendJson(res, 503, { ok: false, message: '인증 메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.' });
      }
      return sendJson(res, 200, { ok: true, message: '인증 메일을 보냈습니다. 메일함(스팸함 포함)을 확인해 주세요.' });
    } catch (err) {
      return sendJson(res, 500, { ok: false, message: '인증 메일 처리 중 오류가 발생했습니다.' });
    }
  }

  // 비밀번호 재설정 요청: 가입 여부와 관계없이 항상 같은 응답을 주어 이메일 가입 여부를 알아낼 수 없게 한다
  if (reqPath === '/api/auth/password-reset/request' && req.method === 'POST') {
    const genericReply = { ok: true, message: '가입된 이메일이라면 비밀번호 재설정 안내 메일을 보냈습니다. 메일함(스팸함 포함)을 확인해 주세요. 링크는 30분 동안 유효합니다.' };
    try {
      const body = await parseRequestBody(req);
      const email = String(body.email || '').trim().toLowerCase();
      if (email && email.includes('@') && email.length <= 254) {
        const users = loadUsers();
        const user = users.find(u => u.email.toLowerCase() === email);
        if (user && normalizeProvider(user.provider) === 'email' && rateLimit('rstu:' + user.id, 3, 60 * 60 * 1000).ok) {
          const reset = newOneTimeToken();
          user.resetHash = reset.hash;
          user.resetExpiresAt = Date.now() + RESET_TOKEN_TTL_MS;
          saveUsers(users);
          const link = `${linkBase()}/?reset=${encodeURIComponent(reset.token)}`;
          // 응답 시간으로 가입 여부를 추측하지 못하도록 메일 발송을 기다리지 않는다
          sendMail({ to: user.email, ...buildResetMail(user, link) }).catch(() => {});
        }
      }
    } catch (err) {
      console.error('[비밀번호 재설정] 요청 처리 오류:', err.message);
    }
    return sendJson(res, 200, genericReply);
  }

  // 비밀번호 재설정 확정: 일회용 토큰 + 새 비밀번호
  if (reqPath === '/api/auth/password-reset/confirm' && req.method === 'POST') {
    try {
      const body = await parseRequestBody(req);
      const token = String(body.token || '');
      const password = String(body.password || '');
      if (password.length < 6) {
        return sendJson(res, 400, { ok: false, message: '비밀번호는 6자 이상 입력해 주세요.' });
      }
      const users = loadUsers();
      const hash = token ? sha256Hex(token) : '';
      const user = hash ? users.find(u => u.resetHash && u.resetHash === hash) : null;
      if (!user || (user.resetExpiresAt || 0) < Date.now()) {
        return sendJson(res, 400, { ok: false, message: '재설정 링크가 만료되었거나 올바르지 않습니다. 비밀번호 찾기를 다시 진행해 주세요.' });
      }
      user.passwordHash = hashPassword(password);
      delete user.resetHash;
      delete user.resetExpiresAt;
      user.tokenVersion = (user.tokenVersion || 0) + 1; // 기존에 로그인되어 있던 모든 기기의 로그인 무효화
      user.emailVerified = true; // 메일의 링크를 열었으므로 이메일 소유가 확인됨
      saveUsers(users);
      for (const key of Array.from(failureBuckets.keys())) {
        if (key.endsWith('|' + user.email.toLowerCase())) failureBuckets.delete(key); // 로그인 잠금 해제
      }
      sendMail({ to: user.email, ...buildPasswordChangedMail(user) }).catch(() => {});
      return sendJson(res, 200, { ok: true, message: '비밀번호가 변경되었습니다. 새 비밀번호로 로그인해 주세요.' });
    } catch (err) {
      return sendJson(res, 500, { ok: false, message: '비밀번호 재설정 처리 중 오류가 발생했습니다.' });
    }
  }

  // 회원 탈퇴: 로그인 토큰 필수, 이메일 가입 회원은 비밀번호 재확인. 계정 정보는 즉시 삭제된다.
  if (reqPath === '/api/auth/account/delete' && req.method === 'POST') {
    try {
      const body = await parseRequestBody(req);
      const users = loadUsers();
      const user = authenticateUser(req, users);
      if (!user) {
        return sendJson(res, 401, { ok: false, message: '로그인이 필요합니다. 다시 로그인해 주세요.' });
      }
      if (normalizeProvider(user.provider) === 'email') {
        const failKey = 'del:' + ip + '|' + user.email.toLowerCase();
        if (failureCount(failKey, 15 * 60 * 1000) >= 5 * RATE_SCALE) {
          return sendJson(res, 429, { ok: false, message: '비밀번호 확인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.' });
        }
        if (!verifyPassword(String(body.password || ''), user.passwordHash)) {
          recordFailure(failKey);
          return sendJson(res, 401, { ok: false, message: '비밀번호가 일치하지 않습니다.' });
        }
        clearFailures(failKey);
      }
      users.splice(users.indexOf(user), 1);
      saveUsers(users);
      return sendJson(res, 200, { ok: true, message: '회원 탈퇴가 완료되었습니다. 계정과 개인정보가 삭제되었습니다.' });
    } catch (err) {
      return sendJson(res, 500, { ok: false, message: '회원 탈퇴 처리 중 오류가 발생했습니다.' });
    }
  }

  // --- AI SUPPORT CHATBOT ENDPOINT (/api/chat) ---
  if (reqPath === '/api/chat' && req.method === 'POST') {
    try {
      const body = await parseRequestBody(req);
      let message = String(body.message || '').trim();
      let rawHistory = Array.isArray(body.history) ? body.history : [];
      if (!message && Array.isArray(body.messages) && body.messages.length > 0) {
        const lastMsg = body.messages[body.messages.length - 1];
        message = String(lastMsg?.content || lastMsg?.text || '').trim();
        rawHistory = body.messages.slice(0, -1);
      }
      if (!message) {
        return sendJson(res, 400, { ok: false, message: '질문 내용을 입력해 주세요.' });
      }
      if (message.length > 2000) {
        return sendJson(res, 400, { ok: false, message: '질문은 2,000자 이내로 입력해 주세요.' });
      }

      const history = sanitizeChatHistory(rawHistory);
      const context = (body.context && typeof body.context === 'object') ? body.context : {};

      // 1순위: 서버 환경변수(.env)에 설정된 API 키 참조
      const envGeminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
      const envOpenaiKey = (process.env.OPENAI_API_KEY || '').trim();
      const preferredProvider = (process.env.AI_PROVIDER || body.clientProvider || '').toLowerCase();

      // 2순위: 클라이언트 AI 엔진 설정 모달에서 전달된 키(서버 .env 미설정 시 보조)
      const clientApiKey = String(body.clientApiKey || '').trim();
      const clientModel = String(body.clientModel || '').trim();

      let result = null;
      let upstreamError = null;

      if (preferredProvider === 'openai' && envOpenaiKey) {
        try {
          result = await callOpenAIChatApi({ apiKey: envOpenaiKey, model: process.env.OPENAI_MODEL, message, history, context });
        } catch (e) { upstreamError = e; }
      }
      if (!result && envGeminiKey) {
        try {
          result = await callGeminiChatApi({ apiKey: envGeminiKey, model: process.env.GEMINI_MODEL, message, history, context });
        } catch (e) { upstreamError = e; }
      }
      if (!result && envOpenaiKey) {
        try {
          result = await callOpenAIChatApi({ apiKey: envOpenaiKey, model: process.env.OPENAI_MODEL, message, history, context });
        } catch (e) { upstreamError = e; }
      }
      if (!result && clientApiKey) {
        try {
          if (preferredProvider === 'openai') {
            result = await callOpenAIChatApi({ apiKey: clientApiKey, model: clientModel, message, history, context });
          } else {
            result = await callGeminiChatApi({ apiKey: clientApiKey, model: clientModel, message, history, context });
          }
        } catch (e) { upstreamError = e; }
      }

      if (!result) {
        const fallbackReply = buildAudreyAssistantReply(message, history, context);
        result = { reply: fallbackReply, provider: 'audrey-ai', model: 'audrey-business-v1' };
      }

      return sendJson(res, 200, {
        ok: true,
        reply: result.reply,
        provider: result.provider,
        model: result.model,
        systemInstruction: AUDREY_SYSTEM_INSTRUCTION
      });
    } catch (err) {
      return sendJson(res, 500, { ok: false, message: '오드리 챗봇 응답 처리 중 오류가 발생했습니다.' });
    }
  }

  // --- STATIC FILE SERVING ---
  const relativePath = reqPath === '/' ? 'index.html' : reqPath.replace(/^\/+/, '');
  // 회원 데이터(users.*), 숨김 파일(.env, .auth_secret 등), 허용되지 않은 확장자, 폴더 밖 경로는 제공하지 않는다
  const baseName = path.basename(relativePath).toLowerCase();
  const resolvedPath = path.resolve(__dirname, relativePath);
  const blocked = baseName.startsWith('users.')
    || relativePath.split('/').some((seg) => seg.startsWith('.'))
    || !resolvedPath.startsWith(__dirname + path.sep)
    || !MIME_TYPES[path.extname(baseName)];
  if (blocked) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('403 Forbidden');
  }

  let filePath = resolvedPath;
  const extname = path.extname(filePath);
  let contentType = MIME_TYPES[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>404 Not Found</h1>', 'utf-8');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${error.code}`);
      }
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': extname === '.html' ? 'no-cache' : 'public, max-age=300'
      });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`MarketingMap Server running at http://localhost:${PORT}/`);
});
