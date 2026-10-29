document.addEventListener('DOMContentLoaded', () => {

  window.sendQuickPrompt = function(promptText) {
    const ideatorInput = document.getElementById('ideator-input');
    if (ideatorInput) {
      ideatorInput.value = promptText;
      const btnDiscussIdea = document.getElementById('btn-discuss-idea');
      if (btnDiscussIdea) {
        btnDiscussIdea.click();
      }
    }
  };

  window.selectGoalChip = function(goalText) {
    const inputRevenue = document.getElementById('input-revenue');
    if (!inputRevenue) return;
    const current = inputRevenue.value.trim();
    if (!current) {
      inputRevenue.value = `${goalText} (월 예산 10만원 이하 실전 마케팅)`;
    } else if (!current.includes(goalText)) {
      inputRevenue.value = `${current}, ${goalText}`;
    }
    inputRevenue.classList.remove('highlight-flash');
    void inputRevenue.offsetWidth;
    inputRevenue.classList.add('highlight-flash');
  };

  const welcomeHtml = `
              <div class="chat-welcome-container">
                <div class="welcome-header">
                  <div class="welcome-avatar">A</div>
                  <h4>오드리 AI 마케팅 비서와 대화를 시작합니다</h4>
                  <p>홍보가 막막한 업종이나 고민을 아래 입력창에 작성하시거나,<br>추천 업종 카드를 클릭해 바로 적용 가능한 마케팅 비법을 받아보세요.</p>
                </div>
                <div class="quick-prompt-cards">
                  <button type="button" class="quick-card" onclick="window.sendQuickPrompt('동네 카페/음식점 평일 손님 유입을 늘리고 네이버 플레이스 순위를 올리는 실전 마케팅 전략 추천해줘')">
                    <div class="quick-card-icon">☕</div>
                    <div class="quick-card-text">
                      <strong>동네 카페 · 음식점 마케팅</strong>
                      <span>플레이스 상위노출 & 평일 단골 확보 비법</span>
                    </div>
                  </button>
                  <button type="button" class="quick-card" onclick="window.sendQuickPrompt('네일/뷰티/필라테스/공방 같은 1인 샵에서 광고비 없이 인스타와 당근으로 신규 예약 늘리는 법 추천해줘')">
                    <div class="quick-card-icon">💅</div>
                    <div class="quick-card-text">
                      <strong>1인 샵 · 뷰티 · 클래스 예약 늘리기</strong>
                      <span>인스타 릴스 & 당근마켓 지역 타깃 공략</span>
                    </div>
                  </button>
                  <button type="button" class="quick-card" onclick="window.sendQuickPrompt('스마트스토어 및 1인 기업이 블로그와 상세페이지 설득 구조로 구매 전환율 높이는 전략 추천해줘')">
                    <div class="quick-card-icon">📦</div>
                    <div class="quick-card-text">
                      <strong>스마트스토어 · 1인 기업 매출 상승</strong>
                      <span>블로그 키워드 유입 & 상세페이지 전환 전략</span>
                    </div>
                  </button>
                </div>
              </div>`;

  // Helper to strip HTML tags from a string
  function stripHtmlTags(str) {
    if (!str) return '';
    return str.replace(/<[^>]*>/g, '').trim();
  }

  // --- UI Elements ---
  const btnSettings = document.getElementById('btn-settings');
  const settingsModal = document.getElementById('settings-modal');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnSaveSettings = document.getElementById('btn-save-settings');
  
  const settingsProvider = document.getElementById('settings-provider');
  const settingsGeminiSection = document.getElementById('settings-gemini-section');
  const settingsOpenaiSection = document.getElementById('settings-openai-section');
  
  const settingsGeminiKey = document.getElementById('settings-gemini-key');
  const settingsGeminiModel = document.getElementById('settings-gemini-model');
  
  const settingsOpenaiKey = document.getElementById('settings-openai-key');
  const settingsOpenaiModel = document.getElementById('settings-openai-model');
  
  const engineTypeText = document.getElementById('engine-type-text');
  
  const blueprintForm = document.getElementById('blueprint-form');
  const btnGenerate = document.getElementById('btn-generate');
  
  const resultsPlaceholder = document.getElementById('results-placeholder');
  const resultsDashboard = document.getElementById('results-dashboard');
  
  const displayProjectName = document.getElementById('display-project-name');
  const displayProjectTarget = document.getElementById('display-project-target');
  
  const btnCopyJson = document.getElementById('btn-copy-json');
  const btnExportJson = document.getElementById('btn-export-json');
  const btnCopyChannelContent = document.getElementById('btn-copy-channel-content');
  
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  
  // HUD Loading Elements
  const hudLoading = document.getElementById('hud-loading');
  const hudPct = document.getElementById('hud-pct');
  const hudProgressFill = document.getElementById('hud-progress-fill');
  const hudLines = [
    document.getElementById('hud-line-1'),
    document.getElementById('hud-line-2'),
    document.getElementById('hud-line-3'),
    document.getElementById('hud-line-4'),
    document.getElementById('hud-line-5')
  ];

  // Dynamic Content Elements
  const geoQaContainer = document.getElementById('geo-qa-container');
  const seoPainPoint = document.getElementById('seo-pain-point');
  const seoKeywords = document.getElementById('seo-keywords');
  const googlePreviewSlug = document.getElementById('google-preview-slug');
  const googlePreviewTitle = document.getElementById('google-preview-title');
  const googlePreviewDesc = document.getElementById('google-preview-desc');
  const seoFunnel = document.getElementById('seo-funnel');
  
  const iaPageList = document.getElementById('ia-page-list');
  const selectedPageTitle = document.getElementById('selected-page-title');
  const selectedPageSlug = document.getElementById('selected-page-slug');
  const selectedPageSections = document.getElementById('selected-page-sections');
  
  const dbCollectionList = document.getElementById('db-collection-list');
  const selectedTableTitle = document.getElementById('selected-table-title');
  const selectedTableFields = document.getElementById('selected-table-fields');

  // --- State Variables ---
  let generatedData = null;
  let activePageData = null;
  let activeTableData = null;

  // --- Toggle Provider Sections ---
  function toggleProviderFields(provider) {
    settingsGeminiSection.classList.add('hidden');
    settingsOpenaiSection.classList.add('hidden');
    
    if (provider === 'gemini') {
      settingsGeminiSection.classList.remove('hidden');
    } else if (provider === 'openai') {
      settingsOpenaiSection.classList.remove('hidden');
    }
  }

  settingsProvider.addEventListener('change', (e) => {
    toggleProviderFields(e.target.value);
  });

  // --- Load Settings ---
  function loadSettings() {
    const provider = localStorage.getItem('ai_provider') || 'local';
    
    const geminiKey = localStorage.getItem('gemini_api_key') || '';
    let geminiModel = localStorage.getItem('gemini_model') || 'gemini-1.5-flash';
    if (geminiModel === 'gemini-3.5-flash') {
      geminiModel = 'gemini-1.5-flash';
      localStorage.setItem('gemini_model', geminiModel);
    }
    
    const openaiKey = localStorage.getItem('openai_api_key') || '';
    const openaiModel = localStorage.getItem('openai_model') || 'gpt-4o';
    
    settingsProvider.value = provider;
    
    settingsGeminiKey.value = geminiKey;
    settingsGeminiModel.value = geminiModel;
    
    settingsOpenaiKey.value = openaiKey;
    settingsOpenaiModel.value = openaiModel;
    
    toggleProviderFields(provider);
    updateEngineIndicator(provider, geminiKey, openaiKey);
  }

  function updateEngineIndicator(provider, geminiKey, openaiKey) {
    const dot = document.querySelector('.indicator-dot');
    
    if (provider === 'gemini' && geminiKey) {
      engineTypeText.textContent = 'Ready to run (Live Google Gemini AI Engine)';
      if (dot) dot.classList.add('active');
    } else if (provider === 'openai' && openaiKey) {
      engineTypeText.textContent = 'Ready to run (Live OpenAI GPT-4o AI Engine)';
      if (dot) dot.classList.add('active');
    } else {
      engineTypeText.textContent = 'Ready to run (Audrey Local Marketing Engine)';
      if (dot) dot.classList.remove('active');
    }
  }

  // --- Save Settings ---
  btnSaveSettings.addEventListener('click', () => {
    const provider = settingsProvider.value;
    
    const geminiKey = settingsGeminiKey.value.trim();
    const geminiModel = settingsGeminiModel.value;
    
    const openaiKey = settingsOpenaiKey.value.trim();
    const openaiModel = settingsOpenaiModel.value;
    
    localStorage.setItem('ai_provider', provider);
    
    localStorage.setItem('gemini_api_key', geminiKey);
    localStorage.setItem('gemini_model', geminiModel);
    
    localStorage.setItem('openai_api_key', openaiKey);
    localStorage.setItem('openai_model', openaiModel);
    
    updateEngineIndicator(provider, geminiKey, openaiKey);
    settingsModal.classList.add('hidden');
    alert('AI Engine 설정이 성공적으로 저장되었습니다!');
  });

  // Modal open/close
  btnSettings.addEventListener('click', () => settingsModal.classList.remove('hidden'));
  btnCloseModal.addEventListener('click', () => settingsModal.classList.add('hidden'));
  window.addEventListener('click', (e) => {
    if (e.target === settingsModal) settingsModal.classList.add('hidden');
  });

  // Initialize Settings
  loadSettings();

  // --- Sub-Tab Navigation inside Competitor & Own Brand Analysis ---
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.sub-tab-btn');
    if (btn) {
      const targetSubtab = btn.getAttribute('data-subtab');
      const parent = btn.closest('.glass-panel');
      if (!parent) return;
      
      parent.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      if (targetSubtab === 'market-all') {
        parent.querySelectorAll('.sub-tab-pane').forEach(p => p.classList.add('active'));
      } else {
        parent.querySelectorAll('.sub-tab-pane').forEach(p => p.classList.remove('active'));
        const subPane = document.getElementById(`subtab-content-${targetSubtab}`);
        if (subPane) subPane.classList.add('active');
      }
    }
  });

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));
      
      btn.classList.add('active');
      document.getElementById(`tab-content-${targetTab}`).classList.add('active');
    });
  });

  // --- Clean JSON Wrappers from API Output ---
  function cleanJsonString(str) {
    let cleaned = str.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.substring(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.substring(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.substring(0, cleaned.length - 3);
    }
    return cleaned.trim();
  }

  // --- Helper: Get & Set Category (with Custom '기타' Support) ---
  const inputCategorySelect = document.getElementById('input-category');
  const customCategoryGroup = document.getElementById('custom-category-group');
  const inputCategoryCustom = document.getElementById('input-category-custom');

  if (inputCategorySelect && customCategoryGroup && inputCategoryCustom) {
    inputCategorySelect.addEventListener('change', () => {
      if (inputCategorySelect.value === '기타 (직접 입력)') {
        customCategoryGroup.classList.remove('hidden');
        inputCategoryCustom.required = true;
        inputCategoryCustom.focus();
      } else {
        customCategoryGroup.classList.add('hidden');
        inputCategoryCustom.required = false;
      }
    });
  }

  function getResolvedCategory() {
    const selVal = (document.getElementById('input-category')?.value || '').trim();
    if (selVal === '기타 (직접 입력)') {
      const customVal = (document.getElementById('input-category-custom')?.value || '').trim();
      return customVal || '기타 맞춤 비즈니스';
    }
    return selVal || '외식/카페/프랜차이즈';
  }

  function setCategoryToForm(categoryStr) {
    const sel = document.getElementById('input-category');
    const grp = document.getElementById('custom-category-group');
    const cust = document.getElementById('input-category-custom');
    if (!sel || !categoryStr) return;

    const cleanCat = categoryStr.trim();
    let matched = false;
    Array.from(sel.options).forEach(opt => {
      if (opt.value === '기타 (직접 입력)') return;
      const firstToken = opt.value.split('/')[0];
      if (cleanCat === opt.value || cleanCat.includes(firstToken) || opt.value.includes(cleanCat.split('/')[0])) {
        sel.value = opt.value;
        matched = true;
      }
    });

    if (matched) {
      if (grp) grp.classList.add('hidden');
      if (cust) cust.required = false;
    } else {
      sel.value = '기타 (직접 입력)';
      if (grp) grp.classList.remove('hidden');
      if (cust) {
        cust.required = true;
        cust.value = cleanCat;
      }
    }
  }

  // --- Smart Local Marketing Consultation Generator (Industry-Deep & Non-Overlapping) ---
  function getLocalChatResponse(promptText) {
    const q = promptText.trim();
    const formBrand = (document.getElementById('input-brand')?.value || '').trim();
    const formCategory = getResolvedCategory();
    const formIdea = (document.getElementById('input-idea')?.value || '').trim();
    const formRegion = (document.getElementById('input-region')?.value || '').trim();
    const formTarget = (document.getElementById('input-target')?.value || '').trim();
    const formGoal = (document.getElementById('input-revenue')?.value || '').trim();

    // 1. Detect industry directly from the question first (to prevent stale form values from contaminating a new industry question)
    let detectedCategory = '';
    if (/병원|의원|치과|한의원|피부과|성형|안과|정형외과|내과|소아과|산부인과|이비인후과|비뇨기과|신경외과|정신과|재활|도수|약국|클리닉|헬스케어|진료|검진|환자|신환|재진|임플란트|교정|추나|다이어트한약|보톡스|리프팅|비급여|개원/.test(q)) {
      detectedCategory = '병의원/헬스케어/약국';
    } else if (/부동산|공인중개|중개|분양|건축|인테리어|시공|리모델링|상가|오피스텔|매물|임장|아파트|전세|월세|매매/.test(q)) {
      detectedCategory = '부동산/건설/인테리어';
    } else if (/제조|공장|OEM|ODM|유통|도매|납품|수출|산업|기계|설비|패키징|원자재|B2B|바이어|발주|단가|금형|부품/.test(q)) {
      detectedCategory = '제조/유통/B2B산업';
    } else if (/프랜차이즈|가맹|본사|지점|식당|음식점|고깃집|고기|삼겹살|갈비|한우|술집|이자카야|국밥|파스타|맛집|배달|요식업|외식|카페|커피|디저트|베이커리|빵/.test(q)) {
      detectedCategory = '외식/카페/프랜차이즈';
    } else if (/미용실|헤어|네일|속눈썹|왁싱|에스테틱|스파|마사지|체형관리|뷰티|살롱|웰니스|두피/.test(q)) {
      detectedCategory = '뷰티/에스테틱/웰니스';
    } else if (/필라테스|헬스|PT|요가|골프|운동|학원|교습소|공방|클래스|과외|교육|레슨|스튜디오|스포츠|독서실|스터디카페/.test(q)) {
      detectedCategory = '교육/학원/스포츠/문화';
    } else if (/스마트스토어|쇼핑몰|온라인|쿠팡|자사몰|공구|브랜드|이커머스|판매|제품|택배|D2C|상세페이지/.test(q)) {
      detectedCategory = '이커머스/브랜드/유통';
    } else if (/세무|회계|변호사|법무|노무|행정|특허|컨설팅|대행|에이전시|IT|소프트웨어|솔루션|전문직|전문서비스|SaaS/.test(q)) {
      detectedCategory = '전문서비스/컨설팅/IT';
    }

    const category = detectedCategory || formCategory || '외식/카페/프랜차이즈';
    // Only reuse form values if the form's category matches the active question's category
    const canUseFormContext = !detectedCategory || (formCategory && formCategory === detectedCategory);
    const activeFormBrand = canUseFormContext ? formBrand : '';
    const activeFormIdea = canUseFormContext ? formIdea : '';
    const activeFormRegion = canUseFormContext ? formRegion : '';
    const activeFormTarget = canUseFormContext ? formTarget : '';
    const activeFormGoal = canUseFormContext ? formGoal : '';

    // 2. Extract region from question if present
    const dongMatch = q.match(/([가-힣]{1,6}(?:동|구|역|시|군|읍|면))(?:\s|$|에서|의|에|근처|주변)/);
    const regionMatch = q.match(/(강남|서초|압구정|청담|성수|홍대|마포|연남|송파|잠실|여의도|종로|광화문|용산|이태원|건대|판교|분당|수원|일산|인천|송도|부산|해운대|서면|대구|대전|광주|제주|노원|중계|상계|하계|목동|대치|위례|동탄|광교|마곡)/);
    let extractedRegion = '';
    if (dongMatch) {
      extractedRegion = `${dongMatch[1]} 중심 상권 및 배후 주거·직장인 권역`;
    } else if (regionMatch) {
      extractedRegion = `${regionMatch[1]} 핵심 상권 및 배후 권역`;
    }

    // 3. Detect sub-concern from the question (신환/신규모객, 재진/재방문/리텐션, 검색/플레이스/SEO, 유튜브/숏폼/SNS, 비급여/객단가/브랜딩)
    let subTopic = 'general';
    if (/재방문|재진|단골|리텐션|재구매|정기|사후관리|해피콜|리콜|기존/.test(q)) {
      subTopic = 'retention';
    } else if (/유튜브|쇼츠|릴스|인스타|숏폼|영상|콘텐츠|바이럴|스레드/.test(q)) {
      subTopic = 'video_sns';
    } else if (/플레이스|순위|검색|노출|상위|SEO|지도|블로그/.test(q)) {
      subTopic = 'search_seo';
    } else if (/비급여|객단가|프리미엄|고단가|상담전환|동의율|패키지|매출/.test(q)) {
      subTopic = 'high_ticket';
    } else if (/신규|신환|초진|오픈|개원|모객|홍보|유입/.test(q)) {
      subTopic = 'acquisition';
    }

    // 4. Industry-Specific Deep Consultation Response Builder
    if (category === '병의원/헬스케어/약국') {
      // Detect specific medical department from question
      let dept = '의원·클리닉';
      let defaultBrand = activeFormBrand || '오드리 메디컬의원';
      let defaultItem = activeFormIdea || '1:1 정밀 진단 & 비수술 특화 치료 프로그램';
      let defaultTarget = activeFormTarget || '과잉 진료 없는 대표원장 직접 진료·야간/토요 진료 / 통증·질환 개선이 시급한 지역 거주민 및 직장인';

      if (/치과|임플란트|교정|충치|사랑니|스케일링|라미네이트/.test(q)) {
        dept = '치과의원';
        defaultBrand = activeFormBrand || '오드리 디지털치과의원';
        defaultItem = activeFormIdea || '3D 디지털 네비게이션 임플란트 & 통증 최소화 보존치료';
        defaultTarget = activeFormTarget || '자연치아 보존 우선 원칙 및 무통 마취 시스템 / 치과 공포증이 있거나 정밀 임플란트·교정을 찾는 환자';
      } else if (/한의원|추나|한약|다이어트한약|교통사고|침|보약|체형/.test(q)) {
        dept = '한의원';
        defaultBrand = activeFormBrand || '오드리 경희한의원';
        defaultItem = activeFormIdea || '1:1 체질 맞춤 추나요법·통증 재활 & 맞춤 한약 프로그램';
        defaultTarget = activeFormTarget || '원장 직접 추나 시술 및 야간 진료 운영 / 만성 근골격계 통증·교통사고 후유증·체질 개선 환자';
      } else if (/피부과|성형|리프팅|보톡스|필러|레이저|여드름|기미|색소|제모/.test(q)) {
        dept = '피부과·미용클리닉';
        defaultBrand = activeFormBrand || '오드리 피부과의원';
        defaultItem = activeFormIdea || '피부 정밀 진단기 기반 맞춤 레이저 리프팅 & 메디컬 스킨케어';
        defaultTarget = activeFormTarget || '정품·정량 인증샷 확인 및 1인 프라이빗 베드 / 자연스러운 안티에이징과 트러블 개선을 원하는 2050 환자';
      } else if (/정형외과|재활|통증|도수|물리치료|디스크|관절|척추/.test(q)) {
        dept = '정형외과·통증의학과';
        defaultBrand = activeFormBrand || '오드리 마취통증·정형외과의원';
        defaultItem = activeFormIdea || '비수술 척추·관절 정밀 치료 & 1:1 전담 도수·재활 클리닉';
        defaultTarget = activeFormTarget || '대학병원급 영상 진단 및 평일 야간 진료 / 거북목·디스크·만성 통증에 시달리는 직장인 및 중장년층';
      } else if (/내과|검진|위내시경|대장내시경|수액|만성질환|소아과|이비인후과|안과|산부인과/.test(q)) {
        dept = '내과·건강검진센터';
        defaultBrand = activeFormBrand || '오드리 내과·건강검진의원';
        defaultItem = activeFormIdea || '당일 위·대장 수면내시경 & 국가·종합 건강검진 및 만성질환 집중 케어';
        defaultTarget = activeFormTarget || '전문의 직접 내시경 집도 및 대학병원 빠른 진료의뢰 연계 / 정밀 검진과 만성질환 관리가 필요한 지역 주민';
      } else if (/약국|영양제|약사/.test(q)) {
        dept = '전문 상담 약국';
        defaultBrand = activeFormBrand || '오드리 건강약국';
        defaultItem = activeFormIdea || '약사 1:1 맞춤형 건기식·영양제 설계 & 복약 상담';
        defaultTarget = activeFormTarget || '증상·복용약 상호작용 정밀 체크 및 맞춤 소분 상담 / 만성 피로 및 가족 건강을 챙기는 지역 주민';
      }

      const defaultRegion = extractedRegion || activeFormRegion || '핵심 역세권 및 대단지 아파트 배후 의료 상권';

      let medicalFocusTitle = `${dept} 신환(초진) 신뢰 유입 & 예약 전환 퍼널`;
      let medicalDiagnosis = `질문해주신 **"${q}"**에 대한 **${dept} 특화 마케팅 진단**입니다.\n병의원 마케팅은 일반 매장과 달리 **'환자의 불안감 해소(전문성 검증)'**와 **'의료법 제56조(치료경험담·과장 문구 금지) 준수'**가 핵심입니다. 환자는 내원 전 평균 3~5개의 블로그 칼럼, 유튜브 쇼츠 설명, 네이버 플레이스 예약 후기를 교차 검증한 뒤 병원을 결정합니다.`;
      let medActionA1 = `**[질환·증상 질문형] 원장님 칼럼 & 유튜브 1분 의학 쇼츠**: 환자가 검색하는 '${defaultRegion.split(' ')[0]} ${defaultItem.split('&')[0].trim()} 통증/비용/원인'을 주제로, 치료 전후 사진이나 과장 광고 없이 **'증상 원인 → 진단 기준 → 치료 원리 → 예후 관리'** 순서의 의학 정보 콘텐츠를 발행해 압도적 신뢰를 구축합니다.`;
      let medActionA2 = `**네이버 플레이스 '사전 문진형 예약' 세팅**: 플레이스 예약 단계에서 환자가 불편한 부위나 희망 진료 시간을 미리 체크하게 하여 **초진 노쇼(No-Show)를 줄이고 원내 상담 동의율을 30% 이상 향상**시킵니다.`;
      let medTitleB = `${dept} 재진율(리텐션) 극대화 & 검진·사후관리 CRM 시스템`;
      let medActionB1 = `**진료 후 시간차 해피콜 & 주의사항 알림톡 자동화**: 진료 당일 저녁에는 '진료 후 주의사항 안내 카드뉴스'를, 3일 후에는 '증상 경과 확인 메시지', 3~6개월 주기에는 '정기검진/재진 리마인드 알림톡'을 발송해 평생 주치의 관계를 구축합니다.`;
      let medActionB2 = `**AI 검색(GEO) 질환 백문백답 구축**: 환자들이 챗GPT나 네이버 AI 브리핑에 자주 묻는 '${defaultItem.split('&')[0].trim()} 꼭 수술해야 하나요?', '진료 시간과 절차는 어떻게 되나요?' 문답 10선을 공식 블로그와 플레이스 안내에 구조화해 AI 추천 1순위를 선점합니다.`;

      if (subTopic === 'retention') {
        medicalFocusTitle = `${dept} 재진율·정기검진 귀환율 2배 높이는 환자 CRM 전략`;
        medicalDiagnosis = `질문해주신 **"${q}"**는 병의원 경영 안정성의 핵심입니다. 의료법상 무분별한 할인·사은품 유인은 제한되므로, **'치료 연속성 관리(임상 케어 리마인드)'**와 **'가족 주치의화'**로 재진율을 높여야 합니다.`;
        medActionA1 = `**치료 단계별 골든타임 알림톡 프로토콜**: 1회 치료 후 끝나는 환자를 막기 위해 [진료 직후 주의사항 발송 → 3일 차 경과 체크 → 14일/3개월 차 정기 체크업 예약 링크]를 자동화하여 환자가 '나를 끝까지 케어해 주는 병원'으로 인식하게 만듭니다.`;
        medActionA2 = `**네이버 예약 재진 전용 패스트트랙(대기 최소화) 운영**: 재진 환자 전용 예약 슬롯을 분리 운영하여 대기 시간을 줄여주고, 진료실 내 QR 안내로 다음 권장 내원일을 현장에서 바로 예약하도록 유도합니다.`;
      } else if (subTopic === 'video_sns') {
        medicalFocusTitle = `${dept} 원장님 유튜브 쇼츠 & 인스타 건강 카드뉴스 브랜딩`;
        medicalDiagnosis = `질문해주신 **"${q}"**는 최근 병의원 신환 유입에서 가장 강력한 채널입니다. 환자들은 딱딱한 홍보글보다 **원장님이 45초 만에 쉽게 설명해 주는 질환 상식 쇼츠/릴스**를 보고 내원을 결심합니다.`;
        medActionA1 = `**"이 증상 방치하면 큰일 납니다" 45초 문답형 의학 쇼츠**: 진료실에서 환자들이 가장 많이 묻는 질문 20가지를 뽑아, ChatGPT로 45초 대본을 짜고 Vrew로 자막을 입혀 주 2회 유튜브 쇼츠와 인스타 릴스에 동시 업로드합니다.`;
        medActionA2 = `**자가진단 체크리스트 카드뉴스 발행**: 인스타그램에 '내 증상 단계별 자가진단표(5문항)' 카드뉴스를 올려 저장(Save)과 공유를 유도하고, 프로필 링크를 네이버 사전 문진 예약으로 연결합니다.`;
      } else if (subTopic === 'high_ticket') {
        medicalFocusTitle = `${dept} 비급여·특화 클리닉 상담 동의율 & 신뢰도 향상 전략`;
        medicalDiagnosis = `질문해주신 **"${q}"**의 핵심은 환자가 병원 문을 열기 전에 이미 **우리 병원의 진단 시스템과 치료 철학에 설득되어 오도록 만드는 사전 교육(Pre-frame) 퍼널**입니다.`;
        medActionA1 = `**정밀 진단 장비 & 1:1 맞춤 프로토콜 시각화 콘텐츠**: 왜 본원의 '${defaultItem}'이 타 병원 대비 안전하고 정교한지, 진단 과정과 장비 원리를 Claude를 활용해 심층 브랜드 칼럼으로 작성하여 고관여 환자의 가격 저항을 낮춥니다.`;
        medActionA2 = `**초진 상담실 브리핑 키트 & 치료 계획서 제공**: 내원 시 구두 설명에만 의존하지 않고, 진단 결과와 단계별 치료 로드맵이 적힌 '맞춤 치료 계획서'를 제공해 상담 동의율과 치료 완주율을 높입니다.`;
      }

      const goalA = activeFormGoal || `${medicalFocusTitle} 구축 및 신환·재진 안정화`;
      const goalB = activeFormGoal || `의료법 준수 브랜드 블로그·유튜브 의학 채널 & AI 검색(GEO) 선점`;

      return `원장님(대표님), 질문해주신 **"${q}"**에 맞춰 일반 매장과 완전히 차별화된 **[${dept} 전문 메디컬 마케팅 솔루션]**을 정리해 드립니다! 🏥

${medicalDiagnosis}

---

1. **전략 A: [${medicalFocusTitle}] 실전 플랜**
- **핵심 타깃 & 포지셔닝**: ${defaultRegion} 내 ${defaultTarget}
- **메디컬 액션 1**: ${medActionA1}
- **메디컬 액션 2**: ${medActionA2}
- **생성형 AI 활용 팁**: **Claude**로 의료법 심의 기준을 준수하는 차분하고 신뢰감 있는 질환 칼럼을 작성하고, **ChatGPT + Vrew**로 45초 원장님 Q&A 쇼츠 대본과 자막 영상을 10분 만에 제작하세요.
[적용: ${defaultBrand} | ${category} | ${defaultItem} | ${defaultRegion} | ${defaultTarget} | ${goalA}]

2. **전략 B: [${medTitleB}] 플랜**
- **핵심 타깃 & 포지셔닝**: 증상 검색 고관여 초진 환자 및 정기 검진·사후 케어가 필요한 재진 환자층
- **메디컬 액션 1**: ${medActionB1}
- **메디컬 액션 2**: ${medActionB2}
- **생성형 AI 활용 팁**: **Perplexity**로 최신 의학 가이드라인·통계를 리서치해 칼럼의 전문성을 높이고, **Claude · 뤼튼(Wrtn)**으로 환자 안내 알림톡과 네이버 플레이스 진료 공지 문구를 다듬으세요.
[적용: ${defaultBrand} | ${category} | ${defaultItem} & 정기 케어 프로그램 | ${defaultRegion} | ${defaultTarget} | ${goalB}]

---
💡 **안내**: 위 전략 아래의 **[✅ 이 마케팅 전략 입력폼에 자동 채우기]** 버튼을 클릭한 뒤 하단 **[맞춤 마케팅 전략 생성하기]**를 누르시면, 우측 5개 탭 전체가 **병의원 전용 분석 데이터(질환 키워드·의료 퍼널·병원 경쟁 비교·유튜브 의학 채널 & 생성형 AI 프롬프트)**로 즉시 전환됩니다!`;
    }

    // Other industries: Build deep, non-overlapping consultation responses per industry
    const industryConfigs = {
      '부동산/건설/인테리어': {
        bizLabel: '부동산·인테리어·시공 비즈니스',
        brand: activeFormBrand || '오드리 부동산 & 인테리어 파트너스',
        item: activeFormIdea || '핵심 단지·상가 실매물 맞춤 중개 & 3D 공간 설계·책임 시공',
        region: extractedRegion || activeFormRegion || '주요 대단지 아파트 및 상업지구 핵심 거점',
        target: activeFormTarget || '100% 실매물 권리·입지 브리핑 및 투명한 공정별 견적 공개 / 실거주 이사 고객 및 상가 창업·리모델링 발주처',
        titleA: '고관여 매수·임차·시공 의뢰인 DB(리드) 확보 퍼널',
        diag: `부동산·인테리어 업종은 거래 단가가 높아 고객이 문의하기 전 **'허위매물/추가금 없는 투명성'**과 **'현장 포트폴리오 실력'**을 가장 먼저 확인합니다. 단순 매물 나열이 아닌 **입지·시공 비포애프터 영상과 심층 브리핑 칼럼**이 진성 의뢰인을 부릅니다.`,
        actA1: `**유튜브·릴스 '1분 현장 브리핑 / 랜선 임장·룸투어'**: 스마트폰 짐벌로 촬영한 실제 매물 동선과 시공 디테일(자재·수납·채광)을 60초 쇼츠로 매주 2편 업로드해 실수요자 문의를 직접 유도합니다.`,
        actA2: `**네이버 블로그 '단지·평형별 심층 분석 & 견적 가이드'**: 고객이 검색하는 '지역+단지명+평형 실거래/인테리어 비용' 키워드로 전문가 분석 글을 발행하고 하단에 '무료 방문 실측 / 1:1 맞춤 매물 추천 신청폼'을 연결합니다.`,
        titleB: 'AI 검색(GEO) 지역 전문가 선점 & 소개(리퍼럴) 자산화 플랜',
        actB1: `**계약·준공 고객 대상 '입주 체크리스트 & 사후 A/S 해피콜'**: 거래·시공 완료 후 1개월·6개월 차 점검 안부를 전해 지인 소개(리퍼럴) 계약을 2배 이상 늘립니다.`,
        actB2: `**생성형 AI 활용**: **Gemini**로 지역 개발 호재·학군·교통 데이터를 요약하고, **Claude**로 2,500자 분량의 현장 시공 스토리텔링 포스팅을 작성해 지역 내 독보적 전문가로 포지셔닝합니다.`
      },
      '제조/유통/B2B산업': {
        bizLabel: '제조·유통·B2B 산업 비즈니스',
        brand: activeFormBrand || '오드리 인더스트리 (B2B 제조·유통)',
        item: activeFormIdea || '고정밀 맞춤 제조(OEM/ODM) & 기업 전용 대량 공급·패키징 솔루션',
        region: extractedRegion || activeFormRegion || '전국 B2B 온라인 검색 포털 · 산업 전문 플랫폼 · 글로벌 바이어 채널',
        target: activeFormTarget || '자체 생산 설비 직영, 빠른 납기 및 소량 다품종(MOQ 완화) 대응 / 기업 구매 담당자·브랜드 기획자·유통 바이어',
        titleA: '기업 구매담당자·바이어 검색 유입 & 샘플·견적 발주 전환 퍼널',
        diag: `제조·유통·B2B 비즈니스는 발주권자가 구글과 네이버, 유튜브에서 **'생산 설비 레퍼런스, 납기 준수율, MOQ(최소주문수량), 단가 경쟁력'**을 검색해 거래처를 선정합니다.`,
        actA1: `**유튜브 '공장 제조 공정 & 품질 테스트 타임랩스' 공개**: 실제 생산 라인, QC(품질검수) 과정, 납품 출고 현장을 1분 쇼츠와 3분 기업 소개 영상으로 유튜브에 올려 바이어의 신뢰를 단번에 확보합니다.`,
        actA2: `**B2B 문제해결형 기술 백서 블로그 & 1분 샘플 신청 퍼널**: '업종별 OEM 제작 시 불량 줄이는 법', '소량 제작 단가 절감 가이드'를 발행하고, 즉시 다운로드 가능한 [제품 스펙 카탈로그 PDF & 무료 샘플 신청서]로 진성 리드를 수집합니다.`,
        titleB: 'AI 검색(GEO) 산업 스펙 최적화 & 정기 발주 거래처 락인(Lock-in) 플랜',
        actB1: `**샘플 발송 후 3일·7일 차 기술 피드백 콜 & 초도 발주 우대 프로모션**: 샘플만 받고 이탈하는 기업 고객에게 맞춤형 사양 변경 제안을 전달해 본계약 전환율을 극대화합니다.`,
        actB2: `**생성형 AI 활용**: **Perplexity**로 전방 산업 트렌드와 원자재·규격 데이터를 조사하고, **ChatGPT**로 산업군별 콜드메일·제안서·영문 바이어 응대 템플릿을 자동화하세요.`
      },
      '뷰티/에스테틱/웰니스': {
        bizLabel: '뷰티·에스테틱·웰니스 비즈니스',
        brand: activeFormBrand || '오드리 프리미엄 뷰티살롱',
        item: activeFormIdea || '1:1 맞춤 디자인 시술 & 프라이빗 스페셜 케어 프로그램',
        region: extractedRegion || activeFormRegion || '역세권 상업지구 및 배후 아파트 단지 상권',
        target: activeFormTarget || '100% 사전 예약제 프라이빗 케어 및 정품 프리미엄 제품 사용 / 자기관리와 힐링을 중시하는 2040 고객층',
        titleA: '시각적 Before & After 숏폼 유입 & 네이버 첫 예약 전환 플랜',
        diag: `뷰티·에스테틱 업종은 고객이 **'내 얼굴형/피부/체형 고민을 실패 없이 해결해 줄 디자이너·원장님인가'**를 인스타·유튜브 비주얼 포트폴리오와 플레이스 예약 리뷰로 판단합니다.`,
        actA1: `**유튜브 쇼츠·인스타 릴스 '고민 해결 비포&애프터 15초 영상'**: 시술 전 고객의 고민 상담 장면 3초 + 시술 디테일 + 시술 후 변화된 모습을 감각적인 숏폼으로 주 2~3회 업로드합니다.`,
        actA2: `**네이버 플레이스 '첫 방문 맞춤 진단 쿠폰' & 스타일/관리별 메뉴 세분화**: 고객이 예약할 때 고민 부위별 시술을 직관적으로 고를 수 있도록 플레이스 가격표와 포토 설명을 정교화합니다.`,
        titleB: '정기권(회원권) 전환 & 재방문 주기 알림톡 자동화 플랜',
        actB1: `**시술 주기(3주~4주) 맞춤 리마인드 & 홈케어 팁 발송**: 시술 만족도가 높은 시점에 다음 권장 관리 시기를 카카오 알림톡으로 안내하여 정기 회원권 결제율을 높입니다.`,
        actB2: `**생성형 AI 활용**: **ChatGPT + 미리캔버스**로 계절별 피부/헤어 고민 카드뉴스를 제작하고, **Claude · 뤼튼(Wrtn)**으로 고객별 정성스러운 포토리뷰 답글을 작성하세요.`
      },
      '교육/학원/스포츠/문화': {
        bizLabel: '교육·학원·피트니스·스튜디오 비즈니스',
        brand: activeFormBrand || '오드리 아카데미 & 스튜디오',
        item: activeFormIdea || '1:1 레벨 정밀 진단 클래스 & 데이터 기반 단계별 커리큘럼',
        region: extractedRegion || activeFormRegion || '대단지 아파트 학군지 및 역세권 중심 상권',
        target: activeFormTarget || '검증된 강사진의 밀착 피드백과 체계적인 성취도 리포트 제공 / 확실한 실력·체형 변화를 원하는 수강생 및 학부모',
        titleA: '학부모·수강생 신뢰 확보 & 무료 레벨테스트(체험 수업) 전환 퍼널',
        diag: `교육·학원·피트니스 업종은 등록 전 **'강사진의 전문성, 커리큘럼의 체계성, 실제 수강생의 성적/체형 변화 데이터'**를 가장 꼼꼼하게 비교합니다.`,
        actA1: `**유튜브·블로그 '수강생 실제 변화 사례 & 1타 강사 핵심 특강 클립'**: 우리 학원/스튜디오만의 티칭 노하우와 수강생 비포애프터 성장 과정을 영상과 칼럼으로 공개해 상담 문의를 이끌어냅니다.`,
        actA2: `**네이버 예약 '1:1 정밀 레벨진단 / 체험 클래스' 트립와이어 운영**: 당장 고액 수강 등록을 강요하기보다, 부담 없는 정밀 진단 수업으로 방문 문턱을 낮춘 뒤 현장 진단 결과표로 본 등록을 유도합니다.`,
        titleB: '수강생 장기 재등록(Retention) & 학부모·지인 소개 확산 플랜',
        actB1: `**월간 성장 리포트(피드백 카드) 발송으로 재등록률 90% 달성**: 매월 수강생의 변화 데이터와 다음 달 목표를 정리한 리포트를 발송해 학부모·수강생의 만족도와 입소문을 극대화합니다.`,
        actB2: `**생성형 AI 활용**: **Claude**로 학군·시기별 교육 칼럼과 학부모 안내문을 작성하고, **ChatGPT**로 주차별 커리큘럼 브리핑 자료를 체계화하세요.`
      },
      '이커머스/브랜드/유통': {
        bizLabel: '이커머스·D2C 브랜드 비즈니스',
        brand: activeFormBrand || '오드리 브랜드랩',
        item: activeFormIdea || '고객 페인포인트 해결형 시그니처 기획 상품 & 고감도 패키지',
        region: extractedRegion || activeFormRegion || '자사몰 · 네이버 스마트스토어 · 쿠팡 · 유튜브 쇼핑',
        target: activeFormTarget || '독보적인 품질 스펙과 실사용 데이터 검증 완료 / 가성비와 확실한 효능·디자인을 꼼꼼히 따지는 온라인 소비자',
        titleA: '유튜브 쇼츠·릴스 트래픽 유입 & 상세페이지 구매전환율(CVR) 극대화',
        diag: `이커머스·D2C 브랜드는 단순 광고비 지출보다 **'3초 만에 스크롤을 멈추는 문제해결형 숏폼'**과 **'이탈을 막는 상세페이지 설득 논리 + 실사용 포토리뷰'**가 ROAS(광고수익률)를 결정합니다.`,
        actA1: `**유튜브 쇼핑·인스타 릴스 '극한 비교·문제 해결 15초 영상'**: 기존 제품의 불편함을 첫 3초에 보여주고, 우리 제품으로 즉시 해결되는 장면을 시연해 자사몰/스마트스토어 유입을 폭발시킵니다.`,
        actA2: `**롱테일 검색 키워드 SEO & 상세페이지 상단 5초 GIF 배치**: 대형 키워드 대신 구매 전환율이 높은 '세부 고민+해결 키워드'로 상품명을 최적화하고 상세페이지 첫 화면에 핵심 작동 움짤을 배치합니다.`,
        titleB: '첫 구매 고객 재구매(CRM) 자동화 & AI 검색(GEO) 브랜드 추천 선점',
        actB1: `**소모·재구매 주기 맞춤 알림톡 & 베스트 리뷰어 시크릿 적립금**: 구매 후 7일 차 사용 후기 요청, 30일 차 재구매 전용 쿠폰을 자동 발송해 재구매율을 35% 이상 끌어올립니다.`,
        actB2: `**생성형 AI 활용**: **ChatGPT**로 숏폼 후킹 카피 20선과 상세페이지 설득 구조를 기획하고, **Perplexity**로 경쟁사 리뷰 불만 사항을 분석해 우리 제품의 소구점으로 전환하세요.`
      },
      '전문서비스/컨설팅/IT': {
        bizLabel: '전문서비스·컨설팅·IT 비즈니스',
        brand: activeFormBrand || '오드리 파트너스 그룹',
        item: activeFormIdea || '기업·의뢰인 맞춤형 정밀 진단 컨설팅 & 원스톱 실무 솔루션',
        region: extractedRegion || activeFormRegion || '전국 온라인 상담 채널 · 링크드인 · 유튜브 · 포털 검색',
        target: activeFormTarget || '풍부한 성공 레퍼런스와 전담 전문가 1:1 밀착 대응 / 검증된 문제해결 파트너를 찾는 기업 대표 및 고관여 의뢰인',
        titleA: '전문가 권위(Authority) 구축 & 무료 사전 진단 리드마그넷 퍼널',
        diag: `세무·법무·노무·컨설팅·IT 등 전문서비스 업종은 의뢰인이 계약 전 **'내 업종과 사건/프로젝트를 가장 잘 아는 전문가인가'**를 칼럼과 유튜브 해설 영상으로 검증합니다.`,
        actA1: `**유튜브·블로그 '실제 해결 사례(Case Study) & 최신 제도/트렌드 해설'**: 의뢰인이 가장 헷갈려하는 핵심 쟁점을 케이스 스터디 형태로 풀어내어 검색 유입과 전문가 신뢰를 동시에 확보합니다.`,
        actA2: `**'무료 자가진단 체크리스트 PDF / 15분 사전 진단 신청' 리드마그넷**: 블로그와 유튜브 설명란에 무료 진단 신청 링크를 고정해 진성 의뢰인 DB를 자동으로 수집합니다.`,
        titleB: 'AI 검색(GEO) 전문가 인용 1순위 선점 & 연간 자문(리테이너) 전환 플랜',
        actB1: `**단발성 의뢰 고객을 월간 정기 자문(구독형) 파트너로 전환**: 초기 프로젝트 완료 시 연간 관리 로드맵과 정기 브리핑 혜택을 제안해 안정적인 고정 매출(MRR)을 구축합니다.`,
        actB2: `**생성형 AI 활용**: **Perplexity + Claude**로 최신 법령·시장 데이터 기반의 고품격 백서·칼럼을 작성하고, **ChatGPT**로 잠재 고객 대상 뉴스레터와 제안서를 자동화하세요.`
      },
      '외식/카페/프랜차이즈': {
        bizLabel: '외식·카페·프랜차이즈 비즈니스',
        brand: activeFormBrand || '오드리고깃집',
        item: activeFormIdea || '14일 저온숙성 통삼겹·목살 한판 & 한우 된장찌개 세트',
        region: extractedRegion || activeFormRegion || '서울 노원구 중계동 은행사거리 학원가·아파트 배후 상권',
        target: activeFormTarget || '직원이 직접 구워주는 그릴링 서비스 및 쾌적한 단체석 완비 / 주말 가족 외식 및 중계동 주민·모임 고객',
        titleA: '네이버 플레이스 상권 1페이지 장악 & 유튜브·릴스 시그니처 바이럴',
        diag: `외식·카페·프랜차이즈 업종은 **'네이버 플레이스 검색 시 상위 노출 + 압도적인 시그니처 비주얼 숏폼 + 재방문 쿠폰 가두리'** 3박자가 맞물려야 광고비 없이도 웨이팅이 생깁니다.`,
        actA1: `**네이버 플레이스 [지역+모임/메뉴 목적] 세부 키워드 & 고화질 시그니처 컷 세팅**: 단순 맛집 키워드뿐 아니라 '${(extractedRegion || activeFormRegion || '중계동').split(' ')[0]} 가족외식', '단체모임', 대표 메뉴 키워드를 상세설명과 메뉴명에 집중 배치합니다.`,
        actA2: `**유튜브 쇼츠·인스타 릴스 'ASMR 조리/그릴링 15초 영상' & 당근 이웃 쿠폰**: 가장 먹음직스러운 조리 순간을 15초 영상으로 배포하고, 당근마켓과 플레이스 알림받기로 첫 방문 쿠폰을 제공해 즉시 방문을 유도합니다.`,
        titleB: '첫 방문 손님 2주 내 재방문 자동화 & 세트 객단가 상승 플랜',
        actB1: `**영수증 포토리뷰 이벤트 + 2회차 방문 전용 시크릿 쿠폰 결합**: 방문 당일 사진 리뷰 작성 시 즉석 혜택을 드리고, 14일 내 재방문 시 쓸 수 있는 프리미엄 사이드 쿠폰을 증정해 단골로 정착시킵니다.`,
        actB2: `**생성형 AI 활용**: **ChatGPT + Vrew**로 쇼츠 먹방·조리 대본과 자막을 빠르게 제작하고, **Claude · 뤼튼(Wrtn)**으로 AEO·GEO 최적화 지역 블로그 원고와 정성 리뷰 답글을 무한 생성하세요.`
      }
    };

    const cfg = industryConfigs[category] || {
      bizLabel: `${category} 맞춤 비즈니스`,
      brand: activeFormBrand || '오드리 비즈니스 파트너스',
      item: activeFormIdea || '핵심 타깃 맞춤형 시그니처 상품·서비스 라인업',
      region: extractedRegion || activeFormRegion || '핵심 오프라인 상권 및 온라인 통합 채널',
      target: activeFormTarget || '독보적인 전문성과 체계적인 고객 맞춤 케어 / 실패 없는 선택을 원하는 핵심 타깃 고객층',
      titleA: `${category} 맞춤형 신규 고객 유입 & 첫 전환율 극대화 플랜`,
      diag: `질문해주신 **"${q}"**에 맞춰 **${category}** 업종의 고객 의사결정 구조에 최적화된 실전 마케팅 해법을 설계했습니다.`,
      actA1: `**유튜브 쇼츠·블로그 '고객 핵심 고민 해결형 콘텐츠' 발행**: 타깃 고객이 가장 궁금해하는 핵심 문제와 우리 비즈니스만의 해결 과정을 숏폼 영상과 검색 최적화 칼럼으로 배포합니다.`,
      actA2: `**네이버 플레이스·공식 채널 '첫 이용 웰컴 혜택' 고정**: 유입된 잠재 고객이 망설이지 않고 문의·예약하도록 첫 방문(첫 문의) 전용 혜택을 전면 배치합니다.`,
      titleB: `AI 검색(GEO) 추천 선점 & 평생 단골 리텐션 시스템 구축`,
      actB1: `**이용 후 만족도 체크 & 재방문(재계약) 리마인드 루프**: 첫 이용 고객에게 맞춤형 사후 안내와 재이용 혜택을 제공해 광고비 없이도 매출이 쌓이는 자산화 구조를 완성합니다.`,
      actB2: `**생성형 AI 활용**: **ChatGPT·Claude·Gemini·Perplexity**를 조합해 채널별 맞춤형 원고와 영상 대본을 다각도로 생성·확장하세요.`
    };

    const goal1 = activeFormGoal || `${cfg.titleA} 달성 및 매출 성장`;
    const goal2 = activeFormGoal || `${cfg.titleB} 완성`;

    return `대표님, 질문해주신 **"${q}"**에 맞춰 **${cfg.bizLabel} 특화 실전 마케팅 솔루션**을 정리해 드립니다! 💡

${cfg.diag}

---

1. **전략 A: [${cfg.titleA}] 즉시 실행 플랜**
- **핵심 타깃 & 포지셔닝**: ${cfg.region} 내 ${cfg.target}
- **실전 액션 1**: ${cfg.actA1}
- **실전 액션 2**: ${cfg.actA2}
[적용: ${cfg.brand} | ${category} | ${cfg.item} | ${cfg.region} | ${cfg.target} | ${goal1}]

2. **전략 B: [${cfg.titleB}] 플랜**
- **핵심 타깃 & 포지셔닝**: AI 검색(챗GPT·네이버 AI 브리핑) 유입 고객 및 장기 단골·고단가 고객층
- **실전 액션 1**: ${cfg.actB1}
- **실전 액션 2**: ${cfg.actB2}
[적용: ${cfg.brand} | ${category} | ${cfg.item} & 프리미엄 패키지 | ${cfg.region} | ${cfg.target} | ${goal2}]

---
💡 **팁**: 위 추천안 아래의 **[✅ 이 마케팅 전략 입력폼에 자동 채우기]** 버튼을 누른 뒤 하단 **[맞춤 마케팅 전략 생성하기]**를 클릭하시면, 우측 5개 탭 전체가 **${category} 전용 분석 데이터 및 유튜브·생성형 AI 활용 프롬프트**로 즉시 생성됩니다!`;
  }

  // --- AI Ideator Discuss Action ---
  const btnDiscussIdea = document.getElementById('btn-discuss-idea');
  const ideatorInput = document.getElementById('ideator-input');
  const ideatorResponse = document.getElementById('ideator-response');

  ideatorInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      btnDiscussIdea.click();
    }
  });

  btnDiscussIdea.addEventListener('click', async () => {
    const promptText = ideatorInput.value.trim();
    if (!promptText) return;

    const isLoggedIn = localStorage.getItem('is_logged_in') === 'true';
    let guestChatCount = parseInt(localStorage.getItem('guest_chat_count') || '0', 10);
    if (!isLoggedIn && guestChatCount >= 2) {
      window.pendingChatPrompt = promptText;
      showLoginModal('💬 오드리 AI 마케팅 비서와의 무제한 1:1 상담은 <strong>무료 회원 전용</strong>입니다.<br>3초 간편가입 후 질문에 대한 전문 답변을 즉시 확인하세요!', 'register');
      return;
    }

    if (ideatorResponse.innerHTML.includes('chat-welcome-container')) {
      ideatorResponse.innerHTML = '';
    }

    const userBubble = document.createElement('div');
    userBubble.className = 'chat-bubble user';
    userBubble.innerHTML = `<div class="chat-bubble-content">${promptText}</div>`;
    ideatorResponse.appendChild(userBubble);
    
    const loadingBubble = document.createElement('div');
    loadingBubble.className = 'chat-bubble ai';
    loadingBubble.innerHTML = `
      <div class="chat-bubble-header">Audrey</div>
      <div class="chat-bubble-content"><span class="animate-pulse">업종과 상권에 맞는 실전 마케팅 솔루션을 분석 중입니다...</span></div>
    `;
    ideatorResponse.appendChild(loadingBubble);
    ideatorResponse.scrollTop = ideatorResponse.scrollHeight;

    ideatorInput.value = '';

    btnDiscussIdea.disabled = true;
    btnDiscussIdea.style.opacity = '0.7';

    const provider = localStorage.getItem('ai_provider') || 'local';
    const geminiKey = localStorage.getItem('gemini_api_key');
    const geminiModel = localStorage.getItem('gemini_model') || 'gemini-1.5-flash';
    const openaiKey = localStorage.getItem('openai_api_key');
    const openaiModel = localStorage.getItem('openai_model') || 'gpt-4o';

    const systemPrompt = `너는 30년 경력의 대한민국 최정상 비즈니스 마케팅 컨설턴트 '오드리(Audrey)'다.
대표님의 마케팅 고민이나 업종 질문(외식, 프랜차이즈, 병의원, 부동산, 제조, 이커머스, 뷰티, 교육, 전문서비스 및 기타 모든 업종)에 대해, 적은 비용으로 매출과 신규 고객·거래처를 늘릴 수 있는 실전 마케팅 컨셉 3가지를 추천해줘.
각 추천안마다 아래 항목을 명확히 정리해줘:
- **추천 상호/컨셉**: (브랜드 예시 및 핵심 포지셔닝)
- **주력 상품 및 강점**: (고객이 찾아오게 만드는 대표 상품/서비스와 차별점)
- **핵심 공략 채널 & 실행 비법**: (네이버 플레이스, 검색 SEO, 블로그, 인스타 릴스, 유튜브, B2B 리드 등 구체적 실행법)

그리고 사용자가 이 전략을 바로 아래 입력 폼에 원클릭으로 넣을 수 있도록, 각 추천안 바로 아래에 반드시 다음 포맷으로 한 줄을 추가해줘:
[적용: 상호명 예시 | 업종분류(외식/카페/프랜차이즈, 병의원/헬스케어/약국, 부동산/건설/인테리어, 제조/유통/B2B산업, 이커머스/브랜드/유통, 뷰티/에스테틱/웰니스, 교육/학원/스포츠/문화, 전문서비스/컨설팅/IT, 또는 구체적 업종명) | 주력 메뉴·상품·서비스 | 지역(상권) 또는 판매채널 | 우리 비즈니스 강점 및 주요 고객층 | 핵심 마케팅 목표 및 예산]

HTML 태그는 포함하지 말고 친절하고 전문성 있게 한국어로 답변해줘.`;

    try {
      let content = '';
      if (provider === 'gemini' && geminiKey) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt + '\n\n사장님 질문: ' + promptText }] }],
            generationConfig: { temperature: 0.7 }
          })
        });
        if (!response.ok) throw new Error('Gemini API 호출 실패');
        const resJson = await response.json();
        content = resJson.candidates[0].content.parts[0].text;
      } else if (provider === 'openai' && openaiKey) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiKey}`
          },
          body: JSON.stringify({
            model: openaiModel,
            temperature: 0.7,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: promptText }
            ]
          })
        });
        if (!response.ok) throw new Error('OpenAI API 호출 실패');
        const resJson = await response.json();
        content = resJson.choices[0].message.content;
      } else {
        await new Promise(resolve => setTimeout(resolve, 700));
        content = getLocalChatResponse(promptText);
      }

      loadingBubble.querySelector('.chat-bubble-content').innerHTML = formatTextToHtml(content);

      if (!activeChatId) {
        activeChatId = 'chat_' + new Date().getTime();
        const shortTitle = promptText.length > 14 ? promptText.substring(0, 13) + '...' : promptText;
        chatSessions.unshift({
          id: activeChatId,
          title: shortTitle,
          messages: []
        });
      }
      
      const session = chatSessions.find(s => s.id === activeChatId);
      if (session) {
        session.messages.push({ role: 'user', content: promptText });
        session.messages.push({ role: 'ai', content: content });
        saveChatSessions();
        renderChatHistoryList();
      }

      if (!isLoggedIn) {
        guestChatCount++;
        localStorage.setItem('guest_chat_count', guestChatCount.toString());
      }
    } catch (err) {
      console.error(err);
      loadingBubble.querySelector('.chat-bubble-content').textContent = `오류 발생: ${err.message}. 설정을 확인하시거나 기본 로컬 모드를 이용해 주세요.`;
    } finally {
      btnDiscussIdea.disabled = false;
      btnDiscussIdea.style.opacity = '1';
      ideatorResponse.scrollTop = ideatorResponse.scrollHeight;
    }
  });

  // Global handler for applying marketing strategy to the form
  window.applyIdeaToForm = function(button) {
    const brand = stripHtmlTags(button.getAttribute('data-brand') || '');
    const category = stripHtmlTags(button.getAttribute('data-category') || '');
    const idea = stripHtmlTags(button.getAttribute('data-idea') || '');
    const region = stripHtmlTags(button.getAttribute('data-region') || '');
    const target = stripHtmlTags(button.getAttribute('data-target') || '');
    const revenue = stripHtmlTags(button.getAttribute('data-revenue') || '');

    const inputBrand = document.getElementById('input-brand');
    const inputCategory = document.getElementById('input-category');
    const inputCategoryCustomEl = document.getElementById('input-category-custom');
    const inputIdea = document.getElementById('input-idea');
    const inputRegion = document.getElementById('input-region');
    const inputTarget = document.getElementById('input-target');
    const inputRevenue = document.getElementById('input-revenue');

    if (inputBrand && brand) inputBrand.value = brand;
    if (category) {
      setCategoryToForm(category);
    }
    if (inputIdea) inputIdea.value = idea;
    if (inputRegion && region) inputRegion.value = region;
    if (inputTarget) inputTarget.value = target;
    if (inputRevenue) inputRevenue.value = revenue;

    [inputBrand, inputCategory, inputCategoryCustomEl, inputIdea, inputRegion, inputTarget, inputRevenue].forEach(input => {
      if (!input) return;
      input.classList.remove('highlight-flash');
      void input.offsetWidth;
      input.classList.add('highlight-flash');
    });

    const formEl = document.getElementById('blueprint-form');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  let activeChatId = null;
  let chatSessions = JSON.parse(localStorage.getItem('chat_sessions') || '[]');

  function saveChatSessions() {
    localStorage.setItem('chat_sessions', JSON.stringify(chatSessions));
  }

  function renderChatHistoryList(query = '') {
    const list = document.getElementById('chat-history-list');
    if (!list) return;
    list.innerHTML = '';
    
    const filtered = chatSessions.filter(s => s.title.toLowerCase().includes(query.toLowerCase()));
    
    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'ideator-welcome';
      empty.style.padding = '8px 0';
      empty.style.fontSize = '10px';
      empty.textContent = '대화 없음';
      list.appendChild(empty);
      return;
    }
    
    filtered.forEach(session => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = `chat-history-item${session.id === activeChatId ? ' active' : ''}`;
      item.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <span class="chat-history-title sidebar-text">${session.title}</span>
      `;
      item.addEventListener('click', () => loadChatSession(session.id));
      list.appendChild(item);
    });
  }

  function loadChatSession(id) {
    activeChatId = id;
    const session = chatSessions.find(s => s.id === id);
    if (session) {
      const responseBox = document.getElementById('ideator-response');
      if (responseBox) {
        responseBox.innerHTML = '';
        session.messages.forEach(msg => {
          if (msg.role === 'user') {
            const userBubble = document.createElement('div');
            userBubble.className = 'chat-bubble user';
            userBubble.innerHTML = `<div class="chat-bubble-content">${msg.content}</div>`;
            responseBox.appendChild(userBubble);
          } else {
            const aiBubble = document.createElement('div');
            aiBubble.className = 'chat-bubble ai';
            aiBubble.innerHTML = `
              <div class="chat-bubble-header">Audrey</div>
              <div class="chat-bubble-content">${formatTextToHtml(msg.content)}</div>
            `;
            responseBox.appendChild(aiBubble);
          }
        });
        responseBox.scrollTop = responseBox.scrollHeight;
      }
      renderChatHistoryList();
    }
  }

  // Sidebar Collapse Toggle
  const sidebar = document.getElementById('app-sidebar');
  const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
  if (btnToggleSidebar && sidebar) {
    btnToggleSidebar.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
    });
  }

  // New Chat Click
  const btnNewChat = document.getElementById('btn-new-chat');
  if (btnNewChat) {
    btnNewChat.addEventListener('click', () => {
      const executeNewChat = () => {
        activeChatId = null;
        const responseBox = document.getElementById('ideator-response');
        if (responseBox) {
          responseBox.innerHTML = welcomeHtml;
        }
        renderChatHistoryList();
      };

      const isLoggedIn = localStorage.getItem('is_logged_in') === 'true';
      if (!isLoggedIn) {
        window.pendingNewChatAction = executeNewChat;
        showLoginModal('새 마케팅 상담을 시작하려면 로그인이 필요합니다.');
      } else {
        executeNewChat();
      }
    });
  }

  // Chat History Search
  const chatSearch = document.getElementById('chat-search');
  if (chatSearch) {
    chatSearch.addEventListener('input', (e) => {
      renderChatHistoryList(e.target.value);
    });
  }

  function formatTextToHtml(text) {
    let html = text.trim()
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/- (.*?)(<br>|$)/g, '<li>$1</li>');
      
    if (html.includes('<li>')) {
      html = html.replace(/(<li>.*?<\/li>)/g, '<ul>$1</ul>');
      html = html.replace(/<\/ul>(\s*?)<ul>/g, '');
    }

    // Parse 6-part [적용: 상호명 | 업종 | 주력상품 | 지역 | 강점/타깃 | 마케팅목표]
    const apply6Regex = /\[적용:\s*([^|\]]+?)\s*\|\s*([^|\]]+?)\s*\|\s*([^|\]]+?)\s*\|\s*([^|\]]+?)\s*\|\s*([^|\]]+?)\s*\|\s*([^|\]]+?)\s*\]/g;
    html = html.replace(apply6Regex, (match, brand, category, idea, region, target, revenue) => {
      const esc = (s) => s.replace(/"/g, '&quot;').replace(/'/g, '&#39;').trim();
      return `<button type="button" class="btn-apply-idea-inline" data-brand="${esc(brand)}" data-category="${esc(category)}" data-idea="${esc(idea)}" data-region="${esc(region)}" data-target="${esc(target)}" data-revenue="${esc(revenue)}" onclick="window.applyIdeaToForm(this)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 12px; height: 12px; margin-right: 4px; display: inline-block; vertical-align: middle;">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        이 마케팅 전략 입력폼에 자동 채우기
      </button>`;
    });

    // Backward-compatible 3-part [적용: 아이디어 | 타깃 | 수익모델]
    const apply3Regex = /\[적용:\s*([^|\]]+?)\s*\|\s*([^|\]]+?)\s*\|\s*([^|\]]+?)\s*\]/g;
    html = html.replace(apply3Regex, (match, idea, target, revenue) => {
      const esc = (s) => s.replace(/"/g, '&quot;').replace(/'/g, '&#39;').trim();
      return `<button type="button" class="btn-apply-idea-inline" data-brand="우리 매장" data-category="기타 동네매장/로컬서비스" data-idea="${esc(idea)}" data-region="지역 상권 및 온라인" data-target="${esc(target)}" data-revenue="${esc(revenue)}" onclick="window.applyIdeaToForm(this)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 12px; height: 12px; margin-right: 4px; display: inline-block; vertical-align: middle;">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        이 전략 적용하기
      </button>`;
    });

    return html;
  }

  // --- Industry-Specialized Marketing Strategy & Generative AI Blueprint Generator ---
  function getLocalBlueprint(brand, category, idea, region, target, revenue) {
    const cleanBrand = stripHtmlTags(brand) || '오드리고깃집';
    const cleanCategory = stripHtmlTags(category) || '외식/카페/프랜차이즈';
    const cleanIdea = stripHtmlTags(idea) || '14일 저온숙성 통삼겹·목살 한판 & 한우 된장찌개 세트';
    const cleanRegion = stripHtmlTags(region) || '서울 노원구 중계동 은행사거리 학원가·아파트 배후 상권';
    const cleanTarget = stripHtmlTags(target) || '직원이 직접 구워주는 그릴링 서비스 / 주말 가족 외식 및 중계동 주민';
    const cleanGoal = stripHtmlTags(revenue) || '네이버 플레이스 상위노출 및 단골 재방문율 상승';

    const regionWords = cleanRegion.replace(/[(),/]/g, ' ').split(/\s+/).filter(Boolean);
    const shortRegion = regionWords.find(w => w.endsWith('동') || w.endsWith('역') || w.endsWith('구') || w.endsWith('시') || w.includes('스토어') || w.includes('온라인') || w.includes('전국')) || regionWords[0] || '핵심상권';

    const itemWords = cleanIdea.split(/[&,+/·]/).map(s => s.trim()).filter(Boolean);
    const mainItem = itemWords[0] || cleanIdea;
    const secondItem = itemWords[1] || '맞춤 특화 프로그램';
    const coreStrength = cleanTarget.split('/')[0].trim() || cleanTarget;

    // Resolve normalized industry key from category + brand + idea
    const combinedText = `${cleanCategory} ${cleanBrand} ${cleanIdea}`;
    let indKey = 'fnb';
    if (cleanCategory.includes('병의원') || /병원|의원|치과|한의원|피부과|성형|안과|정형외과|내과|소아과|산부인과|이비인후과|약국|클리닉|헬스케어|검진|임플란트|추나|도수/.test(combinedText)) {
      indKey = 'medical';
    } else if (cleanCategory.includes('부동산') || /부동산|공인중개|분양|건축|인테리어|시공|리모델링|매물/.test(combinedText)) {
      indKey = 'realestate';
    } else if (cleanCategory.includes('제조') || /제조|공장|OEM|ODM|도매|납품|수출|산업|기계|설비|패키징|원자재|B2B/.test(combinedText)) {
      indKey = 'b2b';
    } else if (cleanCategory.includes('이커머스') || /스마트스토어|쇼핑몰|쿠팡|자사몰|이커머스|D2C/.test(combinedText)) {
      indKey = 'ecommerce';
    } else if (cleanCategory.includes('뷰티') || /미용실|헤어|네일|속눈썹|왁싱|에스테틱|스파|마사지|뷰티|살롱|웰니스/.test(combinedText)) {
      indKey = 'beauty';
    } else if (cleanCategory.includes('교육') || /필라테스|헬스|PT|요가|골프|학원|교습소|공방|클래스|교육|레슨|스튜디오|스포츠/.test(combinedText)) {
      indKey = 'edu';
    } else if (cleanCategory.includes('전문서비스') || /세무|회계|변호사|법무|노무|행정|특허|컨설팅|에이전시|IT|소프트웨어|솔루션|SaaS/.test(combinedText)) {
      indKey = 'pro';
    } else if (cleanCategory.includes('외식') || cleanCategory.includes('음식점') || /식당|고깃집|고기|카페|베이커리|프랜차이즈|맛집/.test(combinedText)) {
      indKey = 'fnb';
    } else {
      indKey = 'custom';
    }

    // Industry-specific metadata for SEO, GEO, Funnel, Market Analysis, and 4-Week Plan
    const profiles = {
      medical: {
        customerTerm: '환자분',
        actionTerm: '초진 내원 및 진료 예약',
        retentionTerm: '정기검진 및 재진 케어',
        complianceNote: '의료법 제56조(치료경험담·과장문구·환자유인 금지) 심의 기준을 철저히 준수하며 의학적 팩트와 진단 시스템을 강조',
        painPoint: `[${cleanRegion}] 권역에서 "${cleanIdea}" 진료를 알아보는 환자분들은 '과잉 진료에 대한 불안감 해소'와 '믿고 맡길 수 있는 주치의의 전문성(${cleanTarget})'을 가장 중요하게 생각합니다. 현재 핵심 목표인 "${cleanGoal}" 달성을 위해서는 단순 홍보가 아니라, 증상 검색 단계부터 '${cleanBrand}'의 정밀 진단 프로토콜과 의료진의 진료 철학이 의학 칼럼과 유튜브 쇼츠로 신뢰감 있게 증명되어야 합니다.`,
        keywords: [
          `${shortRegion} ${mainItem}`,
          `${shortRegion} ${cleanBrand.replace(/의원|병원|치과|한의원/g, '')} 잘하는곳`,
          `${cleanBrand}`,
          `${mainItem} 원인 및 치료과정`,
          `${shortRegion} 야간진료 병원`,
          `${shortRegion} ${secondItem}`,
          `${mainItem} 비수술 정밀진단`,
          `${shortRegion} 토요일진료 예약`
        ],
        metaTitle: `${cleanBrand} | ${shortRegion} ${mainItem}·${secondItem} 중점 진료 (${coreStrength})`,
        metaDesc: `${cleanRegion} ${cleanBrand}입니다. ${cleanIdea} 분야의 체계적인 정밀 진단과 ${cleanTarget} 맞춤 진료 시스템을 네이버 예약과 공식 채널에서 확인하세요.`,
        geoQa: [
          {
            q: `${cleanRegion} 근처에서 과잉 진료 없이 ${mainItem} 꼼꼼하게 진료하는 병의원 추천해줘.`,
            a: `${cleanRegion}에서 '${cleanIdea}' 중점 진료를 제공하는 '${cleanBrand}'을(를) 추천합니다. ${cleanTarget} 원칙을 바탕으로 환자 개개인의 증상 원인을 정밀하게 진단하고 맞춤 치료 계획을 제시해 환자분들의 신뢰도가 높습니다.`
          },
          {
            q: `${cleanBrand}의 주력 진료 분야와 타 병원 대비 의료 시스템 차별점은 무엇인가요?`,
            a: `'${cleanBrand}'은(는) '${cleanIdea}'에 특화된 진단·치료 프로토콜을 갖추고 있으며, 특히 '${coreStrength}' 강점을 통해 초진 상담부터 사후 경과 관찰까지 체계적인 주치의 케어를 제공합니다.`
          },
          {
            q: `${mainItem} 증상이 있을 때 방치하면 어떻게 되며, 어떤 진단을 받아야 하나요?`,
            a: `초기 증상을 방치할 경우 만성화되거나 치료 기간이 길어질 수 있으므로, '${cleanBrand}'과(와) 같이 정밀 진단 장비와 임상 노하우를 갖춘 의료기관에서 정확한 원인 감별 진단을 먼저 받아보시는 것이 권장됩니다.`
          },
          {
            q: `${cleanBrand} 초진 예약 방법과 야간·주말 진료 안내가 궁금해요.`,
            a: `네이버 스마트플레이스에서 '${cleanBrand}' 검색 후 [네이버 예약]을 통해 원하시는 날짜와 증상 문진을 미리 남겨주시면 대기 시간을 최소화하여 쾌적하게 진료받으실 수 있습니다.`
          },
          {
            q: `진료 후 사후 관리나 정기 검진 안내는 어떻게 진행되나요?`,
            a: `'${cleanBrand}'에서는 진료 후 회복 및 관리 주의사항을 알림톡으로 상세히 안내해 드리며, 증상 재발 방지를 위한 주기별 경과 체크 및 정기 검진 리마인드 시스템을 운영하고 있습니다.`
          }
        ],
        funnel: [
          {
            step: "1. 계기(Trigger) 단계 : 소비자가 SNS에서 서비스를 만날 계기",
            action: `유튜브 쇼츠·인스타그램·당근마켓에 환자가 평소 겪는 초기 증상과 잘못된 건강 상식을 짚어주는 '${mainItem} 자가진단 체크리스트 & 원장님 1분 의학 쇼츠'를 발행하여, 소비자가 SNS에서 자연스럽게 '${cleanBrand}'을(를) 발견하고 진료 필요성을 자각하는 첫 계기를 만듭니다.`
          },
          {
            step: "2. 목표(Target) 단계 : 포털이나 AI에 검색하고 질문하는 단계",
            action: `SNS 콘텐츠로 관심이 생긴 환자가 네이버·구글 포털이나 ChatGPT·Perplexity·네이버 AI 브리핑에 '${shortRegion} ${mainItem}', '${shortRegion} 과잉진료 없는 병원 추천' 등을 검색하고 질문할 때 '${cleanBrand}'이(가) 최상단 목표 대안으로 노출되도록 SEO·AEO·GEO 문답을 세팅합니다.`
          },
          {
            step: "3. 생각(Thinking) 단계 : 브랜드를 검증하는 단계",
            action: `검색을 통해 유입된 환자가 공식 브랜드 블로그의 질환별 정밀 진단 칼럼, 스마트플레이스의 '${coreStrength}' 진료 시스템 및 의료진 약력, 실제 내원 환자의 네이버 예약 후기를 비교·검토하며 불안감과 의구심을 해소하고 본원의 전문성을 확신하게 만듭니다.`
          },
          {
            step: "4. 실행(Action) 단계 : 서비스를 구매하는 단계",
            action: `검증을 마친 환자가 망설이지 않고 내원 행동을 즉시 실행하도록 네이버 플레이스 [사전 문진형 빠른 예약]과 대기 최소화 패스트트랙, 초진 1:1 맞춤 치료 계획 브리핑이라는 명확한 행동 트리거 장치를 작동시킵니다.`
          },
          {
            step: "5. 자기성찰(Introspection) 단계 : 후기를 작성하는 단계",
            action: `진료 후 당일 주의사항 알림톡과 3일 차 경과 안부 해피콜로 세심한 케어를 체감한 환자가 '이 병원을 선택하길 정말 잘했다'고 스스로 확신(자기성찰)하여, 네이버 영수증 리뷰와 지역 커뮤니티에 자발적인 추천 후기를 남기고 가족 주치의로 정착하게 만듭니다.`
          }
        ],
        posMap: {
          xLeft: "단순 공장형·대기 긴 진료",
          xRight: "1:1 정밀 진단·특화 클리닉",
          yTop: "의학 칼럼·유튜브·AI검색 선점",
          yBottom: "단순 간판·오프라인 내원 의존",
          comps: [
            { name: "대형 네트워크 병원", x: 38, y: 74 },
            { name: "인근 일반 의원", x: 26, y: 30 },
            { name: "대학·종합병원", x: 75, y: 28 }
          ]
        },
        compTable: {
          features: [
            `${mainItem} 맞춤 정밀 진단 프로토콜`,
            `${coreStrength} 환자 중심 진료 시스템`,
            "네이버 사전 문진 예약 & 대기 최소화",
            "진료 후 알림톡 케어 & 정기검진 리콜"
          ],
          comps: [
            { name: "인근 일반 의원", values: [false, false, false, true] },
            { name: "대형 공장형 병원", values: [false, false, true, false] }
          ]
        },
        swot: {
          s: [`'${cleanIdea}'에 특화된 정밀 진단 및 맞춤형 치료 프로토콜 보유`, `${cleanTarget} 환자의 불안감을 해소하는 꼼꼼한 설명과 진료 시스템`],
          w: [`대형 네트워크 병원 대비 초기 온라인 질환 키워드 노출량 부족`, `진료 시간 외 의료진 직접 콘텐츠 제작 시간 확보의 한계 (생성형 AI로 해결)`],
          o: [`${shortRegion} 권역 내 '${mainItem}' 및 비수술·예방 관리 검색 수요 급증`, `유튜브 의학 쇼츠 및 AI 검색(GEO) 질환 문답을 통한 고신뢰 신환 유입 기회`],
          t: [`무분별한 저가 비급여 덤핑 광고 병원의 유입`, `의료광고 심의 규정 강화에 따른 정교한 준법 브랜딩 필수`]
        },
        stp: {
          seg: `${cleanRegion} 권역의 의료 소비자를 ①단순 저가/거리 우선형, ②대형병원 선호형, ③정밀 진단·주치의 맞춤 케어 선호형으로 세분화`,
          tar: `${cleanTarget} 중 과잉 진료 없이 정확한 원인 치료와 사후 관리를 원하는 고신뢰 환자층 집중 공략`,
          pos: `"${shortRegion}에서 ${mainItem} 진료가 필요할 때 가장 먼저 신뢰하고 찾는 주치의, ${cleanBrand}"`
        },
        tss: {
          tam: { value: "월 22,000명+", desc: `${cleanRegion} 권역 내 관련 증상·질환 키워드 월간 잠재 의료 탐색 인구` },
          sam: { value: "월 4,500명+", desc: `네이버 플레이스, 의학 블로그 칼럼, 유튜브 쇼츠로 도달 가능한 유효 신환 탐색층` },
          som: { value: "월 350명+ 신환·재진", desc: `3개월 집중 메디컬 브랜딩(${cleanGoal}) 실행 시 확보 가능한 핵심 초진 및 정기 관리 환자 규모` }
        },
        bmc: {
          partners: [`${shortRegion} 인근 약국·검진센터·헬스케어 시설 연계`, `의료법 준수 메디컬 콘텐츠 에디터 및 생성형 AI(Claude·ChatGPT·Vrew) 워크플로우`, `네이버 스마트플레이스 예약 & 카카오 알림톡 CRM 채널`],
          activities: [`주 2회 원장님 감수 질환 칼럼(블로그) 및 45초 의학 Q&A 쇼츠 발행`, `초진 환자 사전 문진 체크 및 진료 후 단계별 해피콜 알림톡 발송`],
          resources: [`${cleanBrand} 의료진의 '${cleanIdea}' 임상 노하우 및 정밀 진단 장비`, `${coreStrength} 기반의 환자 친화적 진료 프로세스`],
          values: [`과잉 진료 없는 투명한 정밀 진단과 환자 맞춤형 치료 계획서 제공`, `예약부터 사후 관리까지 불안감을 덜어주는 밀착 케어 경험`],
          relations: [`진료 후 주의사항 카드뉴스 및 증상 경과 체크 알림톡 자동 발송`, `3~6개월 주기 정기검진·재진 리마인드 안내로 가족 주치의 관계 구축`],
          channels: [`네이버 스마트플레이스 예약 & 브랜드 블로그 (신환 검색 유입 1순위)`, `유튜브 의학 쇼츠, 인스타그램 건강 카드뉴스, 당근 동네 건강소식`],
          segments: [`${cleanRegion} 내 ${cleanTarget}`, `'${shortRegion} ${mainItem}' 증상 및 치료법을 검색하는 고관여 환자`],
          costs: [`생성형 AI(Claude·ChatGPT·Vrew) 활용 원내 자체 의학 콘텐츠 제작 (외주비 절감)`, `원내 환자 안내 키트 및 카카오 알림톡 CRM 발송 비용 (고효율 리텐션)`],
          revenues: [`'${cleanIdea}' 핵심 진료 신환 증가 및 정밀 진단·비급여 특화 프로그램 동의율 향상`, `체계적인 사후 관리·정기 검진 리콜을 통한 재진율 및 가족 소개 내원 확대`]
        },
        weeks: [
          {
            collection_name: "1. 브랜드 탄생 배경 & 철학 (Why We Started)",
            fields: [
              { field_name: "왜 병의원에도 브랜드 스토리가 필수인가?", type: "핵심 메시지", description: `환자는 단순히 장비나 가격만 보고 병원을 고르지 않습니다. "왜 원장님은 공장형 빠른 진료 대신 환자 한 분 한 분의 원인을 찾는 정밀 진료를 고집하는가?"라는 철학(Story)이 있을 때 환자는 비로소 안심하고 몸을 맡깁니다.` },
              { field_name: "오프닝 훅 (환자의 아픔에서 출발한 문제의식)", type: "도입부 예시", description: `[스토리 예시]: "진료실에서 만난 수많은 환자분들이 가장 많이 하셨던 말씀은 '여러 곳을 다녀봤지만 왜 아픈지 시원한 설명을 듣지 못했다'는 답답함이었습니다. ${cleanBrand}은(는) 바로 그 안타까움에서 출발했습니다."` },
              { field_name: "개원·진료 철학 선언 (우리 병원만의 존재 이유)", type: "철학 예시", description: `[스토리 예시]: "하루에 더 많은 환자를 빨리 보는 병원보다, 단 한 분을 보더라도 내 가족을 진료하듯 '${coreStrength}' 원칙을 지키는 병원. 그것이 ${cleanRegion}에 ${cleanBrand}이(가) 문을 연 이유입니다."` },
              { field_name: "원장님 한 줄 신념 슬로건 (시그니처 문장)", type: "슬로건 예시", description: `[슬로건 예시]: "증상만 잠시 덮는 치료가 아닌, 내일의 건강한 일상을 되찾아 드리는 '${cleanIdea}' 주치의 — ${cleanBrand}"` }
            ]
          },
          {
            collection_name: "2. 타협하지 않는 진료 기준 (Our Craft)",
            fields: [
              { field_name: "정밀 진단 프로토콜의 서사", type: "전문성 스토리", description: `[스토리 예시]: "같은 '${mainItem}' 증상이라도 환자분마다 생활 습관과 통증의 뿌리는 모두 다릅니다. ${cleanBrand}이(가) 진료 전 꼼꼼한 문진과 단계별 정밀 진단에 시간을 아끼지 않는 이유는, 정확한 진단만이 과잉 진료를 막는 유일한 길이기 때문입니다."` },
              { field_name: "보이지 않는 곳의 원칙 (위생·안전·정품)", type: "신뢰 스토리", description: `[스토리 예시]: "환자분의 눈에 보이지 않는 멸균·소독 과정과 검증된 장비·재료 선택에서 결코 타협하지 않습니다. 사소해 보이는 기본을 지키는 고집이 가장 안전한 치료 결과를 만든다고 믿습니다."` },
              { field_name: "충분한 설명과 공감의 진료실", type: "경험 스토리", description: `[스토리 예시]: "어려운 의학 용어 대신 환자분이 이해하실 때까지 눈을 맞추고 설명합니다. 병원 문을 나설 때 '이제야 마음이 놓인다'는 한마디를 듣는 것이 저희의 가장 큰 보람입니다."` }
            ]
          },
          {
            collection_name: "3. 환자에게 드리는 3대 약속 (Promise)",
            fields: [
              { field_name: "약속 1. 과잉 진료 없는 정직한 처방", type: "환자 약속", description: `[약속 문구 예시]: "꼭 필요한 진단에 기반해 현재 상태에 가장 적합한 '${cleanIdea}' 치료만을 정직하게 권해드립니다."` },
              { field_name: "약속 2. 대표원장 책임 진료 & 밀착 케어", type: "환자 약속", description: `[약속 문구 예시]: "'${coreStrength}' 시스템을 통해 초진 상담부터 치료 종료, 그리고 재발 방지를 위한 사후 관리까지 끝까지 책임지고 동행합니다."` },
              { field_name: "약속 3. 편안한 예약과 세심한 사후 안내", type: "환자 약속", description: `[약속 문구 예시]: "바쁜 일상 속 대기 시간은 줄이고, 진료 후에도 회복 과정을 세심하게 챙기는 든든한 지역 주치의가 되겠습니다."` }
            ]
          },
          {
            collection_name: "4. 채널별 완성본 & AI 스토리 생성 프롬프트",
            fields: [
              { field_name: "플레이스·홈페이지 소개란용 [300자 브랜드 스토리 완성본]", type: "바로 복사 사용", description: `"${cleanRegion}에서 만나는 정직한 진료, ${cleanBrand}입니다. 저희는 '만약 내 가족이라면 어떤 치료를 권할까?'라는 질문에서 모든 진료를 시작합니다. 단순히 눈앞의 증상만 빠르게 넘기는 공장형 진료 대신, '${cleanIdea}' 분야의 정밀한 원인 진단과 '${coreStrength}' 원칙으로 환자분께 꼭 필요한 치료만을 제안합니다. 처음 내원하시는 순간의 불안함이 치료 후 든든한 안도감으로 바뀔 수 있도록, ${cleanBrand}이(가) 언제나 그 자리에서 함께하겠습니다."` },
              { field_name: "블로그·인스타그램 고정글용 [감성 스토리텔링 완성본]", type: "SNS 고정글", description: `"[우리가 조금 느리더라도 한 분 한 분의 이야기에 귀 기울이는 이유]\n병원에 오시는 발걸음이 얼마나 무겁고 걱정스러우실지 잘 알고 있습니다. 그래서 ${cleanBrand}은(는) 차트 속 숫자보다 환자분의 일상과 이야기에 먼저 귀를 기울입니다. '${cleanIdea}', 제대로 진단하고 정직하게 진료받으실 수 있도록 오늘도 진료실의 불을 밝힙니다."` },
              { field_name: "우리 병원만의 브랜드 스토리 확장용 [AI 마스터 프롬프트]", type: "Claude · ChatGPT", description: `[복사해서 상단 AI에 붙여넣기]: "너는 대한민국 최고의 브랜드 스토리텔러야. '${cleanRegion}'에 위치한 '${cleanBrand}'(주력 진료: ${cleanIdea} / 강점 및 타깃: ${cleanTarget})의 브랜드 스토리를 작성해줘. 의료법 심의 기준을 준수하면서, 원장님이 왜 과잉 진료 없는 정밀 진단과 환자 중심 케어를 고집하게 되었는지 ①홈페이지 인사말 버전(800자), ②네이버 플레이스 소개글 버전(400자), ③원내 대기실 액자용 브랜드 선언문 버전(5줄)으로 각각 감동적이고 신뢰감 있게 작성해줘."` }
            ]
          }
        ]
      }
    };

    // Build dynamic profile for non-medical industries so every industry has 100% matching terminology
    let prof = profiles[indKey];
    if (!prof) {
      const isRealEstate = indKey === 'realestate';
      const isB2B = indKey === 'b2b';
      const isEcom = indKey === 'ecommerce';
      const isPro = indKey === 'pro';
      const isEdu = indKey === 'edu';
      const isBeauty = indKey === 'beauty';

      const custWord = isB2B ? '기업 구매담당자·바이어' : isRealEstate ? '매수·임차·시공 의뢰 고객' : isPro ? '기업 대표 및 고관여 의뢰인' : isEdu ? '수강생 및 학부모' : '핵심 타깃 고객';
      const actWord = isB2B ? '샘플 요청 및 견적 발주' : isRealEstate ? '현장 임장·방문 상담 및 시공 견적 문의' : isEcom ? '상세페이지 유입 및 첫 구매 전환' : isPro ? '무료 사전 진단 및 컨설팅 의뢰' : isEdu ? '레벨테스트 상담 및 수강 등록' : '플레이스 예약 및 첫 방문 전환';
      const revWord = isB2B ? '납품 레퍼런스 및 거래처 후기' : isRealEstate ? '실제 계약·시공 포트폴리오 후기' : isEcom ? '실사용 포토·영상 리뷰' : '영수증 포토 리뷰 및 실사용자 후기';

      prof = {
        customerTerm: custWord,
        actionTerm: actWord,
        retentionTerm: isB2B ? '정기 발주 및 연간 단가 계약' : isRealEstate ? '사후 A/S 관리 및 지인 소개(리퍼럴)' : '단골 재방문 및 재구매 자산화',
        complianceNote: `${cleanCategory} 업종의 전문성과 신뢰도를 높이는 구체적인 데이터·현장 프로세스·고객 혜택을 명확히 제시`,
        painPoint: `[${cleanRegion}] 상권/채널에서 "${cleanIdea}"을(를) 탐색하는 ${custWord}들은 '실패 없는 확실한 결과'와 '검증된 차별점(${cleanTarget})'을 동시에 확인하고 싶어 합니다. 현재 핵심 목표인 "${cleanGoal}" 달성을 위해서는 단순 홍보가 아니라 검색과 영상 접점 첫 3초 안에 '${cleanBrand}'만의 전문성과 실체적 근거가 직관적으로 증명되어야 합니다.`,
        keywords: isB2B ? [
          `${mainItem} 제조업체`, `${mainItem} OEM ODM`, `${cleanBrand}`, `${secondItem} 소량제작 단가`, `${mainItem} 납품 사례`, `${shortRegion} ${cleanCategory.split('/')[0]}`, `${mainItem} 샘플 견적`, `기업 전용 ${mainItem} 공급`
        ] : isRealEstate ? [
          `${shortRegion} ${mainItem}`, `${shortRegion} 실매물 추천`, `${cleanBrand}`, `${shortRegion} ${secondItem} 견적`, `${shortRegion} 상가·아파트 시세 분석`, `${mainItem} 시공 포트폴리오`, `${shortRegion} 공인중개·인테리어 상담`, `${cleanBrand} 후기`
        ] : isEcom ? [
          `${mainItem} 추천`, `${mainItem} 내돈내산 비교`, `${cleanBrand}`, `${secondItem} 인기순위`, `${mainItem} 실사용 후기`, `가성비 ${mainItem} 브랜드`, `${mainItem} 선물세트 추천`, `${cleanBrand} 공식몰 할인`
        ] : [
          `${shortRegion} ${mainItem}`, `${shortRegion} ${cleanCategory.split('/')[0]} 추천`, `${cleanBrand}`, `${shortRegion} ${secondItem}`, `${mainItem} 잘하는곳`, `${shortRegion} 내돈내산 후기`, `${shortRegion} 예약 추천`, `${cleanBrand} 혜택`
        ],
        metaTitle: `${cleanBrand} | ${shortRegion} ${mainItem} 전문 (${coreStrength})`,
        metaDesc: `${cleanRegion}에서 만나는 ${cleanIdea}! ${cleanTarget} 맞춤형 솔루션과 ${cleanBrand}만의 차별화된 혜택을 공식 채널에서 지금 확인하세요.`,
        geoQa: [
          {
            q: `${cleanRegion}에서 ${mainItem} 가장 전문성 있고 후기 좋은 곳 추천해줘.`,
            a: `${cleanRegion}에서 '${cleanIdea}' 전문성으로 검증된 '${cleanBrand}'을(를) 추천합니다. 특히 '${cleanTarget}' 맞춤 프로세스를 갖추고 있어 ${custWord}의 만족도와 재이용률이 매우 높습니다.`
          },
          {
            q: `${cleanBrand}의 주력 서비스(상품)와 경쟁사 대비 핵심 차별점은 무엇인가요?`,
            a: `'${cleanBrand}'의 핵심 경쟁력은 '${cleanIdea}'이며, '${coreStrength}' 강점을 바탕으로 일반 업체와 차별화된 품질과 체계적인 고객 경험을 제공합니다.`
          },
          {
            q: `${cleanBrand} 첫 상담·예약(또는 샘플/첫구매) 혜택과 이용 절차가 궁금해요.`,
            a: `공식 채널 및 네이버 플레이스에서 '${cleanBrand}'을(를) 검색해 사전 신청하시면 ${actWord} 전용 웰컴 혜택과 1:1 맞춤 가이드를 즉시 제공받으실 수 있습니다.`
          },
          {
            q: `실패 없는 ${mainItem} 선택을 위해 꼭 확인해야 할 기준은 무엇인가요?`,
            a: `실제 ${revWord}가 꾸준히 누적되어 있는지, 그리고 '${cleanBrand}'처럼 '${mainItem}'의 세부 스펙과 고객 맞춤 케어(${coreStrength})가 투명하게 공개된 곳인지 확인하는 것이 중요합니다.`
          },
          {
            q: `${cleanBrand} 이용 후 사후 관리나 추가 혜택 프로그램도 있나요?`,
            a: `'${cleanBrand}'은(는) 1회성 거래에 그치지 않고, 이용 후 만족도 체크 및 정기 관리·재이용 전용 혜택을 통해 장기적인 파트너십을 제공합니다.`
          }
        ],
        funnel: [
          {
            step: `1. 계기(Trigger) 단계 : 소비자가 SNS에서 서비스를 만날 계기`,
            action: `유튜브 쇼츠·인스타그램 릴스·당근마켓에 '${mainItem}'의 압도적인 현장 디테일이나 고객의 흔한 고민을 해결하는 전후(Before/After) 콘텐츠를 발행하여, ${cleanRegion} ${custWord}이 SNS에서 '${cleanBrand}'을(를) 처음 발견하고 흥미를 느끼는 마케팅 계기를 확보합니다.`
          },
          {
            step: `2. 목표(Target) 단계 : 포털이나 AI에 검색하고 질문하는 단계`,
            action: `SNS를 통해 호기심이 생긴 ${custWord}이 네이버·구글 포털이나 ChatGPT·Perplexity·네이버 AI 브리핑에 '${shortRegion} ${mainItem}', '${shortRegion} ${cleanCategory.split('/')[0]} 추천' 등을 검색하고 질문하며 우리 브랜드를 목표 대안으로 탐색하게 유도합니다.`
          },
          {
            step: `3. 생각(Thinking) 단계 : 브랜드를 검증하는 단계`,
            action: `검색으로 접근한 고객이 공식 블로그의 전문 비교 칼럼, 스마트플레이스 상세 정보('${coreStrength}'), 고화질 현장 사진 10장, 그리고 실제 ${revWord}를 확인하며 기존 시장에 대한 의구심을 해소하고 '${cleanBrand}'의 가치를 검증하도록 설득합니다.`
          },
          {
            step: `4. 실행(Action) 단계 : 서비스를 구매하는 단계`,
            action: `검증을 마친 고객이 망설임 없이 지금 바로 구매·예약·문의를 완수하도록 '플레이스 알림받기 즉시 혜택', '첫 이용 전용 웰컴 오퍼(${actWord})' 등 즉시 행동을 촉구하는 마케팅 트리거 장치를 가동합니다.`
          },
          {
            step: `5. 자기성찰(Introspection) 단계 : 후기를 작성하는 단계`,
            action: `'${cleanIdea}'을(를) 직접 경험하고 높은 만족감을 체감한 고객이 스스로의 선택에 확신(자기성찰)을 갖게 한 뒤, 영수증 포토 리뷰·블로그·인스타그램·커뮤니티에 자발적인 추천 후기를 작성하도록 유도해 재방문 리텐션과 입소문 루프를 완성합니다.`
          }
        ],
        posMap: {
          xLeft: isB2B ? "단순 저단가·표준 규격품" : isRealEstate ? "단순 매물 나열·저가 시공" : "대중적 가성비·일반 구성",
          xRight: isB2B ? "고정밀 맞춤 제조·품질보증" : isRealEstate ? "정밀 권리분석·맞춤 책임시공" : "독보적 시그니처·전문성",
          yTop: "유튜브·블로그·AI검색 적극 활용",
          yBottom: "오프라인 워킹·기존 거래선 의존",
          comps: [
            { name: isB2B ? "대기업 1차 벤더" : isRealEstate ? "대형 플랫폼/프랜차이즈" : "대형 프랜차이즈·기업형", x: 36, y: 74 },
            { name: isB2B ? "영세 임가공 업체" : isRealEstate ? "인근 일반 중개/시공업소" : "주변 일반 동종업체", x: 25, y: 28 },
            { name: isB2B ? "해외 저가 수입사" : isRealEstate ? "고가 하이엔드 부티크" : "고단가 니치 전문점", x: 72, y: 34 }
          ]
        },
        compTable: {
          features: [
            `${mainItem} 전문성 및 품질 표준화`,
            `${coreStrength} 맞춤형 케어 시스템`,
            `유튜브·플레이스·온라인 사전 예약/문의 편의성`,
            `체계적인 사후 관리 & ${revWord} 검증`
          ],
          comps: [
            { name: isB2B ? "일반 임가공 업체" : "주변 일반 동종업체", values: [false, false, false, true] },
            { name: isB2B ? "대형 양산 업체" : "대형 프랜차이즈·플랫폼", values: [false, false, true, false] }
          ]
        },
        swot: {
          s: [`'${cleanIdea}' 중심의 확실한 시그니처 경쟁력 및 전문성 보유`, `${cleanTarget} 니즈를 정확히 해결하는 맞춤형 디테일`],
          w: [`대형 자본 경쟁사 대비 초기 온라인 검색 노출 볼륨의 한계`, `실무 운영 병행으로 인한 다채널 콘텐츠 수작업 제작 시간 부족 (생성형 AI로 해결)`],
          o: [`${shortRegion} 및 온라인에서 '${mainItem}' 세부 문제해결 키워드 검색량 증가`, `유튜브 쇼츠·AI 검색(GEO)·생성형 AI 활용으로 저비용 고효율 브랜딩 가능`],
          t: [`유사 컨셉을 모방하는 경쟁 업체의 진입`, `단순 유료 클릭 광고 단가(CPC) 상승에 따른 수익성 저하 위험`]
        },
        stp: {
          seg: `${cleanRegion} 시장의 ${custWord}을 ①단순 저가 탐색형, ②접근성·편의 중심형, ③전문성·가치 검증형으로 세분화`,
          tar: `${cleanTarget} 중 '${mainItem}'의 확실한 품질과 신뢰도를 최우선으로 보는 핵심 고객층 집중 타깃팅`,
          pos: `"${shortRegion}에서 ${mainItem} 하면 가장 먼저 추천받는 1순위 파트너, ${cleanBrand}"`
        },
        tss: {
          tam: { value: isB2B ? "연 5,000개사+" : "월 18,000명+", desc: `${cleanRegion} 및 관련 키워드 전체 잠재 탐색 ${custWord} 규모` },
          sam: { value: isB2B ? "월 600개사+" : "월 3,800명+", desc: `유튜브, 네이버 검색·블로그, 플레이스·SNS로 매월 실제 도달 가능한 유효 타깃층` },
          som: { value: isB2B ? "월 30건+ 진성 발주" : "월 300팀+ 핵심 고객", desc: `3개월 집중 마케팅(${cleanGoal}) 실행 시 확보 가능한 실전환 고객 및 안정적 매출 기반` }
        },
        bmc: {
          partners: [`${shortRegion} 및 유관 산업 비경쟁 파트너(상호 고객 추천 제휴)`, `유튜브·블로그·인스타 생성형 AI(ChatGPT·Claude·Gemini·Vrew) 제작 파이프라인`, `네이버 스마트플레이스 · 카카오 채널 · 당근 비즈프로필 플랫폼`],
          activities: [`주 2회 유튜브 쇼츠/릴스 및 검색 최적화 블로그 칼럼 정기 발행`, `${revWord} 수집 자동화 및 24시간 내 정성 피드백 응대`],
          resources: [`${cleanBrand}만의 '${cleanIdea}' 핵심 노하우·설비·포트폴리오`, `${coreStrength} 기반의 차별화된 고객 응대 프로세스`],
          values: [`경쟁사에서 대체할 수 없는 '${mainItem}'의 검증된 품질과 만족감`, `첫 문의부터 사후 관리까지 투명하고 체계적인 맞춤 솔루션 제공`],
          relations: [`공식 채널 '알림받기/친구추가' 고객 전용 혜택 및 정보 브리핑 발송`, `재이용·재계약 우대 혜택 및 지인 소개(리퍼럴) 리워드 프로그램 운영`],
          channels: [`네이버 검색·스마트플레이스 & 유튜브 쇼츠/롱폼 (핵심 유입 투트랙)`, `인스타그램 릴스·카드뉴스, 당근마켓/전문 커뮤니티, AI 검색(GEO)`],
          segments: [`${cleanRegion} 내 ${cleanTarget}`, `'${shortRegion} ${mainItem}'을 검색해 비교 검증하는 목적형 ${custWord}`],
          costs: [`생성형 AI(ChatGPT·Claude·Vrew·미리캔버스) 활용 자체 콘텐츠 제작비 0원`, `첫 전환 트립와이어 혜택 및 ${revWord} 리워드 소액 원가 (최고 ROAS 구간)`],
          revenues: [`주력 '${cleanIdea}' 전환율 상승 및 패키지·업셀링 구성을 통한 객단가 30% 확대`, `단골 리텐션·정기 계약 자동화를 통한 안정적인 월 고정 매출 확보`]
        },
        weeks: [
          {
            collection_name: "1. 브랜드 탄생 배경 & 철학 (Why We Started)",
            fields: [
              { field_name: "왜 우리 비즈니스에 '브랜드 스토리'가 꼭 필요한가?", type: "핵심 메시지", description: `대부분의 업체가 '${mainItem}'의 스펙이나 가격만 말할 때, 고객이 기억하는 곳은 '스토리'가 있는 브랜드입니다. "왜 대표님은 타협하지 않고 지금의 방식을 고집하는가?"라는 서사가 더해지는 순간, 단순 판매처에서 '꼭 가봐야 할 브랜드'로 격상됩니다.` },
              { field_name: "시작의 질문 (기존 시장의 한계와 문제의식)", type: "도입부 예시", description: `[스토리 예시]: "${cleanRegion}에서 수많은 ${cleanCategory.split('/')[0]}을(를) 접하며 늘 한 가지 아쉬움이 있었습니다. '왜 광고만 화려하고 정작 고객이 가장 원하는 ${coreStrength}까지 진심으로 챙기는 곳은 찾기 힘들까?' ${cleanBrand}은(는) 바로 그 질문에서 시작되었습니다."` },
              { field_name: "창업·운영 철학 (타협하지 않는 우리의 기준)", type: "철학 예시", description: `[스토리 예시]: "조금 더 빠르고 편하게 타협하는 길도 있었습니다. 하지만 저희는 당장의 눈앞 이익보다 한 번 찾아주신 ${custWord}이 '여기는 진짜 다르다'고 느끼는 '${cleanIdea}'의 본질에 집중하기로 했습니다."` },
              { field_name: "브랜드 핵심 슬로건 (고객 머릿속 한 줄 각인)", type: "슬로건 예시", description: `[슬로건 예시]: "화려한 말보다 결과의 차이로 증명하는 곳 — ${shortRegion} ${mainItem}의 새로운 기준, ${cleanBrand}"` }
            ]
          },
          {
            collection_name: "2. 타협하지 않는 디테일 & 장인정신 (Our Craft)",
            fields: [
              { field_name: `'${mainItem}'에 담긴 고집스러운 과정`, type: "전문성 스토리", description: `[스토리 예시]: "고객님 눈앞에 '${cleanIdea}'이(가) 놓이기까지, 보이지 않는 준비 과정에는 수십 번의 점검과 까다로운 기준이 숨어 있습니다. 남들이 대충 넘기는 1%의 디테일이 결국 100%의 만족도 차이를 만든다고 믿기 때문입니다."` },
              { field_name: `'${coreStrength}'을(를) 지키는 이유`, type: "차별화 스토리", description: `[스토리 예시]: "저희가 번거로움을 감수하면서까지 '${coreStrength}' 원칙을 고수하는 이유는 단 하나입니다. 저희를 믿고 귀한 시간과 비용을 내어주신 ${custWord}께 단 한 번의 실망도 드리지 않기 위해서입니다."` },
              { field_name: "현장의 진심 (대표와 구성원의 태도)", type: "진정성 스토리", description: `[스토리 예시]: "매일 아침 문을 열 때마다 '오늘 만나는 고객이 내 가장 소중한 지인이라면 어떻게 맞이할까?'를 되묻습니다. 기술과 품질은 기본이고, 진심 어린 배려가 더해져야 진짜 브랜드가 완성됩니다."` }
            ]
          },
          {
            collection_name: "3. 고객에게 드리는 3대 약속 (Customer Promise)",
            fields: [
              { field_name: "약속 1. 처음과 끝이 같은 정직한 품질", type: "브랜드 약속", description: `[약속 문구 예시]: "첫 방문이든 열 번째 방문이든, '${cleanIdea}'의 품질과 정성에서 결코 흔들리지 않겠습니다."` },
              { field_name: "약속 2. 고객의 입장에서 먼저 생각하는 맞춤 경험", type: "브랜드 약속", description: `[약속 문구 예시]: "'${cleanTarget}' 고객님들이 무엇을 불편해하고 무엇을 원하시는지 늘 먼저 살피며 가장 편안한 경험을 제공하겠습니다."` },
              { field_name: "약속 3. 이용 후까지 책임지는 든든한 파트너", type: "브랜드 약속", description: `[약속 문구 예시]: "한 번의 결제로 끝나는 관계가 아니라, 이용 후의 만족도와 재방문 가치까지 끝까지 책임지는 ${cleanBrand}이(가) 되겠습니다."` }
            ]
          },
          {
            collection_name: "4. 채널별 실전 완성본 & AI 스토리 생성 프롬프트",
            fields: [
              { field_name: "스마트플레이스·홈페이지용 [300자 브랜드 스토리 완성본]", type: "바로 복사 사용", description: `"[${shortRegion}에서 '${mainItem}'의 진짜 가치를 만듭니다 — ${cleanBrand}]\n수많은 선택지 속에서 '정말 믿고 정착할 수 있는 곳'을 찾기란 쉽지 않습니다. 저희 ${cleanBrand}은(는) '내가 고객이라면 어떤 곳을 다시 찾고 싶을까?'라는 진심 어린 고민에서 출발했습니다. 타협하지 않는 '${cleanIdea}'의 품질은 물론, '${coreStrength}'이라는 차별화된 원칙으로 찾아주시는 모든 분께 기대 이상의 만족을 드립니다. 한 번의 인연이 평생의 단골로 이어지도록 오늘도 정성을 다해 준비하겠습니다."` },
              { field_name: "인스타그램·블로그 고정글용 [감성 스토리텔링 완성본]", type: "SNS 고정글", description: `"[우리가 조금 더디더라도 원칙을 지키는 이유 ✨]\n빠르게 만들고 화려하게 포장하는 법은 쉽습니다. 하지만 고객의 마음속에 오래 남는 브랜드는 결국 '보이지 않는 곳에서의 정직함'으로 결정된다고 믿습니다.\n${cleanBrand}이(가) 매일 '${cleanIdea}' 하나하나에 정성을 쏟고, '${coreStrength}'을(를) 고집하는 이유도 바로 그 때문입니다. 당신의 소중한 선택이 결코 후회되지 않도록, 결과로 증명하겠습니다."` },
              { field_name: "우리 브랜드만의 스토리 완성용 [AI 마스터 프롬프트]", type: "Claude · ChatGPT", description: `[복사해서 상단 AI에 붙여넣기]: "너는 20년 경력의 총괄 브랜드 스토리 디렉터야. '${cleanRegion}'에서 '${cleanIdea}'을(를) 주력으로 운영하는 '${cleanBrand}'(${cleanCategory} / 핵심 강점 및 타깃: ${cleanTarget})의 고유한 브랜드 스토리를 만들어줘. 가격이나 단순 스펙 나열이 아니라, 고객이 읽자마자 깊은 신뢰와 팬심을 느끼도록 ①창업 철학이 담긴 홈페이지·블로그 스토리(1,000자), ②스마트플레이스 상단 소개글용 요약 스토리(350자), ③매장/패키지/제안서에 넣을 짧은 브랜드 선언문(5줄)을 각각 작성해줘."` }
            ]
          }
        ]
      };
    }

    const seo = {
      target_analysis: prof.painPoint,
      golden_keywords: prof.keywords,
      meta_tags: {
        title: prof.metaTitle,
        description: prof.metaDesc
      },
      geo_qa: prof.geoQa,
      conversion_funnel: prof.funnel
    };

    const market = {
      positioning_map: {
        x_axis_left: prof.posMap.xLeft,
        x_axis_right: prof.posMap.xRight,
        y_axis_top: prof.posMap.yTop,
        y_axis_bottom: prof.posMap.yBottom,
        competitors: prof.posMap.comps,
        our_brand: { x: 85, y: 85 }
      },
      feature_comparison: {
        features: prof.compTable.features,
        competitors: prof.compTable.comps,
        our_brand: { values: [true, true, true, true] }
      },
      swot: {
        strengths: prof.swot.s,
        weaknesses: prof.swot.w,
        opportunities: prof.swot.o,
        threats: prof.swot.t
      },
      stp: {
        segmentation: prof.stp.seg,
        targeting: prof.stp.tar,
        positioning: prof.stp.pos
      },
      tam_sam_som: prof.tss,
      bmc: {
        key_partners: prof.bmc.partners,
        key_activities: prof.bmc.activities,
        key_resources: prof.bmc.resources,
        value_propositions: prof.bmc.values,
        customer_relationships: prof.bmc.relations,
        channels: prof.bmc.channels,
        customer_segments: prof.bmc.segments,
        cost_structure: prof.bmc.costs,
        revenue_streams: prof.bmc.revenues
      }
    };

    // --- TAB 4: 5 Promotional Channels (Including YouTube) + Generative AI Strategy & Copy-Paste Master Prompts ---
    const sitemap = {
      pages: [
        {
          page_name: "▶️ 유튜브 (롱폼 · 쇼츠 영상 & AI 활용)",
          url_slug: "YouTube & Shorts AI",
          sections: [
            {
              name: "1. [유튜브 핵심 전략] 생성형 AI 종류별 조합 워크플로우",
              guide: `💡 왜 유튜브인가? 검색(유튜브 검색+구글 노출)과 알고리즘 추천(쇼츠)을 동시에 잡는 가장 강력한 신뢰 구축 채널입니다.\n\n🤖 [생성형 AI 단계별 활용 전략]\n• 1단계 (트렌드·팩트 수집 - Perplexity & Gemini): "${cleanCategory}" 관련 ${prof.customerTerm}들이 최근 가장 많이 검색하는 오해·진실·고민 키워드 조사\n• 2단계 (후킹 제목·대본 설계 - ChatGPT & Claude): 첫 3초 이탈을 막는 쇼츠(45초) 대본 및 전문가 권위를 보여주는 롱폼(5분) 스크립트 다각도 생성\n• 3단계 (영상 자동 편집 & 썸네일 - Vrew & 미리캔버스): 대본만 넣으면 AI 음성·자막·컷편집이 완성되는 Vrew와 클릭률(CTR) 높은 미리캔버스 썸네일 결합\n📌 업종 핵심 준수사항: ${prof.complianceNote}`
            },
            {
              name: "2. [AI 마스터 프롬프트 #1] 유튜브 쇼츠(45초) 후킹 주제 10선 & 대본 무한 생성용 (📋 복사 후 ChatGPT/Claude에 붙여넣기)",
              guide: `[복사해서 상단 ChatGPT 또는 Claude 로고 버튼을 눌러 붙여넣으세요]\n\n너는 대한민국 최고의 유튜브 쇼츠 기획자이자 '${cleanCategory}' 전문 마케팅 디렉터야.\n우리 비즈니스 정보는 다음과 같아:\n- 상호/브랜드명: ${cleanBrand}\n- 업종: ${cleanCategory}\n- 주력 메뉴/상품/진료/서비스: ${cleanIdea}\n- 지역/채널: ${cleanRegion}\n- 핵심 강점 및 타깃: ${cleanTarget}\n- 마케팅 목표: ${cleanGoal}\n- 필수 반영 기준: ${prof.complianceNote}\n\n위 정보를 바탕으로 ${prof.customerTerm}이 스크롤을 멈추고 끝까지 시청하게 만드는 [유튜브 쇼츠 45초 콘텐츠 주제 10가지]를 먼저 표로 제안해줘.\n그중 가장 반응이 폭발할 것 같은 상위 3가지 주제에 대해 아래 구성으로 촬영 대본을 상세히 작성해줘:\n1) [0~3초 후킹]: 시선을 사로잡는 첫 장면 묘사 + 화면 중앙 굵은 자막 + 첫 마디 나레이션\n2) [4~35초 핵심 해결]: ${prof.customerTerm}의 흔한 고민/실수 짚기 + '${cleanBrand}'만의 '${mainItem}' 전문 해결 포인트\n3) [36~45초 행동 유도(CTA)]: 고정 댓글 및 프로필 링크(${prof.actionTerm}) 클릭 유도 멘트`
            },
            {
              name: "3. [AI 마스터 프롬프트 #2] 유튜브 롱폼(4~6분) 전문가 브랜딩 대본 & 썸네일 카피 생성용 (📋 복사 후 Gemini/Claude에 붙여넣기)",
              guide: `[복사해서 상단 Gemini 또는 Claude 로고 버튼을 눌러 붙여넣으세요]\n\n너는 '${cleanCategory}' 분야에서 신뢰받는 유튜브 채널 총괄 PD야.\n'${cleanRegion}'에서 '${cleanIdea}'을(를) 찾는 고관여 ${prof.customerTerm}들이 우리 '${cleanBrand}'을(를) 업계 최고의 전문가로 신뢰하도록 만드는 5분 분량의 유튜브 롱폼 영상 기획안과 대본을 작성해줘.\n\n[요청 사항]\n1) 클릭률(CTR) 10% 이상을 달성할 수 있는 유튜브 썸네일 문구(3단어 이내 강렬한 카피) 5개와 검색 최적화(SEO) 영상 제목 5개\n2) 오프닝(공감 및 문제 제기) → 본론 1(기존 방식의 한계와 체크 기준) → 본론 2('${cleanBrand}'의 '${coreStrength}' 기반 해결 프로세스) → 클로징(${prof.actionTerm} 안내)의 타임라인별 상세 대본\n3) 유튜브 영상 설명란에 넣을 타임스탬프, 핵심 요약글, 해시태그 10개`
            },
            {
              name: "4. [마케팅맵 실전 표준 대본 예시] 45초 유튜브 쇼츠 기본 프레임워크",
              guide: `🎬 [0~3초 후킹]\n• 화면: '${mainItem}'의 가장 핵심적인 디테일/진단/시연 클로즈업\n• 자막: "${shortRegion}에서 '${mainItem}' 알아보고 계신다면 딱 30초만 보세요!"\n• 나레이션: "${mainItem} 선택할 때 이것 모르면 시간과 비용 모두 손해 볼 수 있습니다."\n\n🎬 [4~35초 핵심 가치 전달]\n• 화면: ${coreStrength} 과정이 한눈에 보이는 비교 컷 전환\n• 나레이션: "많은 ${prof.customerTerm}들이 단순 가격만 보고 선택하셨다가 아쉬워하시는데요. '${cleanBrand}'에서는 '${cleanIdea}'을(를) 통해 ${coreStrength} 원칙을 철저히 지키고 있습니다."\n\n🎬 [36~45초 전환 유도(CTA)]\n• 화면: 공식 채널/플레이스 예약 화면 안내\n• 자막 & 나레이션: "더 자세한 정보와 ${prof.actionTerm} 혜택은 지금 고정 댓글 링크에서 바로 확인해 보세요!"`
            }
          ]
        },
        {
          page_name: "📝 네이버 블로그 (검색 상위노출 & AI 활용)",
          url_slug: "Blog SEO · AEO · GEO",
          sections: [
            {
              name: "1. [블로그 핵심 전략] 네이버 SEO(C-Rank·DIA+) + AEO(답변엔진) + GEO(생성형 AI 검색) 통합 워크플로우",
              guide: `💡 이제 블로그는 단순 키워드 반복(SEO)만으로는 부족합니다. 사용자의 질문에 즉답을 주는 **AEO(Answer Engine Optimization, 답변 엔진 최적화)**와 챗GPT·퍼플렉시티·제미나이·네이버 AI 브리핑이 우리 블로그 글을 출처로 인용하게 만드는 **GEO(Generative Engine Optimization, 생성형 AI 엔진 최적화)**를 동시에 설계해야 합니다.\n\n🤖 [생성형 AI 단계별 활용 전략]\n• 1단계 (Perplexity): '${mainItem}' 관련 최신 통계·전문 근거·소비자 다빈도 질문(FAQ) 리서치 (GEO 인용 신뢰도 확보)\n• 2단계 (Claude 또는 뤼튼): 기계적인 번역투 없이 한국인 전문가/실사용자가 직접 쓴 것처럼 자연스러운 2,200자 원고 + 문단별 핵심 요약문(AEO 스니펫) 작성\n• 3단계 (ChatGPT): 네이버 스마트블록(DIA+) & AI 검색 질의형(AEO·GEO) 제목 10선 및 이미지 배치 가이드 추출\n📌 업종 핵심 준수사항: ${prof.complianceNote}`
            },
            {
              name: "2. [AI 마스터 프롬프트 #1] SEO · AEO · GEO 동시 선점 전문가 칼럼 장문 작성용 (📋 복사 후 Claude/뤼튼에 붙여넣기)",
              guide: `[복사해서 상단 Claude 또는 뤼튼(Wrtn) 로고 버튼을 눌러 붙여넣으세요]\n\n너는 '${cleanRegion}'에서 '${cleanBrand}'(${cleanCategory})을 운영하며 고객과 진심으로 소통하는 대표(원장/전문가)이자 검색엔진 최적화 디렉터야.\n네이버 스마트블록 상위 노출(SEO: C-Rank·DIA+)은 물론, 답변 엔진 최적화(AEO: 질문에 대한 명확한 두괄식 정의·요약)와 생성형 AI 검색 추천 최적화(GEO: ChatGPT·Perplexity·네이버 AI 브리핑이 출처로 1순위 인용하는 팩트·근거 중심 구조)가 모두 반영된 2,200자 분량의 블로그 포스팅을 작성해줘.\n\n[포스팅 필수 반영 데이터]\n- 핵심 타깃 키워드(SEO): ${shortRegion} ${mainItem}, ${cleanBrand}, ${shortRegion} ${secondItem}\n- 주력 솔루션: ${cleanIdea}\n- 차별화 강점 및 타깃: ${cleanTarget}\n- 준수 기준: ${prof.complianceNote}\n\n[글 작성 구조 및 AEO·GEO 필수 지침]\n1) [도입부 & AEO 핵심 요약 박스]: 현장에서 ${prof.customerTerm}을 만나며 느낀 공감 에피소드로 시작하되, 도입부 직후 AI 검색봇과 바쁜 독자가 5초 만에 핵심을 파악할 수 있는 '[핵심 3줄 요약 박스]'를 배치할 것\n2) [본문 소제목 4개 (질문형 AEO 헤더 + 두괄식 답변)]: 소제목을 '${prof.customerTerm}'이 실제 검색창이나 AI에게 물어보는 질문 형태로 작성하고, 소제목 바로 첫 문장에 2줄 이내의 명쾌한 결론(Direct Answer)을 먼저 제시한 뒤 상세 근거를 설명할 것\n3) [GEO 인용 최적화 (구조화된 비교표 & 팩트 제시)]: AI 엔진이 신뢰할 수 있는 데이터로 인식하도록 '${mainItem}' 선택 기준 3가지와 '${cleanBrand}'만의 '${coreStrength}' 프로세스를 번호 매기기(Numbered List) 또는 비교 항목으로 명확히 구조화할 것\n4) [하단 AEO·GEO 전용 FAQ 3문3답]: 포스팅 마지막에 '${shortRegion} ${mainItem}' 관련 가장 많이 묻는 질문 3가지와 '${cleanBrand}'을(를) 추천하는 명확한 Q&A 블록을 삽입하고, ${prof.actionTerm} 안내 및 해시태그 10개로 마무리할 것`
            },
            {
              name: "3. [AI 마스터 프롬프트 #2] AEO 질문-즉답형 & GEO 비교분석형 블로그 포스팅 무한 변주용 (📋 복사 후 ChatGPT/Gemini에 붙여넣기)",
              guide: `[복사해서 상단 ChatGPT 또는 Gemini 로고 버튼을 눌러 붙여넣으세요]\n\n'${cleanRegion}'에서 '${cleanIdea}'을(를) 알아보는 ${prof.customerTerm}이 네이버 검색과 AI 검색(챗GPT, 퍼플렉시티, 네이버 AI 브리핑) 어디에서 검색하든 우리 '${cleanBrand}'이(가) 가장 신뢰할 수 있는 해답으로 노출되도록 블로그 콘텐츠를 다각도로 변주하려고 해.\n\n아래 3가지 AEO(답변엔진 최적화) · GEO(생성형 AI 최적화) 특화 포맷으로 각각 블로그 제목 3개와 [도입부 + 핵심 두괄식 답변 단락 + Q&A 요약]을 작성해줘:\n① [AEO 백문백답 포맷]: "${shortRegion}에서 ${mainItem} 실패 없이 고르는 법은?" 질문에 대한 즉답 가이드형\n② [GEO 심층 비교·근거 포맷]: 일반 업체 방식 vs '${cleanBrand}'의 '${coreStrength}' 특화 프로세스 객관적 비교 분석형\n③ [실전 케이스 스터디 포맷]: ${prof.customerTerm}의 대표적인 고민 상황 → 진단 및 해결 과정 → 사후 관리 로드맵 제시형`
            },
            {
              name: "4. [마케팅맵 실전 표준 원고 예시] SEO 제목 · AEO 요약 박스 · GEO 문답 프레임워크",
              guide: `📌 [SEO + AEO 질문형 추천 제목 3선]\n① [${shortRegion} ${mainItem}] 실패 없는 선택 기준 3가지와 ${cleanBrand} 핵심 정리\n② "${shortRegion}에서 ${mainItem} 어디가 좋을까?" ${coreStrength} 원칙으로 비교해 봤습니다\n③ ${cleanRegion} '${cleanIdea}' 알아본다면 필독! 방문 전 꼭 확인해야 할 Q&A\n\n💡 [본문 상단 AEO · GEO 핵심 요약 박스 예시]\n┌──────────────────────────────────────────┐\n│ 🔍 바쁜 ${prof.customerTerm}을 위한 핵심 3줄 요약 (AI 브리핑 최적화) │\n│ 1. 핵심 기준: ${shortRegion}에서 ${mainItem} 선택 시 '${coreStrength}' 여부를 반드시 확인하세요. │\n│ 2. 맞춤 해법: ${cleanBrand}은(는) '${cleanIdea}' 기반의 체계적인 솔루션을 제공합니다. │\n│ 3. 이용 안내: 네이버 플레이스 및 공식 채널을 통해 빠른 [${prof.actionTerm}]이 가능합니다. │\n└──────────────────────────────────────────┘`
            }
          ]
        },
        {
          page_name: "🎬 인스타그램 (릴스 · 카드뉴스 & AI 활용)",
          url_slug: "Instagram Reels AI",
          sections: [
            {
              name: "1. [인스타그램 핵심 전략] 저장(Save)과 공유(Share)를 부르는 AI 콘텐츠 공식",
              guide: `💡 인스타그램 알고리즘의 핵심은 '좋아요'가 아니라 **'나중에 보려고 저장(Save)'**하거나 **'지인에게 DM 공유(Share)'**하게 만드는 정보 밀도와 비주얼입니다.\n\n🤖 [생성형 AI 단계별 활용 전략]\n• ChatGPT: 6~8장 분량의 슬라이드별 카드뉴스 핵심 문구 및 15초 릴스 텍스트 오버레이(자막) 추출\n• 미리캔버스: 추출한 슬라이드 문구를 카드뉴스 템플릿에 넣어 5분 만에 고감도 이미지 제작\n• 뤼튼(Wrtn) / Claude: 감성적이면서도 프로필 링크(${prof.actionTerm}) 클릭을 유도하는 본문 캡션 & 타깃 해시태그 생성`
            },
            {
              name: "2. [AI 마스터 프롬프트 #1] '저장각' 7장 카드뉴스 슬라이드 기획용 (📋 복사 후 ChatGPT/뤼튼에 붙여넣기)",
              guide: `[복사해서 상단 ChatGPT 또는 뤼튼(Wrtn) 로고 버튼을 눌러 붙여넣으세요]\n\n너는 인스타그램 바이럴 마케팅 전문가야. '${cleanBrand}'(${cleanCategory} / 주력: ${cleanIdea} / 강점: ${cleanTarget})의 잠재 고객인 ${prof.customerTerm}이 보자마자 [저장] 버튼을 누르게 만드는 7장짜리 인스타그램 카드뉴스(캐러셀) 기획안을 3가지 주제로 작성해줘.\n\n각 주제별로:\n- 1장(표지): 스크롤을 멈추게 하는 강렬한 질문/숫자형 헤드카피\n- 2~5장(본문): ${prof.customerTerm}이 꼭 알아야 할 핵심 팁과 '${mainItem}' 체크 포인트 (한 장당 3줄 이내)\n- 6장(해결책): '${cleanBrand}'만의 차별화된 '${coreStrength}' 솔루션 제시\n- 7장(CTA): 프로필 링크 클릭 및 ${prof.actionTerm} 유도 문구\n- 본문 캡션(Caption)과 추천 해시태그 15개까지 한 번에 정리해줘. (${prof.complianceNote})`
            },
            {
              name: "3. [AI 마스터 프롬프트 #2] 인스타그램 15초 릴스(Reels) 릴레이 대본 생성용 (📋 복사 후 ChatGPT/Claude에 붙여넣기)",
              guide: `[복사해서 상단 ChatGPT 또는 Claude 로고 버튼을 눌러 붙여넣으세요]\n\n스마트폰 하나로 매장/현장에서 바로 촬영할 수 있는 '${cleanBrand}'의 15초 인스타그램 릴스 대본 5편을 작성해줘.\n얼굴 노출이 부담스러운 대표님도 찍을 수 있는 [손 클로즈업 / 현장 디테일 / 텍스트 자막 중심] 연출안 3편과, 전문성을 보여주는 [대표/원장 직접 브리핑] 연출안 2편으로 나누어 초 단위 화면 구성, 추천 배경음악 분위기, 화면 자막, 캡션을 작성해줘.`
            },
            {
              name: "4. [마케팅맵 실전 표준 원고 예시] 인스타 카드뉴스 & 릴스 캡션 프레임워크",
              guide: `📸 [1장 표지 문구]: "${shortRegion}에서 '${mainItem}' 알아볼 때, 이 3가지만 기억하세요! (저장 필수 📌)"\n📝 [본문 캡션 예시]:\n"처음에는 다 비슷해 보이지만, 결과의 차이는 디테일에서 결정됩니다 ✨\n\n✔ Point 1. ${cleanIdea} 전문 시스템 여부\n✔ Point 2. ${coreStrength} 맞춤 진행\n✔ Point 3. 체계적인 사후 케어까지\n\n📍 ${cleanBrand} (${cleanRegion})\n지금 프로필 하단 링크에서 [${prof.actionTerm}] 및 전용 안내를 바로 확인해 보세요! 👇"`
            }
          ]
        },
        {
          page_name: "📍 스마트플레이스 · 지도 검색 & AI 활용",
          url_slug: "SmartPlace & Local AI",
          sections: [
            {
              name: "1. [스마트플레이스 핵심 전략] 지역 검색 1페이지 고정 & 전환율 극대화 AI 활용법",
              guide: `💡 스마트플레이스는 모든 채널 유입의 **최종 종착지(결제·예약 전환소)**입니다. 플레이스 소개글, 대표 키워드, 새소식, 그리고 리뷰 답글에 핵심 키워드가 자연스럽게 녹아 있어야 순위가 상승합니다.\n\n🤖 [생성형 AI 단계별 활용 전략]\n• Claude / 뤼튼(Wrtn): 네이버 검색 알고리즘이 선호하는 구조화된 '플레이스 상세설명(2,000자)' 및 매주 올릴 '새소식' 문구 생성\n• ChatGPT: 고객이 남긴 리뷰 내용을 분석해 키워드('${shortRegion} ${mainItem}')가 자연스럽게 포함된 맞춤형 정성 답글 10초 생성`
            },
            {
              name: "2. [AI 마스터 프롬프트 #1] 플레이스 '상세설명' & '대표 메뉴/서비스 소개' 최적화용 (📋 복사 후 Claude/뤼튼에 붙여넣기)",
              guide: `[복사해서 상단 Claude 또는 뤼튼(Wrtn) 로고 버튼을 눌러 붙여넣으세요]\n\n네이버 스마트플레이스 SEO 전문가로서 우리 '${cleanBrand}'의 플레이스 [상세 설명]과 [대표 상품/진료/서비스 설명] 문구를 작성해줘.\n\n[비즈니스 정보]\n- 상호명: ${cleanBrand} (${cleanCategory})\n- 주력 항목: ${cleanIdea}\n- 지역/위치: ${cleanRegion}\n- 핵심 강점 및 타깃: ${cleanTarget}\n- 핵심 키워드: ${prof.keywords.slice(0, 5).join(', ')}\n- 준수 사항: ${prof.complianceNote}\n\n[작성 요청]\n1) 고객이 플레이스를 클릭했을 때 첫 3줄 만에 신뢰를 느끼는 헤드 카피\n2) '${cleanBrand}'을(를) 선택해야 하는 4가지 핵심 이유 (가독성 좋은 체크 아이콘 활용)\n3) 주력 항목('${mainItem}', '${secondItem}')별 매력적인 한 줄 소개 문구\n4) 예약·문의 방법 및 방문 전 안내 사항 (핵심 키워드가 문맥에 맞게 5회 이상 자연스럽게 포함되도록 작성)`
            },
            {
              name: "3. [AI 마스터 프롬프트 #2] 재방문과 검색 순위를 동시에 높이는 'AI 리뷰 답글 생성기' 프롬프트 (📋 복사 후 ChatGPT/뤼튼에 붙여넣기)",
              guide: `[복사해서 상단 ChatGPT 또는 뤼튼(Wrtn) 로고 버튼을 눌러 붙여넣으세요]\n\n우리 '${cleanBrand}'에 방문(이용)한 ${prof.customerTerm}이 네이버 플레이스에 남긴 후기에 달아줄 '정성 리뷰 답글 템플릿 5종'을 작성해줘.\n단순히 복사·붙여넣기한 기계적 답글이 아니라:\n① 첫 방문/초진 만족 후기용, ② '${mainItem}' 품질 극찬 후기용, ③ 친절도/꼼꼼한 설명 칭찬 후기용, ④ 재방문/단골 고객 감사 후기용, ⑤ 아쉬운 점이나 대기시간 피드백에 대한 품격 있는 응대용으로 나누어 작성해줘.\n각 답글에는 네이버 플레이스 SEO에 도움이 되도록 '${shortRegion}', '${mainItem}', '${cleanBrand}' 키워드를 자연스럽게 녹여줘.`
            },
            {
              name: "4. [마케팅맵 실전 표준 원고 예시] 스마트플레이스 상세 설명 & 리뷰 답글 베이스라인",
              guide: `📍 [플레이스 상세 설명 표준안]\n"[${shortRegion} ${mainItem} 중점, ${cleanBrand}을 찾아주셔서 감사합니다]"\n✔ 주력 분야: ${cleanIdea}\n✔ 핵심 차별점: ${cleanTarget}\n✔ 위치 및 채널: ${cleanRegion}\n\n저희 ${cleanBrand}은(는) 찾아주시는 모든 ${prof.customerTerm}께 검증된 결과와 세심한 케어를 제공하기 위해 원칙을 지킵니다. 네이버 플레이스 [알림받기] 및 사전 예약/문의를 통해 더욱 편리하게 이용해 보세요!\n\n💬 [정성 리뷰 답글 표준안]\n"소중한 걸음으로 저희 ${cleanBrand}을(를) 믿고 찾아주신 데 이어 따뜻한 후기까지 남겨주셔서 진심으로 감사드립니다 😊 특히 '${mainItem}'과(와) '${coreStrength}' 부분에 만족하셨다니 큰 보람을 느낍니다. 앞으로도 ${shortRegion}에서 언제든 안심하고 찾으실 수 있도록 최선을 다하겠습니다!"`
            }
          ]
        },
        {
          page_name: "🥕 당근마켓 · 타깃 커뮤니티 / 상세페이지 & AI 활용",
          url_slug: "Local & Funnel AI",
          sections: [
            {
              name: "1. [당근·상세페이지 핵심 전략] 동네 진성 고객 및 구매 전환 설득 AI 워크플로우",
              guide: `💡 당근마켓 비즈프로필과 상세페이지는 **'광고 느낌을 뺀 진정성 있는 이웃 소통'**과 **'고객의 마지막 망설임을 깨는 5단계 설득 논리'**가 핵심입니다.\n\n🤖 [생성형 AI 단계별 활용 전략]\n• 뤼튼(Wrtn) / Claude: 동네 이웃에게 말 건네듯 친근하고 따뜻한 당근 비즈프로필 소식 & 단골 쿠폰 문구 작성\n• Claude / ChatGPT: 고객의 문제 제기(Problem) → 공감(Agitation) → 해결책(Solution) → 증거(Proof) → 제안(Offer) 구조의 고전환 상세페이지/안내문 설계`
            },
            {
              name: "2. [AI 마스터 프롬프트 #1] 당근마켓 동네소식 & 지역 커뮤니티 바이럴 원고 생성용 (📋 복사 후 뤼튼/Claude에 붙여넣기)",
              guide: `[복사해서 상단 뤼튼(Wrtn) 또는 Claude 로고 버튼을 눌러 붙여넣으세요]\n\n'${cleanRegion}' 반경 2km 내 거주하는 이웃 주민(${cleanTarget})들이 당근마켓 동네소식 피드에서 보고 바로 클릭해 [단골 맺기]와 [${prof.actionTerm}]을(를) 하게 만드는 당근 비즈프로필 소식 원고 4종을 작성해줘.\n\n- 상호명: ${cleanBrand} (${cleanCategory})\n- 주력 내용: ${cleanIdea}\n- 준수 기준: ${prof.complianceNote}\n\n[4종 구성]\n1) 우리 비즈니스 철학과 '${coreStrength}' 스토리를 담은 첫 인사 소식\n2) ${prof.customerTerm}들이 평소 자주 겪는 고민을 해결해 주는 유용한 생활/전문 칼럼형 소식\n3) 당근 이웃 전용 혜택/안내 소식\n4) 당근 단골 쿠폰 제목 및 상세 안내 문구`
            },
            {
              name: "3. [AI 마스터 프롬프트 #2] 전환율 2배 높이는 5단계 랜딩·상세페이지 카피 생성용 (📋 복사 후 Claude/ChatGPT에 붙여넣기)",
              guide: `[복사해서 상단 Claude 또는 ChatGPT 로고 버튼을 눌러 붙여넣으세요]\n\n너는 억대 매출을 만드는 디렉트 리스폰스(Direct Response) 카피라이터야.\n'${cleanBrand}'의 주력인 '${cleanIdea}'을(를) 소개하는 상세페이지(또는 원내/매장 브리핑 안내서·랜딩페이지)의 5단계 설득 카피를 작성해줘.\n\n1단계 [Hero 후킹]: 3초 만에 ${prof.customerTerm}의 시선을 붙잡는 헤드라인과 서브 카피 3가지 안\n2단계 [Problem 공감]: 기존에 다른 곳을 이용하며 겪었던 실망과 불안 포인트 짚어주기\n3단계 [Solution 해법]: '${cleanBrand}'만의 '${coreStrength}' 프로세스와 핵심 특장점 3가지\n4단계 [Social Proof 신뢰]: 수치·근거·실제 만족 포인트 제시 (${prof.complianceNote})\n5단계 [Action 행동유도]: 지금 바로 '${prof.actionTerm}'을(를) 해야 하는 명분과 클로징 카피`
            },
            {
              name: "4. [마케팅맵 실전 표준 원고 예시] 당근 비즈프로필 소식 & 랜딩 핵심 카피",
              guide: `🥕 [당근 동네소식 표준안]\n"안녕하세요, ${shortRegion} 이웃님들! ${cleanRegion}에서 '${cleanBrand}'을(를) 운영하고 있습니다 😊\n저희는 '${coreStrength}' 원칙으로 이웃님들께 정말 제대로 된 '${cleanIdea}'을(를) 선보이기 위해 매일 정성을 다하고 있어요.\n궁금하신 점은 언제든 당근 채팅이나 네이버 플레이스로 편하게 문의해 주세요. 우리 동네 이웃님들께 늘 믿음으로 보답하겠습니다 🧡"\n\n🎯 [상세·랜딩페이지 헤드카피 표준안]\n"기준이 까다로운 ${prof.customerTerm}일수록 결국 '${cleanBrand}'에 정착하는 이유 — ${cleanIdea}의 새로운 기준을 경험하세요."`
            }
          ]
        }
      ]
    };

    const db = {
      collections: prof.weeks
    };

    return {
      seo_marketing: seo,
      sitemap_ia: sitemap,
      db_schema: db,
      market_analysis: market
    };
  }

  const marketingSchemaPrompt = `너는 30년 경력의 대한민국 최정상 비즈니스 마케팅 컨설턴트 '오드리(Audrey)'다.
사용자가 입력한 [상호명, 업종 분류, 주력 메뉴/상품/진료/서비스, 지역/판매채널, 강점 및 타깃고객, 현재 마케팅 고민/예산]을 분석하여, 해당 업종(외식, 병의원/헬스케어, 부동산/인테리어, 제조/B2B, 이커머스, 뷰티, 교육/학원, 전문서비스 등)의 실제 생태계와 법적 기준(예: 병의원은 의료법 준수 및 환자·초진·재진·검진 용어 사용, 제조는 B2B 바이어·MOQ·납기 용어 사용 등)에 100% 일치하는 정밀 분석 데이터와 유튜브 포함 5대 채널의 생성형 AI(ChatGPT, Claude, Gemini, Perplexity, 뤼튼, Vrew 등) 활용 전략 및 마스터 프롬프트(특히 블로그는 SEO·AEO·GEO 최적화 반영)를 작성해야 한다.

출력 결과는 프론트엔드 파싱을 위해 어떠한 마크다운 코드블록 기호 없이 오직 아래 구조를 가진 하나의 완벽한 JSON 오브젝트로만 반환하라:
{
  "seo_marketing": {
    "target_analysis": "해당 업종 타깃 고객(환자/의뢰인/바이어/소비자)의 핵심 결핍(Pain Point) 및 선택 명분 정밀 분석",
    "golden_keywords": ["업종맞춤키워드1", "키워드2", "키워드3", "키워드4", "키워드5", "키워드6", "키워드7", "키워드8"],
    "meta_tags": {
      "title": "네이버 플레이스 & 검색 최적화 타이틀 (50자 내외)",
      "description": "클릭과 전환을 유도하는 플레이스/검색 요약 소개글 (150자 내외)"
    },
    "geo_qa": [
      {"q": "해당 업종 소비자가 AI 검색(챗GPT/네이버 AI 브리핑)에 물어볼 질문 1", "a": "우리 비즈니스가 1순위로 추천되도록 유도하는 전문 답변 1"},
      {"q": "질문 2", "a": "답변 2"},
      {"q": "질문 3", "a": "답변 3"},
      {"q": "질문 4", "a": "답변 4"},
      {"q": "질문 5", "a": "답변 5"}
    ],
    "conversion_funnel": [
      {"step": "1. 계기(Trigger) 단계 : 소비자가 SNS에서 서비스를 만날 계기", "action": "소비자가 유튜브·인스타·당근 등 SNS에서 서비스를 발견할 상세 마케팅 계기 전략"},
      {"step": "2. 목표(Target) 단계 : 포털이나 AI에 검색하고 질문하는 단계", "action": "포털이나 AI 검색에 키워드와 질문을 탐색하도록 유도하는 전략"},
      {"step": "3. 생각(Thinking) 단계 : 브랜드를 검증하는 단계", "action": "의구심을 해소하고 우리 브랜드의 전문성과 가치를 증명하는 전략"},
      {"step": "4. 실행(Action) 단계 : 서비스를 구매하는 단계", "action": "즉시 구매·예약·문의 행동을 촉구하는 마케팅 트리거 장치"},
      {"step": "5. 자기성찰(Introspection) 단계 : 후기를 작성하는 단계", "action": "만족 체감 후 자발적 후기 작성 및 리텐션 극대화 전략"}
    ]
  },
  "market_analysis": {
    "positioning_map": {
      "x_axis_left": "업종 맞춤 좌측 축", "x_axis_right": "업종 맞춤 우측 축",
      "y_axis_top": "적극적 유튜브·AI·검색 브랜딩", "y_axis_bottom": "단순 오프라인 의존",
      "competitors": [{"name": "업종별 실제 경쟁유형 A", "x": 36, "y": 72}, {"name": "경쟁유형 B", "x": 26, "y": 30}, {"name": "경쟁유형 C", "x": 72, "y": 34}],
      "our_brand": {"x": 85, "y": 85}
    },
    "feature_comparison": {
      "features": ["업종 맞춤 비교 지표 1", "비교 지표 2", "비교 지표 3", "비교 지표 4"],
      "competitors": [
        {"name": "일반 동종업체", "values": [false, false, false, true]},
        {"name": "대형 네트워크/기업형", "values": [false, false, true, false]}
      ],
      "our_brand": {"values": [true, true, true, true]}
    },
    "swot": {
      "strengths": ["업종 맞춤 강점 1", "강점 2"],
      "weaknesses": ["보완점 1", "보완점 2"],
      "opportunities": ["시장/트렌드 기회 1", "기회 2"],
      "threats": ["경쟁/규제 위협 1", "위협 2"]
    },
    "stp": {
      "segmentation": "해당 업종 시장/고객 세분화",
      "targeting": "핵심 타깃 고객 정의",
      "positioning": "타깃 머릿속에 각인시킬 한 줄 포지셔닝"
    },
    "tam_sam_som": {
      "tam": {"value": "잠재 수요 수치", "desc": "상권/시장 전체 잠재 수요 설명"},
      "sam": {"value": "유효 유입 수치", "desc": "온라인 마케팅 유효 도달 고객 설명"},
      "som": {"value": "목표 전환 수치", "desc": "3개월 내 확보할 핵심 고객 및 매출 설명"}
    },
    "bmc": {
      "key_partners": ["업종 맞춤 핵심 파트너 및 AI 툴"],
      "key_activities": ["주간 핵심 마케팅 루틴"],
      "key_resources": ["우리 비즈니스 핵심 자산"],
      "value_propositions": ["고객에게 제공하는 핵심 가치"],
      "customer_relationships": ["사후 케어 및 리텐션 전략"],
      "channels": ["유튜브 포함 주력 홍보 채널"],
      "customer_segments": ["핵심 타깃 페르소나"],
      "cost_structure": ["생성형 AI 활용 고효율 예산 구조"],
      "revenue_streams": ["객단가 상승 및 장기 매출 구조"]
    }
  },
  "sitemap_ia": {
    "pages": [
      {
        "page_name": "▶️ 유튜브 (롱폼 · 쇼츠 영상 & AI 활용)",
        "url_slug": "YouTube & Shorts AI",
        "sections": [
          {"name": "1. [유튜브 핵심 전략] 생성형 AI 종류별 조합 워크플로우", "guide": "ChatGPT, Claude, Gemini, Perplexity, Vrew 조합 전략"},
          {"name": "2. [AI 마스터 프롬프트 #1] 유튜브 쇼츠 후킹 주제 & 대본 생성용", "guide": "복사해서 AI에 바로 넣는 프롬프트"},
          {"name": "3. [AI 마스터 프롬프트 #2] 유튜브 롱폼 대본 & 썸네일 생성용", "guide": "복사해서 AI에 바로 넣는 프롬프트"},
          {"name": "4. [마케팅맵 실전 표준 대본 예시]", "guide": "우리 비즈니스 맞춤 쇼츠 표준 대본"}
        ]
      },
      {
        "page_name": "📝 네이버 블로그 (검색 상위노출 & AI 활용)",
        "url_slug": "Blog SEO · AEO · GEO",
        "sections": [
          {"name": "1. [블로그 핵심 전략] SEO + AEO(답변엔진) + GEO(생성형 AI 검색) 통합 워크플로우", "guide": "상세 전략"},
          {"name": "2. [AI 마스터 프롬프트 #1] SEO · AEO · GEO 동시 선점 전문가 칼럼 장문 작성용", "guide": "복사해서 Claude/뤼튼에 넣는 프롬프트"},
          {"name": "3. [AI 마스터 프롬프트 #2] AEO 질문-즉답형 & GEO 비교분석형 포스팅 변주용", "guide": "복사해서 ChatGPT/Gemini에 넣는 프롬프트"},
          {"name": "4. [마케팅맵 실전 표준 원고 예시]", "guide": "추천 제목 3선 및 AEO 요약박스 예시"}
        ]
      },
      {
        "page_name": "🎬 인스타그램 (릴스 · 카드뉴스 & AI 활용)",
        "url_slug": "Instagram Reels AI",
        "sections": [
          {"name": "1. [인스타그램 핵심 전략] AI 콘텐츠 공식", "guide": "상세 전략"},
          {"name": "2. [AI 마스터 프롬프트 #1] 저장각 7장 카드뉴스 기획용", "guide": "복사해서 쓰는 프롬프트"},
          {"name": "3. [AI 마스터 프롬프트 #2] 15초 릴스 대본 생성용", "guide": "복사해서 쓰는 프롬프트"},
          {"name": "4. [마케팅맵 실전 표준 원고 예시]", "guide": "표준 캡션 및 해시태그"}
        ]
      },
      {
        "page_name": "📍 스마트플레이스 · 지도 검색 & AI 활용",
        "url_slug": "SmartPlace & Local AI",
        "sections": [
          {"name": "1. [스마트플레이스 핵심 전략] AI 최적화 워크플로우", "guide": "상세 전략"},
          {"name": "2. [AI 마스터 프롬프트 #1] 플레이스 상세설명 최적화용", "guide": "복사해서 쓰는 프롬프트"},
          {"name": "3. [AI 마스터 프롬프트 #2] AI 정성 리뷰 답글 생성용", "guide": "복사해서 쓰는 프롬프트"},
          {"name": "4. [마케팅맵 실전 표준 원고 예시]", "guide": "플레이스 소개글 및 답글 예시"}
        ]
      },
      {
        "page_name": "🥕 당근마켓 · 타깃 커뮤니티 / 상세페이지 & AI 활용",
        "url_slug": "Local & Funnel AI",
        "sections": [
          {"name": "1. [당근·상세페이지 핵심 전략] AI 설득 워크플로우", "guide": "상세 전략"},
          {"name": "2. [AI 마스터 프롬프트 #1] 당근 동네소식 & 커뮤니티 원고용", "guide": "복사해서 쓰는 프롬프트"},
          {"name": "3. [AI 마스터 프롬프트 #2] 5단계 상세페이지 설득 카피용", "guide": "복사해서 쓰는 프롬프트"},
          {"name": "4. [마케팅맵 실전 표준 원고 예시]", "guide": "당근 소식 및 상세 헤드카피 예시"}
        ]
      }
    ]
  },
  "db_schema": {
    "collections": [
      {
        "collection_name": "1. 브랜드 탄생 배경 & 철학 (Why We Started)",
        "fields": [{"field_name": "스토리 구성 요소", "type": "핵심 메시지 · 예시", "description": "우리 비즈니스 맞춤형 브랜드 스토리 예시 및 왜 스토리를 만들어야 하는지에 대한 가이드"}]
      },
      {
        "collection_name": "2. 타협하지 않는 기준 & 장인정신 (Our Craft)",
        "fields": [{"field_name": "스토리 구성 요소", "type": "전문성 · 차별화", "description": "품질과 원칙에 대한 브랜드 스토리 예시"}]
      },
      {
        "collection_name": "3. 고객에게 드리는 3대 약속 (Customer Promise)",
        "fields": [{"field_name": "스토리 구성 요소", "type": "브랜드 약속", "description": "고객의 불안을 해소하는 브랜드 약속 예시"}]
      },
      {
        "collection_name": "4. 채널별 실전 완성본 & AI 스토리 생성 프롬프트",
        "fields": [{"field_name": "스토리 구성 요소", "type": "실전 원고 · AI 프롬프트", "description": "플레이스/홈페이지용 완성본 및 AI 브랜드 스토리 생성 마스터 프롬프트"}]
      }
    ]
  }
}`;

  // --- Google Gemini AI API Call ---
  async function generateWithGemini(apiKey, model, brand, category, idea, region, target, revenue) {
    const userPrompt = `상호명(브랜드명): ${brand}
업종 분류: ${category}
주력 메뉴/상품: ${idea}
지역(상권)/판매채널: ${region}
우리 비즈니스 강점 및 주요 고객층: ${target}
현재 가장 시급한 마케팅 고민 및 예산: ${revenue}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: marketingSchemaPrompt + '\n\n' + userPrompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.35
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Google Gemini API 호출 에러 (Status: ${response.status})`);
    }

    const resJson = await response.json();
    const content = resJson.candidates[0].content.parts[0].text;
    return JSON.parse(cleanJsonString(content));
  }

  // --- Real OpenAI API Call ---
  async function generateWithOpenAI(apiKey, model, brand, category, idea, region, target, revenue) {
    const userPrompt = `상호명(브랜드명): ${brand}
업종 분류: ${category}
주력 메뉴/상품: ${idea}
지역(상권)/판매채널: ${region}
우리 비즈니스 강점 및 주요 고객층: ${target}
현재 가장 시급한 마케팅 고민 및 예산: ${revenue}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        response_format: { type: "json_object" },
        temperature: 0.35,
        messages: [
          { role: 'system', content: marketingSchemaPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'OpenAI API 호출 에러');
    }

    const resJson = await response.json();
    const content = resJson.choices[0].message.content;
    return JSON.parse(cleanJsonString(content));
  }

  // --- Dynamic Renderer ---
  function renderBlueprint(data, brand, category, idea, region, target) {
    generatedData = data;
    if (typeof updateMarketingGiftBanner === 'function') {
      updateMarketingGiftBanner();
    }
    
    const cleanBrand = stripHtmlTags(brand) || '우리 매장';
    const cleanCategory = stripHtmlTags(category) || '';
    const cleanIdea = stripHtmlTags(idea);
    const cleanRegion = stripHtmlTags(region);
    const cleanTarget = stripHtmlTags(target);

    displayProjectName.textContent = `${cleanBrand} (${cleanIdea.length > 18 ? cleanIdea.substring(0, 16) + '...' : cleanIdea})`;
    displayProjectTarget.textContent = `지역/채널: ${cleanRegion} | 강점·타깃: ${cleanTarget}`;
    
    if (googlePreviewSlug) {
      googlePreviewSlug.textContent = encodeURIComponent(cleanBrand.replace(/\s+/g, '-'));
    }

    // --- 0. GEO Panel Q&A ---
    if (geoQaContainer) {
      geoQaContainer.innerHTML = '';
      if (data.seo_marketing.geo_qa && data.seo_marketing.geo_qa.length > 0) {
        data.seo_marketing.geo_qa.forEach(qa => {
          const item = document.createElement('div');
          item.className = 'geo-qa-item';
          item.innerHTML = `
            <div class="geo-question">${qa.q}</div>
            <div class="geo-answer">${qa.a}</div>
          `;
          geoQaContainer.appendChild(item);
        });
      } else {
        geoQaContainer.innerHTML = '<p class="section-desc">GEO 분석 로딩 중...</p>';
      }
    }
    
    // --- 1. SEO & Marketing Panel ---
    const seo = data.seo_marketing;
    seoPainPoint.textContent = seo.target_analysis;
    
    // Keywords (Click to Copy)
    seoKeywords.innerHTML = '';
    seo.golden_keywords.forEach((keyword, idx) => {
      const chip = document.createElement('div');
      chip.className = 'keyword-chip';
      chip.title = '클릭하여 키워드 복사';
      chip.innerHTML = `<span class="keyword-rank">#${idx+1}</span> <span>${keyword}</span>`;
      chip.addEventListener('click', () => {
        navigator.clipboard.writeText(keyword).then(() => {
          const origHtml = chip.innerHTML;
          chip.innerHTML = `<span class="keyword-rank">✅</span> <span>복사됨: ${keyword}</span>`;
          setTimeout(() => { chip.innerHTML = origHtml; }, 1200);
        });
      });
      seoKeywords.appendChild(chip);
    });
    
    // Search Preview
    googlePreviewTitle.textContent = seo.meta_tags.title;
    googlePreviewDesc.textContent = seo.meta_tags.description;
    
    // 3TAI Funnel
    seoFunnel.innerHTML = '';
    if (seo.conversion_funnel) {
      seo.conversion_funnel.forEach((step, idx) => {
        const stepCard = document.createElement('div');
        stepCard.className = 'funnel-step-card';
        stepCard.innerHTML = `
          <div class="step-num">STEP 0${idx+1}</div>
          <div class="step-name">${step.step}</div>
          <p class="step-action">${step.action}</p>
        `;
        seoFunnel.appendChild(stepCard);
      });
    }
    
    // --- 2. Market Analysis Panel ---
    const ma = data.market_analysis;
    if (ma) {
      const matrixDotsContainer = document.getElementById('matrix-dots-container');
      if (matrixDotsContainer) {
        matrixDotsContainer.innerHTML = '';

        if (ma.positioning_map) {
          const lblXL = document.querySelector('.axis-lbl-x-left');
          const lblXR = document.querySelector('.axis-lbl-x-right');
          const lblYT = document.querySelector('.axis-lbl-y-top');
          const lblYB = document.querySelector('.axis-lbl-y-bottom');
          if (lblXL && ma.positioning_map.x_axis_left) lblXL.textContent = ma.positioning_map.x_axis_left;
          if (lblXR && ma.positioning_map.x_axis_right) lblXR.textContent = ma.positioning_map.x_axis_right;
          if (lblYT && ma.positioning_map.y_axis_top) lblYT.textContent = ma.positioning_map.y_axis_top;
          if (lblYB && ma.positioning_map.y_axis_bottom) lblYB.textContent = ma.positioning_map.y_axis_bottom;
        }
        
        if (ma.positioning_map && ma.positioning_map.competitors) {
          // Ensure clean, non-overlapping quadrant positions matching the classic Perceptual Map
          const fallbackCoords = [
            { x: 26, y: 74 }, // Top-Left (Competitor A)
            { x: 24, y: 24 }, // Bottom-Left (Competitor B - Pink circle in reference)
            { x: 64, y: 36 }  // Bottom-Right (Competitor C - Peach circle in reference)
          ];
          ma.positioning_map.competitors.forEach((c, index) => {
            const dot = document.createElement('div');
            const coord = fallbackCoords[index % fallbackCoords.length];
            dot.className = `matrix-dot pm-circle-node competitor-${String.fromCharCode(97 + (index % 3))}`;
            dot.style.left = `${coord.x}%`;
            dot.style.top = `${100 - coord.y}%`;
            dot.innerHTML = `<span class="pm-node-sub">경쟁사 ${String.fromCharCode(65 + index)}</span><strong class="pm-node-name">${c.name}</strong>`;
            dot.title = c.name;
            matrixDotsContainer.appendChild(dot);
          });
        }
        
        const ourDot = document.createElement('div');
        ourDot.className = 'matrix-dot pm-circle-node our-brand';
        ourDot.style.left = `73%`;
        ourDot.style.top = `25%`;
        const shortBrand = cleanBrand.length > 10 ? cleanBrand.substring(0, 9) + '..' : cleanBrand;
        ourDot.innerHTML = `<span class="pm-node-sub">자사 브랜드</span><strong class="pm-node-name">${shortBrand}</strong>`;
        ourDot.title = cleanBrand;
        matrixDotsContainer.appendChild(ourDot);
      }
      
      // Feature comparison table
      const featureHeader = document.getElementById('feature-table-header');
      const featureBody = document.getElementById('feature-table-body');
      if (featureHeader && featureBody && ma.feature_comparison) {
        featureHeader.innerHTML = `<th>핵심 비교 포인트</th><th>${cleanBrand} (우리 비즈니스)</th>`;
        ma.feature_comparison.competitors.forEach(comp => {
          const th = document.createElement('th');
          th.textContent = comp.name;
          featureHeader.appendChild(th);
        });
        
        featureBody.innerHTML = '';
        ma.feature_comparison.features.forEach((feat, featIdx) => {
          const tr = document.createElement('tr');
          
          const tdName = document.createElement('td');
          tdName.style.fontWeight = '700';
          tdName.textContent = feat;
          tr.appendChild(tdName);
          
          const tdOur = document.createElement('td');
          const ourHas = ma.feature_comparison.our_brand.values[featIdx];
          tdOur.className = ourHas ? 'feature-check-yes' : 'feature-check-no';
          tdOur.textContent = ourHas ? '✅' : '❌';
          tr.appendChild(tdOur);
          
          ma.feature_comparison.competitors.forEach(comp => {
            const tdComp = document.createElement('td');
            const compHas = comp.values[featIdx];
            tdComp.className = compHas ? 'feature-check-yes' : 'feature-check-no';
            tdComp.textContent = compHas ? '✅' : '❌';
            tr.appendChild(tdComp);
          });
          
          featureBody.appendChild(tr);
        });
      }
      
      // 1. SWOT analysis & Cross-SWOT Action Matrix
      const strengthsList = document.getElementById('swot-strengths-list');
      const weaknessesList = document.getElementById('swot-weaknesses-list');
      const opportunitiesList = document.getElementById('swot-opportunities-list');
      const threatsList = document.getElementById('swot-threats-list');
      
      if (strengthsList && ma.swot) {
        const renderList = (el, items) => {
          el.innerHTML = '';
          if (items) {
            items.forEach(item => {
              const li = document.createElement('li');
              li.textContent = item;
              el.appendChild(li);
            });
          }
        };
        renderList(strengthsList, ma.swot.strengths);
        renderList(weaknessesList, ma.swot.weaknesses);
        renderList(opportunitiesList, ma.swot.opportunities);
        renderList(threatsList, ma.swot.threats);
      }

      const ideaItems = (idea || '').split(/[,/·]/).map(s => s.trim()).filter(Boolean);
      const mainItemName = ideaItems[0] || idea || '주력 시그니처';
      const secondItemName = ideaItems[1] || '패키지·부가 프로그램';
      const targetCore = (target || '').split(/[,/]/)[0].trim() || '맞춤형 전문 케어';
      const shortReg = (region || '').split(' ').slice(0, 2).join(' ') || region || '핵심 상권';

      const swotCrossGrid = document.getElementById('swot-cross-grid');
      if (swotCrossGrid) {
        swotCrossGrid.innerHTML = `
          <div class="cross-swot-card">
            <div class="cross-head">
              <span class="cross-badge cross-so">S × O 공격 전략</span>
              <strong>자사 강점으로 시장 기회 선점</strong>
            </div>
            <p>'${mainItemName}' 시그니처 경쟁력과 '${targetCore}' 강점을 유튜브 쇼츠·릴스 및 네이버 플레이스 대표 키워드와 결합해 ${shortReg} 내 1순위 브랜드로 빠르게 선점합니다.</p>
          </div>
          <div class="cross-swot-card">
            <div class="cross-head">
              <span class="cross-badge cross-st">S × T 차별화 전략</span>
              <strong>핵심 역량으로 경쟁사 위협 돌파</strong>
            </div>
            <p>주변 경쟁사의 단순 가격 인하(덤핑) 경쟁에 휘말리지 않고, '${cleanBrand}'만의 검증된 과정과 브랜드 스토리를 전면에 내세워 고관여 진성 고객을 흡수합니다.</p>
          </div>
          <div class="cross-swot-card">
            <div class="cross-head">
              <span class="cross-badge cross-wo">W × O 보완 전략</span>
              <strong>생성형 AI & 신규 채널로 약점 극복</strong>
            </div>
            <p>초기 인지도 및 마케팅 인력 부족 문제를 생성형 AI(ChatGPT·Claude·Vrew) 자동화 파이프라인과 AI 검색(AEO·GEO) 최적화 칼럼으로 레버리지하여 저비용 고효율 노출을 달성합니다.</p>
          </div>
          <div class="cross-swot-card">
            <div class="cross-head">
              <span class="cross-badge cross-wt">W × T 방어 전략</span>
              <strong>단골 리텐션으로 외부 리스크 방어</strong>
            </div>
            <p>유료 광고비 상승 리스크를 줄이기 위해 1회 방문·이용 고객의 영수증 리뷰 자산화 및 재방문 혜택(CRM)을 체계화하여 흔들리지 않는 고정 단골 매출 기반을 구축합니다.</p>
          </div>
        `;
      }

      // 2. BCG Growth-Share Matrix (자사 브랜드 상품·서비스 포트폴리오 진단 및 자원 배분)
      const bcgStarTitle = document.getElementById('bcg-star-title');
      const bcgStarDesc = document.getElementById('bcg-star-desc');
      const bcgQuestionTitle = document.getElementById('bcg-question-title');
      const bcgQuestionDesc = document.getElementById('bcg-question-desc');
      const bcgCashcowTitle = document.getElementById('bcg-cashcow-title');
      const bcgCashcowDesc = document.getElementById('bcg-cashcow-desc');
      const bcgDogTitle = document.getElementById('bcg-dog-title');
      const bcgDogDesc = document.getElementById('bcg-dog-desc');

      if (bcgStarTitle) {
        bcgStarTitle.textContent = `[Star 주력군] '${mainItemName}' (${cleanBrand} 대표 시그니처 상품·서비스)`;
        bcgStarDesc.textContent = `시장 성장률과 상대적 점유율이 모두 높은 ${cleanBrand}의 핵심 성장 동력입니다. 마케팅 예산과 노출 자원의 50% 이상을 최우선 배분하여 '${shortReg}' 내 압도적 1위 대표 상품으로 격차를 굳혀야 합니다.`;
      }
      if (bcgQuestionTitle) {
        bcgQuestionTitle.textContent = `[Question Mark 육성군] '${secondItemName}' 및 신규 타깃 특화 패키지`;
        bcgQuestionDesc.textContent = `시장 수요 증가율은 높으나 아직 자사 브랜드 내 점유율이 낮은 유망 상품군입니다. 첫 이용 프로모션과 세트 결합 테스트로 고객 반응(전환율)을 검증한 뒤 차세대 Star 상품으로 육성합니다.`;
      }
      if (bcgCashcowTitle) {
        bcgCashcowTitle.textContent = `[Cash Cow 수익군] '${targetCore}' 기반 단골 반복 구매 스테디셀러`;
        bcgCashcowDesc.textContent = `이미 충성 고객층이 확보되어 추가 광고비 지출 없이도 매월 안정적인 현금(Cash)과 수익을 창출하는 효자 상품군입니다. 여기서 발생한 수익을 Star와 Question Mark 육성 자금으로 순환시킵니다.`;
      }
      if (bcgDogTitle) {
        bcgDogTitle.textContent = `[Dog 정리군] 마진율·회전율이 모두 낮은 비인기 단품 및 비효율 구색 품목`;
        bcgDogDesc.textContent = `시장 성장성과 수익 기여도가 모두 낮은 영역입니다. 과감히 품목을 축소·폐기하여 운영 피로도를 줄이거나, '${mainItemName}' 주력 상품을 돋보이게 하는 사은·업셀링 구성으로 리패키징합니다.`;
      }
      
      // 3. Perceptual Mapping & STP Strategy
      const stpSeg = document.getElementById('stp-segmentation-text');
      const stpTar = document.getElementById('stp-targeting-text');
      const stpPos = document.getElementById('stp-positioning-text');
      if (stpSeg && ma.stp) {
        stpSeg.textContent = ma.stp.segmentation;
        stpTar.textContent = ma.stp.targeting;
        stpPos.textContent = ma.stp.positioning;
      }
    }
    
    // --- 3. Channel Promotional Content Panel (formerly IA) ---
    const ia = data.sitemap_ia;
    iaPageList.innerHTML = '';
    
    if (ia.pages && ia.pages.length > 0) {
      ia.pages.forEach((page, idx) => {
        const btn = document.createElement('button');
        btn.className = `ia-page-btn ${idx === 0 ? 'active' : ''}`;
        btn.innerHTML = `
          <span>${page.page_name}</span>
          <span class="ia-page-arrow">→</span>
        `;
        btn.addEventListener('click', () => {
          document.querySelectorAll('.ia-page-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          renderSelectedPage(page);
        });
        iaPageList.appendChild(btn);
      });
      renderSelectedPage(ia.pages[0]);
    }

    // --- 4. Brand Story Panel (브랜드 스토리 코너) ---
    const db = data.db_schema;
    dbCollectionList.innerHTML = '';
    
    if (db.collections && db.collections.length > 0) {
      db.collections.forEach((col, idx) => {
        const btn = document.createElement('button');
        btn.className = `db-table-btn ${idx === 0 ? 'active' : ''}`;
        btn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
          </svg>
          <span>${col.collection_name}</span>
        `;
        btn.addEventListener('click', () => {
          document.querySelectorAll('.db-table-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          renderSelectedTable(col);
        });
        dbCollectionList.appendChild(btn);
      });
      renderSelectedTable(db.collections[0]);
    }
  }

  function renderSelectedPage(page) {
    activePageData = page;
    selectedPageTitle.textContent = page.page_name;
    selectedPageSlug.textContent = page.url_slug;
    
    selectedPageSections.innerHTML = '';
    if (page.sections && page.sections.length > 0) {
      page.sections.forEach((sec, idx) => {
        const flowCard = document.createElement('div');
        flowCard.className = 'section-flow-card';
        flowCard.innerHTML = `
          <div class="flow-card-header">
            <span class="flow-card-name">${sec.name}</span>
            <span class="flow-card-step" style="cursor:pointer;" title="클릭하여 이 문구 복사">📋 복사</span>
          </div>
          <p class="flow-card-guide">${sec.guide}</p>
        `;
        const copyBadge = flowCard.querySelector('.flow-card-step');
        if (copyBadge) {
          copyBadge.addEventListener('click', () => {
            navigator.clipboard.writeText(`${sec.name}\n${sec.guide}`).then(() => {
              copyBadge.textContent = '✅ 복사완료!';
              setTimeout(() => { copyBadge.textContent = '📋 복사'; }, 1200);
            });
          });
        }
        selectedPageSections.appendChild(flowCard);
      });
    }
  }

  if (btnCopyChannelContent) {
    btnCopyChannelContent.addEventListener('click', () => {
      if (!activePageData || !activePageData.sections) return;
      const isLoggedIn = localStorage.getItem('is_logged_in') === 'true';
      if (!isLoggedIn) {
        window.pendingCopyChannel = true;
        showLoginModal('📋 채널별 전체 AI 프롬프트 및 원고 패키지 일괄 복사는 <strong>무료 회원 전용 기능</strong>입니다.<br>3초 간편가입 후 모든 채널 원고를 무제한 복사해 가세요!', 'register');
        return;
      }
      const fullText = `[${activePageData.page_name}]\n\n` + activePageData.sections.map(s => `■ ${s.name}\n${s.guide}`).join('\n\n');
      navigator.clipboard.writeText(fullText).then(() => {
        const origText = btnCopyChannelContent.textContent;
        btnCopyChannelContent.textContent = '✅ 채널 원고 복사 완료!';
        setTimeout(() => { btnCopyChannelContent.textContent = origText; }, 1500);
      });
    });
  }

  const btnCopyBrandStory = document.getElementById('btn-copy-brand-story');
  if (btnCopyBrandStory) {
    btnCopyBrandStory.addEventListener('click', () => {
      if (!activeTableData || !activeTableData.fields) return;
      const isLoggedIn = localStorage.getItem('is_logged_in') === 'true';
      if (!isLoggedIn) {
        window.pendingCopyStory = true;
        showLoginModal('📖 우리 비즈니스 맞춤 브랜드 스토리 전체 복사는 <strong>무료 회원 전용 기능</strong>입니다.<br>3초 간편가입 후 전체 스토리를 복사해 가세요!', 'register');
        return;
      }
      const fullStoryText = `[${activeTableData.collection_name}]\n\n` + activeTableData.fields.map(f => `■ ${f.field_name} (${f.type})\n${f.description}`).join('\n\n');
      navigator.clipboard.writeText(fullStoryText).then(() => {
        const origText = btnCopyBrandStory.textContent;
        btnCopyBrandStory.textContent = '✅ 브랜드 스토리 복사 완료!';
        setTimeout(() => { btnCopyBrandStory.textContent = origText; }, 1500);
      });
    });
  }

  function renderSelectedTable(table) {
    activeTableData = table;
    selectedTableTitle.textContent = table.collection_name;
    
    selectedTableFields.innerHTML = '';
    if (table.fields && table.fields.length > 0) {
      table.fields.forEach(field => {
        const row = document.createElement('tr');
        row.style.cursor = 'pointer';
        row.title = '클릭하면 이 브랜드 스토리 예시 문구가 복사됩니다';
        
        let typeClass = 'text';
        const typeLower = field.type.toLowerCase();
        if (typeLower.includes('슬로건') || typeLower.includes('핵심') || typeLower.includes('원칙') || typeLower.includes('선언')) {
          typeClass = 'number';
        } else if (typeLower.includes('인스타') || typeLower.includes('블로그') || typeLower.includes('차별화') || typeLower.includes('기원')) {
          typeClass = 'date';
        } else if (typeLower.includes('프롬프트') || typeLower.includes('팬덤') || typeLower.includes('보증') || typeLower.includes('플레이스')) {
          typeClass = 'relation';
        }
        
        row.innerHTML = `
          <td class="db-field-name-cell" style="font-family: var(--font-sans); font-weight: 700;">📖 ${field.field_name}</td>
          <td><span class="type-badge ${typeClass}">${field.type}</span></td>
          <td class="db-field-desc" style="white-space: pre-line; line-height: 1.65;">${field.description}</td>
        `;
        row.addEventListener('click', () => {
          navigator.clipboard.writeText(`[${field.field_name}]\n${field.description}`).then(() => {
            const nameCell = row.querySelector('.db-field-name-cell');
            if (nameCell) {
              const orig = nameCell.innerHTML;
              nameCell.innerHTML = `✅ 복사 완료!`;
              setTimeout(() => { nameCell.innerHTML = orig; }, 1200);
            }
          });
        });
        selectedTableFields.appendChild(row);
      });
    }
  }

  // --- High-Tech HUD Animation Sequence ---
  function runHudScan(callback) {
    hudLoading.classList.remove('hidden');
    
    let progress = 0;
    hudPct.textContent = '0%';
    hudProgressFill.style.width = '0%';
    
    hudLines.forEach((line, idx) => {
      line.className = 'hud-console-line';
      if (idx === 0) line.classList.add('active');
    });

    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 6) + 4;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        
        hudLines.forEach(line => {
          line.classList.remove('active');
          line.classList.add('done');
        });
        
        setTimeout(() => {
          hudLoading.classList.add('hidden');
          callback();
        }, 450);
      }
      
      hudPct.textContent = `${progress}%`;
      hudProgressFill.style.width = `${progress}%`;
      
      if (progress >= 20 && progress < 45) {
        hudLines[0].className = 'hud-console-line done';
        hudLines[1].className = 'hud-console-line active';
      } else if (progress >= 45 && progress < 65) {
        hudLines[1].className = 'hud-console-line done';
        hudLines[2].className = 'hud-console-line active';
      } else if (progress >= 65 && progress < 85) {
        hudLines[2].className = 'hud-console-line done';
        hudLines[3].className = 'hud-console-line active';
      } else if (progress >= 85 && progress < 100) {
        hudLines[3].className = 'hud-console-line done';
        hudLines[4].className = 'hud-console-line active';
      }
    }, 95);
  }

  // --- Form Submission Handler ---
  blueprintForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const brand = (document.getElementById('input-brand')?.value || '').trim();
    const category = getResolvedCategory();
    const idea = document.getElementById('input-idea').value.trim();
    const region = (document.getElementById('input-region')?.value || '').trim();
    const target = document.getElementById('input-target').value.trim();
    const revenue = document.getElementById('input-revenue').value.trim();
    
    if (!brand || !idea || !region || !target || !revenue) return;

    // Gating for 2nd generation: 1st generation is 100% free for guests!
    const isLoggedIn = localStorage.getItem('is_logged_in') === 'true';
    let guestGenCount = parseInt(localStorage.getItem('guest_gen_count') || '0', 10);

    if (!isLoggedIn && guestGenCount >= 1) {
      window.pendingGenerationAction = () => {
        btnGenerate.click();
      };
      showLoginModal('🎉 대표님의 첫 번째 마케팅 전략이 성공적으로 설계되었습니다!<br>새로운 마케팅 전략 추가 분석 및 무제한 이용을 위해 <strong>3초 무료 간편가입</strong>을 완료해 주세요.', 'register');
      return;
    }
    
    const provider = localStorage.getItem('ai_provider') || 'local';
    const geminiKey = localStorage.getItem('gemini_api_key');
    const geminiModel = localStorage.getItem('gemini_model') || 'gemini-1.5-flash';
    const openaiKey = localStorage.getItem('openai_api_key');
    const openaiModel = localStorage.getItem('openai_model') || 'gpt-4o';
    
    btnGenerate.disabled = true;
    btnGenerate.style.opacity = '0.7';
    
    runHudScan(async () => {
      try {
        let blueprintResult = null;
        
        if (provider === 'gemini' && geminiKey) {
          try {
            blueprintResult = await generateWithGemini(geminiKey, geminiModel, brand, category, idea, region, target, revenue);
            engineTypeText.textContent = `Active (Gemini AI Engine - ${geminiModel})`;
          } catch (geminiError) {
            console.warn('Gemini API Error, falling back to local engine:', geminiError);
            blueprintResult = getLocalBlueprint(brand, category, idea, region, target, revenue);
            engineTypeText.textContent = 'Active (Audrey Local Engine - Fallback)';
          }
        } else if (provider === 'openai' && openaiKey) {
          try {
            blueprintResult = await generateWithOpenAI(openaiKey, openaiModel, brand, category, idea, region, target, revenue);
            engineTypeText.textContent = `Active (OpenAI AI Engine - ${openaiModel})`;
          } catch (openaiError) {
            console.warn('OpenAI API Error, falling back to local engine:', openaiError);
            blueprintResult = getLocalBlueprint(brand, category, idea, region, target, revenue);
            engineTypeText.textContent = 'Active (Audrey Local Engine - Fallback)';
          }
        } else {
          blueprintResult = getLocalBlueprint(brand, category, idea, region, target, revenue);
          engineTypeText.textContent = 'Active (Audrey Local Marketing Engine)';
        }
        
        if (!blueprintResult) {
          blueprintResult = getLocalBlueprint(brand, category, idea, region, target, revenue);
        }
        
        resultsPlaceholder.classList.add('hidden');
        resultsDashboard.classList.remove('hidden');
        
        renderBlueprint(blueprintResult, brand, category, idea, region, target);
        addBlueprintToArchive(brand, category, idea, region, target, revenue, blueprintResult);

        if (!isLoggedIn) {
          guestGenCount++;
          localStorage.setItem('guest_gen_count', guestGenCount.toString());
        }

        resultsDashboard.scrollIntoView({ behavior: 'smooth' });
        
      } catch (err) {
        alert(`마케팅 전략 생성 중 에러가 발생했습니다: ${err.message}`);
      } finally {
        btnGenerate.disabled = false;
        btnGenerate.style.opacity = '1';
      }
    });
  });

  // --- Copy Strategy JSON to Clipboard ---
  btnCopyJson.addEventListener('click', () => {
    if (!generatedData) return;
    const isLoggedIn = localStorage.getItem('is_logged_in') === 'true';
    if (!isLoggedIn) {
      showLoginModal('전체 마케팅 전략 데이터 복사는 <strong>무료 회원 전용</strong>입니다.<br>3초 간편가입 후 즉시 이용해 보세요.', 'register');
      return;
    }
    
    const jsonStr = JSON.stringify(generatedData, null, 2);
    navigator.clipboard.writeText(jsonStr)
      .then(() => {
        alert('전체 마케팅 전략 데이터가 클립보드에 복사되었습니다!');
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
      });
  });

  // --- Save to Archive & Export JSON File ---
  btnExportJson.addEventListener('click', () => {
    if (!generatedData) return;
    const isLoggedIn = localStorage.getItem('is_logged_in') === 'true';
    if (!isLoggedIn) {
      window.pendingSaveArchive = true;
      showLoginModal('🗂️ 분석한 마케팅 전략이 사라지지 않도록 <strong>대표님 계정 보관함에 안전하게 저장</strong>하세요.<br>무료 회원가입 후 언제든 다시 불러올 수 있습니다.', 'register');
      return;
    }
    
    const brand = (document.getElementById('input-brand')?.value || '오드리고깃집').trim();
    const category = getResolvedCategory();
    const idea = (document.getElementById('input-idea')?.value || '').trim();
    const region = (document.getElementById('input-region')?.value || '').trim();
    const target = (document.getElementById('input-target')?.value || '').trim();
    const revenue = (document.getElementById('input-revenue')?.value || '').trim();

    addBlueprintToArchive(brand, category, idea, region, target, revenue, generatedData);
    alert(`'${brand}' 마케팅 전략이 상단 [보관함]에 안전하게 저장되었습니다!`);
  });

  // --- Export Marketing Strategy PDF Report ---
  const btnDownloadPdf = document.getElementById('btn-download-pdf');
  if (btnDownloadPdf) {
    btnDownloadPdf.addEventListener('click', () => {
      if (!generatedData) {
        alert('마케팅 전략이 아직 생성되지 않았습니다. 먼저 좌측 폼을 입력해 전략을 생성해 주세요.');
        return;
      }

      const isLoggedIn = localStorage.getItem('is_logged_in') === 'true';
      if (!isLoggedIn) {
        window.pendingDownloadPdf = true;
        showLoginModal('📄 마케팅 전략서 <strong>A4 리포트 인쇄 및 평생 소장(PDF)</strong>은 무료 회원 전용 기능입니다.<br>3초 간편가입 즉시 무료로 인쇄·출력하실 수 있습니다.', 'register');
        return;
      }
      
      const brandVal = (document.getElementById('input-brand')?.value || displayProjectName.textContent).trim();
      const categoryVal = getResolvedCategory();
      const ideaVal = document.getElementById('input-idea').value.trim();
      const regionVal = (document.getElementById('input-region')?.value || '지역 상권').trim();
      const targetVal = document.getElementById('input-target').value.trim();
      const revenueVal = document.getElementById('input-revenue').value.trim();
      
      let printContainer = document.getElementById('print-report-container');
      if (!printContainer) {
        printContainer = document.createElement('div');
        printContainer.id = 'print-report-container';
        document.body.appendChild(printContainer);
      }
      
      const seo = generatedData.seo_marketing;
      const ia = generatedData.sitemap_ia;
      const db = generatedData.db_schema;
      
      let funnelHtml = '';
      if (seo.conversion_funnel) {
        seo.conversion_funnel.forEach(step => {
          funnelHtml += `
            <div class="print-box" style="margin-bottom: 10px; padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
              <div class="print-box-title" style="font-weight: 700; color: #ea580c; font-size: 10px; margin-bottom: 4px;">${step.step}</div>
              <div class="print-box-content" style="font-size: 9px; color: #334155; line-height: 1.4;">${step.action}</div>
            </div>
          `;
        });
      }
      
      let keywordsHtml = '';
      if (seo.golden_keywords) {
        seo.golden_keywords.forEach(kw => {
          keywordsHtml += `<span class="print-keyword-chip" style="display: inline-block; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 12px; padding: 4px 10px; font-size: 9px; margin-right: 6px; margin-bottom: 6px;"># ${kw}</span>`;
        });
      }
      
      let sitemapHtml = '';
      if (ia.pages) {
        ia.pages.slice(0, 3).forEach(p => {
          sitemapHtml += `
            <div style="margin-bottom: 10px; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; background: #f8fafc;">
              <div style="font-weight: 700; color: #111111; font-size: 10px; margin-bottom: 4px;">${p.page_name}</div>
              <table style="width: 100%; border-collapse: collapse;">
                <tbody>
                  ${p.sections.map(s => `
                    <tr>
                      <td style="border: 1px solid #cbd5e1; padding: 4px; font-size: 8px; font-weight: 600; width: 28%;">${s.name}</td>
                      <td style="border: 1px solid #cbd5e1; padding: 4px; font-size: 8px; color: #475569; white-space: pre-line;">${s.guide}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `;
        });
      }
      
      let dbHtml = '';
      if (db.collections) {
        db.collections.forEach(c => {
          dbHtml += `
            <div style="margin-bottom: 10px; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; background: #f8fafc;">
              <div style="font-weight: 700; color: #ea580c; font-size: 10px; margin-bottom: 4px;">${c.collection_name}</div>
              <table style="width: 100%; border-collapse: collapse;">
                <tbody>
                  ${c.fields.map(f => `
                    <tr>
                      <td style="border: 1px solid #cbd5e1; padding: 4px; font-size: 8px; font-weight: 700; width: 28%;">📖 ${f.field_name}</td>
                      <td style="border: 1px solid #cbd5e1; padding: 4px; font-size: 8px; color: #334155; white-space: pre-line;">${f.description}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `;
        });
      }
      
      printContainer.innerHTML = `
        <div class="print-page cover-slide">
          <div class="cover-title">${brandVal}</div>
          <div class="cover-subtitle">${categoryVal} 맞춤 실전 마케팅 전략 리포트</div>
          <div class="cover-divider"></div>
          <div class="cover-slogan">" ${seo.meta_tags.title} "</div>
          <div class="cover-target">지역/채널: ${regionVal} | 주력 상품: ${ideaVal}</div>
          <div style="margin-top: 12px; font-size: 11px; color: #475569;">강점·타깃: ${targetVal}<br>핵심 목표: ${revenueVal}</div>
          <div class="cover-meta">
            Designed by Audrey AI Marketing Consultant / MarketingMap Studio
          </div>
        </div>
        
        <div class="print-page">
          <div class="print-header">
            <h4>01. 이영현 교수의 5단계 마케팅 로드맵 (3TAI 전략 & SEO)</h4>
            <span>${brandVal} - Page 2</span>
          </div>
          <div class="print-body">
            <div class="slide-title">이영현 교수의 5단계 마케팅 로드맵 (3TAI 전략)</div>
            <div class="print-box" style="padding: 12px;">
              <div class="print-box-title">우리 비즈니스 방문 명분 & 타깃 분석</div>
              <div class="print-box-content">${seo.target_analysis}</div>
            </div>
            ${funnelHtml}
            <div style="margin-top: 8px;">
              <div style="font-weight: 700; font-size: 10px; margin-bottom: 4px;">네이버 플레이스 · 블로그 · 인스타 황금 키워드</div>
              <div class="print-keyword-container">${keywordsHtml}</div>
            </div>
          </div>
          <div class="print-footer">
            <span>MarketingMap by Audrey</span>
            <span>MARKETING BLUEPRINT</span>
          </div>
        </div>
        
        <div class="print-page">
          <div class="print-header">
            <h4>02. 홍보 채널 마케팅 맵 (블로그 · 유튜브 · 릴스 · 당근)</h4>
            <span>${brandVal} - Page 3</span>
          </div>
          <div class="print-body">
            <div class="slide-title">채널별 생성형 AI 마스터 프롬프트 & 홍보 가이드</div>
            ${sitemapHtml}
          </div>
          <div class="print-footer">
            <span>MarketingMap by Audrey</span>
            <span>MARKETING BLUEPRINT</span>
          </div>
        </div>

        <div class="print-page">
          <div class="print-header">
            <h4>03. 우리 비즈니스 브랜드 스토리 (Brand Story)</h4>
            <span>${brandVal} - Page 4</span>
          </div>
          <div class="print-body">
            <div class="slide-title">고객을 팬으로 만드는 맞춤 브랜드 스토리 예시</div>
            ${dbHtml}
          </div>
          <div class="print-footer">
            <span>MarketingMap by Audrey</span>
            <span>MARKETING BLUEPRINT</span>
          </div>
        </div>
      `;
      
      window.print();
    });
  }

  // --- Draggable Splitter Handle ---
  const resizer = document.getElementById('layout-resizer');
  const leftPanel = document.querySelector('.form-container');
  const mainLayout = document.querySelector('.main-layout');

  if (resizer && leftPanel && mainLayout) {
    let isResizing = false;

    resizer.addEventListener('mousedown', () => {
      isResizing = true;
      resizer.classList.add('resizing');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
      const containerRect = mainLayout.getBoundingClientRect();
      const newWidth = e.clientX - containerRect.left;
      if (newWidth >= 300 && newWidth <= 700) {
        leftPanel.style.width = `${newWidth}px`;
      }
    });

    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        resizer.classList.remove('resizing');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    });
  }

  // --- SaaS Login / Registration / Auth Full Integration ---
  const loginModal = document.getElementById('login-modal');
  const loginForm = document.getElementById('login-modal-form');
  const registerForm = document.getElementById('register-modal-form');
  const btnCloseLogin = document.getElementById('btn-close-login');
  const loginNotice = document.getElementById('login-notice-message');
  const authFeedbackBanner = document.getElementById('auth-feedback-banner');
  const LOCAL_USERS_KEY = 'buildmap_users_db_v1';

  function simpleHash(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return 'h_' + (h >>> 0).toString(16) + '_' + str.length;
  }

  function getLocalUsersDb() {
    let list = [];
    try {
      list = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '[]');
    } catch (e) {
      list = [];
    }
    if (!Array.isArray(list)) list = [];
    if (!list.some(u => u.email.toLowerCase() === 'ceo@marketingmap.kr')) {
      list.unshift({
        id: 'usr_demo_ceo',
        name: '오드리 대표',
        brand: '오드리고깃집',
        email: 'ceo@marketingmap.kr',
        passwordHash: simpleHash('123456'),
        marketingOptIn: true,
        provider: 'email',
        createdAt: '2026-10-28T00:00:00.000Z'
      });
      localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(list));
    }
    return list;
  }

  function saveLocalUserRecord(userObj, rawPassword) {
    const list = getLocalUsersDb();
    const idx = list.findIndex(u => u.email.toLowerCase() === userObj.email.toLowerCase());
    const record = {
      id: userObj.id || ('usr_' + Date.now()),
      name: userObj.name,
      brand: userObj.brand || '',
      email: userObj.email.toLowerCase(),
      passwordHash: rawPassword ? simpleHash(rawPassword) : (idx >= 0 ? list[idx].passwordHash : ''),
      provider: userObj.provider || 'email',
      createdAt: userObj.createdAt || new Date().toISOString()
    };
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...record };
    } else {
      list.push(record);
    }
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(list));
    return record;
  }

  function showAuthFeedback(message, type = 'error') {
    if (!authFeedbackBanner) return;
    if (!message) {
      authFeedbackBanner.style.display = 'none';
      authFeedbackBanner.textContent = '';
      return;
    }
    authFeedbackBanner.className = `auth-feedback-banner ${type}`;
    authFeedbackBanner.innerHTML = message;
    authFeedbackBanner.style.display = 'block';
  }

  function getCurrentUserProfile() {
    try {
      const raw = localStorage.getItem('current_user_profile');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    const name = (localStorage.getItem('user_name') || '오드리 대표').replace(/님$/, '');
    return {
      name,
      brand: localStorage.getItem('user_brand') || '',
      email: localStorage.getItem('user_email') || 'ceo@marketingmap.kr',
      provider: localStorage.getItem('user_provider') || 'email',
      createdAt: localStorage.getItem('user_created_at') || '2026-10-28'
    };
  }

  function triggerPendingAuthActions() {
    if (window.pendingGenerationAction) {
      const act = window.pendingGenerationAction;
      window.pendingGenerationAction = null;
      setTimeout(() => act(), 250);
    }
    if (window.pendingChatPrompt) {
      const prompt = window.pendingChatPrompt;
      window.pendingChatPrompt = null;
      const input = document.getElementById('ideator-input');
      const btn = document.getElementById('btn-discuss-idea');
      if (input && btn) {
        input.value = prompt;
        setTimeout(() => btn.click(), 250);
      }
    }
    if (window.pendingDownloadPdf) {
      window.pendingDownloadPdf = false;
      const pdfBtn = document.getElementById('btn-download-pdf');
      if (pdfBtn) setTimeout(() => pdfBtn.click(), 250);
    }
    if (window.pendingSaveArchive) {
      window.pendingSaveArchive = false;
      setTimeout(() => window.saveCurrentToArchive(), 250);
    }
    if (window.pendingCopyChannel) {
      window.pendingCopyChannel = false;
      const copyBtn = document.getElementById('btn-copy-channel-content');
      if (copyBtn) setTimeout(() => copyBtn.click(), 250);
    }
    if (window.pendingCopyStory) {
      window.pendingCopyStory = false;
      const copyStoryBtn = document.getElementById('btn-copy-brand-story');
      if (copyStoryBtn) setTimeout(() => copyStoryBtn.click(), 250);
    }
    if (window.pendingNewChatAction) {
      const act = window.pendingNewChatAction;
      window.pendingNewChatAction = null;
      setTimeout(() => act(), 250);
    }
  }

  function setLoggedInSession(user, token = '') {
    const cleanName = (user.name || '대표').replace(/님$/, '');
    const displayName = `${cleanName}님`;
    localStorage.setItem('is_logged_in', 'true');
    localStorage.setItem('user_name', displayName);
    localStorage.setItem('user_brand', user.brand || '');
    localStorage.setItem('user_email', user.email || '');
    localStorage.setItem('user_provider', user.provider || 'email');
    if (token) localStorage.setItem('auth_token', token);
    localStorage.setItem('current_user_profile', JSON.stringify({
      id: user.id || ('usr_' + Date.now()),
      name: cleanName,
      brand: user.brand || '',
      email: user.email || '',
      provider: user.provider || 'email',
      createdAt: user.createdAt || new Date().toISOString()
    }));

    // Auto-fill brand name in the marketing form if user registered a brand name
    if (user.brand) {
      const inputBrandEl = document.getElementById('input-brand');
      if (inputBrandEl && (!inputBrandEl.value || inputBrandEl.value === '오드리고깃집')) {
        inputBrandEl.value = user.brand;
      }
    }
    checkLoginStatus();
  }

  window.openAccountProfileModal = function() {
    const overlay = document.getElementById('account-overlay');
    const container = document.getElementById('account-profile-content');
    if (!overlay || !container) return;
    const profile = getCurrentUserProfile();
    const providerMap = {
      email: '이메일 계정',
      '카카오톡(Kakao)': '카카오톡 간편인증',
      '네이버(NAVER)': '네이버 간편인증',
      Google: 'Google 계정 연동'
    };
    const dateStr = (profile.createdAt || '').slice(0, 10) || '2026-10-28';

    container.innerHTML = `
      <div class="account-profile-box">
        <div class="account-profile-row">
          <span class="account-profile-label">대표자 성함</span>
          <span class="account-profile-val">${profile.name}님</span>
        </div>
        <div class="account-profile-row">
          <span class="account-profile-label">가입 이메일</span>
          <span class="account-profile-val">${profile.email || '-'}</span>
        </div>
        <div class="account-profile-row">
          <span class="account-profile-label">가입 방식</span>
          <span class="account-profile-val">${providerMap[profile.provider] || profile.provider}</span>
        </div>
        <div class="account-profile-row">
          <span class="account-profile-label">가입 일자</span>
          <span class="account-profile-val">${dateStr}</span>
        </div>
      </div>
      <div class="input-group" style="margin-bottom: 14px;">
        <label for="profile-brand-edit" style="font-size:12px; font-weight:700; color:#18181b;">내 비즈니스 상호명 (브랜드명) 관리</label>
        <div class="email-check-row" style="margin-top:4px;">
          <input type="text" id="profile-brand-edit" value="${profile.brand || ''}" placeholder="상호명을 입력해 두시면 폼에 자동 연동됩니다">
          <button type="button" class="btn-check-duplicate" onclick="window.saveProfileBrand()">저장·적용</button>
        </div>
        <div id="profile-save-msg" class="email-check-msg ok" style="display:none;">✅ 상호명이 저장되어 좌측 마케팅 입력창에 반영되었습니다!</div>
      </div>
      <div style="display:flex; gap:8px; margin-top:16px;">
        <button type="button" class="btn-primary-action" style="flex:1;" onclick="document.getElementById('account-overlay').classList.remove('active')">확인</button>
        <button type="button" class="btn-secondary" style="padding:10px 16px;" onclick="window.handleLogoutUser()">로그아웃</button>
      </div>
    `;
    overlay.classList.add('active');
  };

  window.saveProfileBrand = function() {
    const input = document.getElementById('profile-brand-edit');
    if (!input) return;
    const newBrand = input.value.trim();
    const profile = getCurrentUserProfile();
    profile.brand = newBrand;
    setLoggedInSession(profile);
    saveLocalUserRecord(profile);
    const inputBrandEl = document.getElementById('input-brand');
    if (inputBrandEl && newBrand) {
      inputBrandEl.value = newBrand;
    }
    const msg = document.getElementById('profile-save-msg');
    if (msg) {
      msg.style.display = 'block';
      setTimeout(() => { msg.style.display = 'none'; }, 2500);
    }
  };

  window.handleLogoutUser = function() {
    localStorage.removeItem('is_logged_in');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_brand');
    localStorage.removeItem('user_email');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_user_profile');
    const overlay = document.getElementById('account-overlay');
    if (overlay) overlay.classList.remove('active');
    checkLoginStatus();
  };

  function checkLoginStatus() {
    const authContainer = document.getElementById('auth-nav-container');
    if (!authContainer) return;
    
    const isLoggedIn = localStorage.getItem('is_logged_in') === 'true';
    if (isLoggedIn) {
      const profile = getCurrentUserProfile();
      const userName = `${profile.name}님`;
      const brandBadge = profile.brand ? `<span class="auth-brand-badge">${profile.brand}</span>` : '';
      authContainer.innerHTML = `
        <a href="#account" id="nav-account-pill" class="auth-user-pill" title="내 계정 및 상호명 정보 보기">
          <span>👤 ${userName}</span>
          ${brandBadge}
        </a>
        <span class="nav-divider">|</span>
        <a href="#logout" id="nav-logout" class="nav-link">로그아웃</a>
      `;
      const navAccountPill = document.getElementById('nav-account-pill');
      if (navAccountPill) {
        navAccountPill.addEventListener('click', (e) => {
          e.preventDefault();
          window.openAccountProfileModal();
        });
      }
      const navLogout = document.getElementById('nav-logout');
      if (navLogout) {
        navLogout.addEventListener('click', (e) => {
          e.preventDefault();
          window.handleLogoutUser();
        });
      }
    } else {
      authContainer.innerHTML = `
        <a href="#login" id="nav-login" class="nav-link">로그인</a>
        <span class="nav-divider">|</span>
        <a href="#register" id="nav-register" class="nav-link nav-link-highlight">회원가입</a>
      `;
      bindAuthModalTriggers();
    }
    updateMarketingGiftBanner();
  }

  function updateMarketingGiftBanner() {
    const banner = document.getElementById('marketing-gift-hook-banner');
    if (!banner) return;
    const isLoggedIn = localStorage.getItem('is_logged_in') === 'true';
    const profile = getCurrentUserProfile();
    if (isLoggedIn && profile && !profile.marketingOptIn && generatedData) {
      banner.style.display = 'flex';
    } else {
      banner.style.display = 'none';
    }
  }

  window.claimMarketingOptInGift = async function() {
    let profile = getCurrentUserProfile();
    if (!profile) return;
    profile.marketingOptIn = true;
    localStorage.setItem('current_user_profile', JSON.stringify(profile));

    const banner = document.getElementById('marketing-gift-hook-banner');
    if (banner) banner.style.display = 'none';

    try {
      await fetch('/api/auth/profile/marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: profile.email, marketingOptIn: true })
      });
    } catch (e) {}

    alert('🎁 축하합니다! 100일 홍보 캘린더 원본(Excel/PDF)과 주간 마케팅 비법 리포트 무료 수신이 성공적으로 등록되었습니다.');
  };

  function showLoginModal(noticeText = '', mode = 'login') {
    if (!loginModal) return;
    showAuthFeedback('');
    if (noticeText) {
      loginNotice.textContent = noticeText;
      loginNotice.style.display = 'block';
    } else {
      loginNotice.style.display = 'none';
    }
    const tLogin = document.getElementById('tab-login');
    const tRegister = document.getElementById('tab-register');
    if (mode === 'register' && tRegister) {
      tRegister.click();
    } else if (tLogin) {
      tLogin.click();
    }
    loginModal.classList.add('active');
  }

  function closeLoginModal() {
    if (!loginModal) return;
    loginModal.classList.remove('active');
    showAuthFeedback('');
  }

  function bindAuthModalTriggers() {
    const navLogin = document.getElementById('nav-login');
    const navRegister = document.getElementById('nav-register');
    if (navLogin) {
      navLogin.addEventListener('click', (e) => {
        e.preventDefault();
        showLoginModal('', 'login');
      });
    }
    if (navRegister) {
      navRegister.addEventListener('click', (e) => {
        e.preventDefault();
        showLoginModal('', 'register');
      });
    }
  }

  // --- Terms & Privacy Inline / Modal Handlers ---
  window.toggleInlineTerms = function(boxId) {
    const el = document.getElementById(boxId);
    if (el) {
      el.classList.toggle('hidden');
    }
  };

  window.openTermsModal = function(type) {
    const termsOverlay = document.getElementById('terms-overlay');
    const titleEl = document.getElementById('terms-overlay-title');
    if (titleEl) {
      titleEl.textContent = type === 'privacy' ? '개인정보처리방침 및 데이터 보호 안내' : 'MarketingMap 서비스 이용약관 및 개인정보처리방침';
    }
    if (termsOverlay) {
      termsOverlay.classList.add('active');
    }
  };

  const termsAllCheck = document.getElementById('terms-all');
  if (termsAllCheck) {
    termsAllCheck.addEventListener('change', (e) => {
      const checked = e.target.checked;
      document.querySelectorAll('.terms-sub-check').forEach(chk => {
        chk.checked = checked;
      });
      const termsContainer = document.querySelector('.terms-container');
      if (termsContainer) termsContainer.classList.remove('terms-error-highlight');
      showAuthFeedback('');
    });
  }
  document.querySelectorAll('.terms-sub-check').forEach(chk => {
    chk.addEventListener('change', () => {
      const allSubs = Array.from(document.querySelectorAll('.terms-sub-check'));
      if (termsAllCheck) {
        termsAllCheck.checked = allSubs.every(c => c.checked);
      }
      const termsContainer = document.querySelector('.terms-container');
      if (termsContainer) termsContainer.classList.remove('terms-error-highlight');
      showAuthFeedback('');
    });
  });

  // --- Marketing Blueprint Archive (보관함) System ---
  const ARCHIVE_STORAGE_KEY = 'saved_marketing_blueprints_v20261028_2';
  function getArchivedBlueprints() {
    let list = [];
    try {
      list = JSON.parse(localStorage.getItem(ARCHIVE_STORAGE_KEY) || '[]');
    } catch (e) {
      list = [];
    }
    if (!Array.isArray(list) || list.length === 0) {
      const sampleBrand = '오드리고깃집';
      const sampleCategory = '외식/카페/프랜차이즈';
      const sampleIdea = '14일 저온숙성 통삼겹·목살 한판 & 한우 된장찌개 세트';
      const sampleRegion = '서울 노원구 중계동 은행사거리 학원가·아파트 배후 상권';
      const sampleTarget = '직원이 직접 구워주는 그릴링 서비스, 단체룸 완비 / 주말 가족 외식 및 중계동 주민';
      const sampleGoal = '광고비 0원으로 중계동 고깃집 네이버 플레이스 상위노출 및 가족 단골 재방문율 상승';
      const sampleData = getLocalBlueprint(sampleBrand, sampleCategory, sampleIdea, sampleRegion, sampleTarget, sampleGoal);
      list = [
        {
          id: 'archive_default_audrey_meat',
          brand: sampleBrand,
          category: sampleCategory,
          idea: sampleIdea,
          region: sampleRegion,
          target: sampleTarget,
          revenue: sampleGoal,
          createdAt: '기본 제공 샘플 전략',
          data: sampleData
        }
      ];
      localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(list));
    }
    return list;
  }

  function updateArchiveBadge() {
    const badge = document.getElementById('archive-count-badge');
    if (!badge) return;
    const list = getArchivedBlueprints();
    badge.textContent = list.length;
  }

  function renderArchiveList() {
    const container = document.getElementById('archive-items-container');
    if (!container) return;
    const list = getArchivedBlueprints();
    updateArchiveBadge();

    if (list.length === 0) {
      container.innerHTML = `<div style="text-align:center; padding:24px; color:#64748b; font-size:12px;">아직 보관된 마케팅 전략이 없습니다. 좌측 폼에서 전략을 생성하시면 이곳에 자동 저장됩니다.</div>`;
      return;
    }

    container.innerHTML = list.map(item => `
      <div class="archive-item-card">
        <div class="archive-item-info">
          <div class="archive-item-title-row">
            <strong>${item.brand}</strong>
            <span class="archive-item-badge">${item.category}</span>
            <span style="font-size:11px; color:#94a3b8;">${item.createdAt || ''}</span>
          </div>
          <div class="archive-item-meta">📍 ${item.region} · 🎁 ${item.idea}</div>
          <div class="archive-item-meta">🎯 목표: ${item.revenue}</div>
        </div>
        <div class="archive-item-actions">
          <button type="button" class="btn-archive-load" onclick="window.loadArchivedBlueprint('${item.id}')">전략 불러오기</button>
          <button type="button" class="btn-archive-delete" onclick="window.deleteArchivedBlueprint('${item.id}')">삭제</button>
        </div>
      </div>
    `).join('');
  }

  function addBlueprintToArchive(brand, category, idea, region, target, revenue, data) {
    const list = getArchivedBlueprints();
    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newItem = {
      id: 'arch_' + Date.now(),
      brand,
      category,
      idea,
      region,
      target,
      revenue,
      createdAt: dateStr,
      data
    };
    const filtered = list.filter(x => !(x.brand === brand && x.revenue === revenue));
    filtered.unshift(newItem);
    localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(filtered.slice(0, 20)));
    renderArchiveList();
  }

  window.loadArchivedBlueprint = function(id) {
    const list = getArchivedBlueprints();
    const item = list.find(x => x.id === id);
    if (!item) return;

    const inputBrand = document.getElementById('input-brand');
    const inputCategory = document.getElementById('input-category');
    const inputIdea = document.getElementById('input-idea');
    const inputRegion = document.getElementById('input-region');
    const inputTarget = document.getElementById('input-target');
    const inputRevenue = document.getElementById('input-revenue');

    if (inputBrand) inputBrand.value = item.brand;
    if (item.category) setCategoryToForm(item.category);
    if (inputIdea) inputIdea.value = item.idea;
    if (inputRegion) inputRegion.value = item.region;
    if (inputTarget) inputTarget.value = item.target;
    if (inputRevenue) inputRevenue.value = item.revenue;

    resultsPlaceholder.classList.add('hidden');
    resultsDashboard.classList.remove('hidden');
    renderBlueprint(item.data, item.brand, item.category, item.idea, item.region, item.target);

    const overlay = document.getElementById('blueprints-overlay');
    if (overlay) overlay.classList.remove('active');
    resultsDashboard.scrollIntoView({ behavior: 'smooth' });
  };

  window.deleteArchivedBlueprint = function(id) {
    let list = getArchivedBlueprints();
    list = list.filter(x => x.id !== id);
    localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(list));
    renderArchiveList();
  };

  window.saveCurrentToArchive = function() {
    const isLoggedIn = localStorage.getItem('is_logged_in') === 'true';
    if (!isLoggedIn) {
      window.pendingSaveArchive = true;
      showLoginModal('🗂️ 분석한 마케팅 전략이 사라지지 않도록 <strong>대표님 계정 보관함에 안전하게 저장</strong>하세요.<br>무료 회원가입 후 언제든 다시 불러올 수 있습니다.', 'register');
      return;
    }
    const brand = (document.getElementById('input-brand')?.value || '오드리고깃집').trim();
    const category = getResolvedCategory();
    const idea = (document.getElementById('input-idea')?.value || '14일 저온숙성 통삼겹·목살 한판 & 한우 된장찌개 세트').trim();
    const region = (document.getElementById('input-region')?.value || '서울 노원구 중계동 은행사거리 학원가·아파트 배후 상권').trim();
    const target = (document.getElementById('input-target')?.value || '직원이 직접 구워주는 그릴링 서비스, 단체룸 완비 / 주말 가족 외식 및 중계동 주민').trim();
    const revenue = (document.getElementById('input-revenue')?.value || '광고비 0원으로 중계동 고깃집 네이버 플레이스 상위노출 및 가족 단골 재방문율 상승').trim();
    const dataToSave = generatedData || getLocalBlueprint(brand, category, idea, region, target, revenue);
    addBlueprintToArchive(brand, category, idea, region, target, revenue, dataToSave);
  };

  window.loadSampleBlueprint = function() {
    const list = getArchivedBlueprints();
    if (list.length > 0) {
      window.loadArchivedBlueprint(list[0].id);
    }
  };

  // --- SaaS Info Overlays ---
  const overlays = {
    about: document.getElementById('about-overlay'),
    pricing: document.getElementById('pricing-overlay'),
    support: document.getElementById('support-overlay'),
    blueprints: document.getElementById('blueprints-overlay')
  };

  function openOverlay(name) {
    if (name === 'blueprints') {
      renderArchiveList();
    }
    if (overlays[name]) {
      overlays[name].classList.add('active');
    }
  }

  ['about', 'pricing', 'support', 'blueprints'].forEach(key => {
    const el = document.getElementById(`nav-${key}`);
    if (el) {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        openOverlay(key);
      });
    }
  });
  updateArchiveBadge();

  // --- Unified Auth Modal Tab Switching ---
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const btnCheckEmail = document.getElementById('btn-check-email');
  const registerEmailInput = document.getElementById('register-email');
  const emailCheckMsg = document.getElementById('email-check-msg');
  let lastCheckedEmail = '';

  if (tabLogin && tabRegister && loginForm && registerForm) {
    tabLogin.addEventListener('click', () => {
      showAuthFeedback('');
      tabLogin.classList.add('active');
      tabRegister.classList.remove('active');
      loginForm.classList.add('active-form');
      registerForm.classList.remove('active-form');
    });

    tabRegister.addEventListener('click', () => {
      showAuthFeedback('');
      tabRegister.classList.add('active');
      tabLogin.classList.remove('active');
      registerForm.classList.add('active-form');
      loginForm.classList.remove('active-form');
    });
  }

  async function verifyEmailAvailability(emailVal) {
    const email = (emailVal || '').trim().toLowerCase();
    if (!email || !email.includes('@') || !email.includes('.')) {
      if (emailCheckMsg) {
        emailCheckMsg.textContent = '⚠️ 올바른 이메일 주소 형식을 입력해 주세요.';
        emailCheckMsg.className = 'email-check-msg err';
        emailCheckMsg.style.display = 'block';
      }
      return false;
    }

    // Check local DB first
    const localDb = getLocalUsersDb();
    const existsLocally = localDb.some(u => u.email.toLowerCase() === email);
    let available = !existsLocally;

    // Also query backend server /api/auth/check-email
    try {
      const resp = await fetch(`/api/auth/check-email?email=${encodeURIComponent(email)}`);
      if (resp.ok) {
        const data = await resp.json();
        if (typeof data.available === 'boolean') {
          available = data.available && !existsLocally;
        }
      }
    } catch (err) {
      // Static/offline mode fallback uses localDb result
    }

    if (emailCheckMsg) {
      if (available) {
        emailCheckMsg.textContent = '✅ 사용 가능한 이메일 주소입니다.';
        emailCheckMsg.className = 'email-check-msg ok';
        lastCheckedEmail = email;
      } else {
        emailCheckMsg.textContent = '⚠️ 이미 가입된 이메일 주소입니다. 다른 이메일을 입력하거나 로그인해 주세요.';
        emailCheckMsg.className = 'email-check-msg err';
        lastCheckedEmail = '';
      }
      emailCheckMsg.style.display = 'block';
    }
    return available;
  }

  if (btnCheckEmail && registerEmailInput) {
    btnCheckEmail.addEventListener('click', () => {
      verifyEmailAvailability(registerEmailInput.value);
    });
    registerEmailInput.addEventListener('input', () => {
      if (emailCheckMsg) emailCheckMsg.style.display = 'none';
      lastCheckedEmail = '';
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      showAuthFeedback('');

      const nameVal = (document.getElementById('register-name')?.value || '').trim();
      const brandVal = (document.getElementById('register-brand')?.value || '').trim();
      const emailVal = (document.getElementById('register-email')?.value || '').trim().toLowerCase();
      const passwordVal = document.getElementById('register-password')?.value || '';
      const passwordConfirmEl = document.getElementById('register-password-confirm');
      const passwordConfirmVal = passwordConfirmEl ? passwordConfirmEl.value : passwordVal;
      const termsAge = document.getElementById('terms-age');
      const termsService = document.getElementById('terms-service');
      const termsPrivacy = document.getElementById('terms-privacy');
      const termsMarketing = document.getElementById('terms-marketing');
      const marketingOptIn = Boolean(termsMarketing?.checked);
      const termsContainer = document.querySelector('.terms-container');
      if (termsContainer) termsContainer.classList.remove('terms-error-highlight');

      if (!nameVal) {
        showAuthFeedback('대표자 성함을 입력해 주세요.', 'error');
        document.getElementById('register-name')?.focus();
        return;
      }
      if (!emailVal || !emailVal.includes('@')) {
        showAuthFeedback('올바른 이메일 주소를 입력해 주세요.', 'error');
        document.getElementById('register-email')?.focus();
        return;
      }
      if (passwordVal.length < 6) {
        showAuthFeedback('비밀번호는 6자 이상 입력해 주세요.', 'error');
        document.getElementById('register-password')?.focus();
        return;
      }
      if (passwordConfirmEl && passwordVal !== passwordConfirmVal) {
        showAuthFeedback('비밀번호와 비밀번호 확인이 일치하지 않습니다. 다시 확인해 주세요.', 'error');
        passwordConfirmEl.focus();
        return;
      }

      // 약관 동의 여부 엄격 검증 (전체 동의 또는 필수 항목 미동의 시 차단)
      if (!termsAge?.checked || !termsService?.checked || !termsPrivacy?.checked) {
        showAuthFeedback('⚠️ 서비스 이용을 위해 [전체 동의] 또는 필수 이용약관에 모두 체크해 주세요.', 'error');
        if (termsContainer) {
          termsContainer.classList.add('terms-error-highlight');
          termsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        if (!termsAge?.checked) termsAge?.focus();
        else if (!termsService?.checked) termsService?.focus();
        else if (!termsPrivacy?.checked) termsPrivacy?.focus();
        return;
      }

      const isAvailable = await verifyEmailAvailability(emailVal);
      if (!isAvailable) {
        showAuthFeedback('이미 가입된 이메일 주소입니다. 상단 [로그인] 탭을 이용해 주세요.', 'error');
        return;
      }

      const btnSubmitReg = document.getElementById('btn-submit-register');
      if (btnSubmitReg) btnSubmitReg.disabled = true;

      let registeredUser = null;
      let token = '';

      try {
        const resp = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: nameVal,
            brand: brandVal,
            email: emailVal,
            password: passwordVal,
            termsAge: termsAge?.checked,
            termsService: termsService?.checked,
            termsPrivacy: termsPrivacy?.checked,
            marketingOptIn
          })
        });
        const result = await resp.json();
        if (!resp.ok || !result.ok) {
          showAuthFeedback(result.message || '회원가입 처리 중 오류가 발생했습니다.', 'error');
          if (btnSubmitReg) btnSubmitReg.disabled = false;
          return;
        }
        registeredUser = result.user;
        token = result.token || '';
      } catch (networkErr) {
        // Fallback if static hosting
        registeredUser = {
          id: 'usr_' + Date.now(),
          name: nameVal,
          brand: brandVal,
          email: emailVal,
          provider: 'email',
          createdAt: new Date().toISOString()
        };
        token = btoa(encodeURIComponent(`${registeredUser.id}:${emailVal}`));
      }

      saveLocalUserRecord(registeredUser, passwordVal);
      setLoggedInSession(registeredUser, token);
      showAuthFeedback(`🎉 환영합니다, <strong>${registeredUser.name}님</strong>! 무료 회원가입이 완료되었습니다.`, 'success');

      setTimeout(() => {
        if (btnSubmitReg) btnSubmitReg.disabled = false;
        registerForm.reset();
        if (emailCheckMsg) emailCheckMsg.style.display = 'none';
        closeLoginModal();
        triggerPendingAuthActions();
      }, 650);
    });
  }

  // --- Native Google / Naver / Kakao Account Chooser Sheet (Matches Rinnai Mobile Screen) ---
  let activeOAuth = {
    provider: 'Google',
    name: '이영현',
    email: 'inewscom100454@gmail.com'
  };

  const oauthOverlay = document.getElementById('social-oauth-overlay');
  const oauthBackdrop = document.getElementById('oauth-sheet-backdrop');
  const oauthAccountItem = document.getElementById('oauth-account-item');
  const oauthBtnOther = document.getElementById('oauth-btn-other');
  const oauthOtherBox = document.getElementById('oauth-other-input-box');
  const btnOauthCustomContinue = document.getElementById('btn-oauth-custom-continue');

  function openNativeOAuthSheet(provider) {
    activeOAuth.provider = provider;
    if (oauthOtherBox) oauthOtherBox.style.display = 'none';

    const pTitle = document.getElementById('oauth-provider-title');
    const pSub = document.getElementById('oauth-provider-sub');
    const pLegal = document.getElementById('oauth-provider-name-text');
    const pName = document.getElementById('oauth-account-name');
    const pEmail = document.getElementById('oauth-account-email');
    const pAvatar = document.getElementById('oauth-account-avatar');
    const pFallback = document.getElementById('oauth-avatar-fallback');

    if (provider === 'Google') {
      activeOAuth.name = '이영현';
      activeOAuth.email = 'inewscom100454@gmail.com';
      if (pTitle) pTitle.textContent = '계정 선택';
      if (pSub) pSub.textContent = 'MarketingMap 앱을 계속 이용하려면 계정을 선택하세요.';
      if (pLegal) pLegal.textContent = 'Google';
      if (pAvatar) {
        pAvatar.style.background = 'linear-gradient(135deg, #4285F4, #2563eb)';
        pAvatar.style.color = '#ffffff';
      }
      if (pFallback) pFallback.textContent = '이';
    } else if (provider === '네이버(NAVER)') {
      activeOAuth.name = '이영현';
      activeOAuth.email = 'inewscom100454@naver.com';
      if (pTitle) pTitle.textContent = '네이버 계정 선택';
      if (pSub) pSub.textContent = 'MarketingMap 앱을 계속 이용하려면 계정을 선택하세요.';
      if (pLegal) pLegal.textContent = 'NAVER';
      if (pAvatar) {
        pAvatar.style.background = '#03C75A';
        pAvatar.style.color = '#ffffff';
      }
      if (pFallback) pFallback.textContent = 'N';
    } else if (provider === '카카오톡(Kakao)') {
      activeOAuth.name = '이영현';
      activeOAuth.email = 'inewscom100454@kakao.com';
      if (pTitle) pTitle.textContent = '카카오 계정 선택';
      if (pSub) pSub.textContent = 'MarketingMap 앱을 계속 이용하려면 계정을 선택하세요.';
      if (pLegal) pLegal.textContent = 'Kakao';
      if (pAvatar) {
        pAvatar.style.background = '#FEE500';
        pAvatar.style.color = '#191919';
      }
      if (pFallback) pFallback.textContent = '카';
    }

    if (pName) pName.textContent = activeOAuth.name;
    if (pEmail) pEmail.textContent = activeOAuth.email;

    const mCheck = document.getElementById('oauth-terms-marketing');
    if (mCheck) mCheck.checked = true;

    if (oauthOverlay) oauthOverlay.classList.add('active');
  }

  function closeNativeOAuthSheet() {
    if (oauthOverlay) oauthOverlay.classList.remove('active');
  }

  async function completeOAuthSignIn(provider, name, email, marketingOptIn) {
    closeNativeOAuthSheet();
    closeLoginModal();

    let socialUser = {
      id: 'usr_oauth_' + Date.now(),
      name: name.trim() || '이영현',
      brand: '',
      email: email.trim().toLowerCase(),
      marketingOptIn: Boolean(marketingOptIn),
      provider: provider,
      createdAt: new Date().toISOString()
    };
    let token = '';

    try {
      const resp = await fetch('/api/auth/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          name: socialUser.name,
          brand: '',
          email: socialUser.email,
          marketingOptIn: Boolean(marketingOptIn)
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.ok && data.user) {
          socialUser = data.user;
          token = data.token || '';
        }
      }
    } catch (e) {}

    saveLocalUserRecord(socialUser);
    setLoggedInSession(socialUser, token);
    triggerPendingAuthActions();

    const giftNotice = marketingOptIn ? '<br><span style="font-size:12px;color:#ff6b00;">🎁 100일 홍보 캘린더 & 비법 리포트 무료 수신이 등록되었습니다!</span>' : '';
    showAuthFeedback(`🎉 환영합니다, <strong>${socialUser.name} 대표님</strong>!${giftNotice}`, 'success');
  }

  if (oauthAccountItem) {
    oauthAccountItem.addEventListener('click', () => {
      const mCheck = document.getElementById('oauth-terms-marketing');
      completeOAuthSignIn(activeOAuth.provider, activeOAuth.name, activeOAuth.email, mCheck ? mCheck.checked : true);
    });
  }

  if (oauthBackdrop) {
    oauthBackdrop.addEventListener('click', closeNativeOAuthSheet);
  }

  if (oauthBtnOther && oauthOtherBox) {
    oauthBtnOther.addEventListener('click', () => {
      oauthOtherBox.style.display = oauthOtherBox.style.display === 'none' ? 'flex' : 'none';
      if (oauthOtherBox.style.display === 'flex') {
        document.getElementById('oauth-custom-name')?.focus();
      }
    });
  }

  if (btnOauthCustomContinue) {
    btnOauthCustomContinue.addEventListener('click', () => {
      const cName = (document.getElementById('oauth-custom-name')?.value || '').trim() || '대표';
      const cEmail = (document.getElementById('oauth-custom-email')?.value || '').trim();
      if (!cEmail || !cEmail.includes('@')) {
        alert('올바른 이메일 주소를 입력해 주세요.');
        return;
      }
      const mCheck = document.getElementById('oauth-terms-marketing');
      completeOAuthSignIn(activeOAuth.provider, cName, cEmail, mCheck ? mCheck.checked : true);
    });
  }

  // Circular social buttons event binding
  const btnCircleGoogle = document.getElementById('btn-circle-google');
  if (btnCircleGoogle) {
    btnCircleGoogle.addEventListener('click', () => openNativeOAuthSheet('Google'));
  }
  const btnCircleNaver = document.getElementById('btn-circle-naver');
  if (btnCircleNaver) {
    btnCircleNaver.addEventListener('click', () => openNativeOAuthSheet('네이버(NAVER)'));
  }
  const btnCircleKakao = document.getElementById('btn-circle-kakao');
  if (btnCircleKakao) {
    btnCircleKakao.addEventListener('click', () => openNativeOAuthSheet('카카오톡(Kakao)'));
  }

  // --- 1:1 Floating Support Chatbot ---
  const supportChatTrigger = document.getElementById('support-chat-trigger');
  const supportChatPanel = document.getElementById('support-chat-panel');
  const btnCloseSupport = document.getElementById('btn-close-support');
  const btnSendSupport = document.getElementById('btn-send-support');
  const supportChatInput = document.getElementById('support-chat-input');
  const supportChatMessages = document.getElementById('support-chat-messages');

  if (supportChatTrigger && supportChatPanel) {
    supportChatTrigger.addEventListener('click', () => {
      supportChatPanel.classList.toggle('active');
    });
  }

  if (btnCloseSupport && supportChatPanel) {
    btnCloseSupport.addEventListener('click', () => {
      supportChatPanel.classList.remove('active');
    });
  }

  function appendSupportMessage(sender, text) {
    if (!supportChatMessages) return;
    const msg = document.createElement('div');
    msg.className = `support-msg ${sender}`;
    const avatar = sender === 'bot' ? '🙋' : '👤';
    msg.innerHTML = `
      <div class="support-avatar">${avatar}</div>
      <div class="support-bubble">${text}</div>
    `;
    supportChatMessages.appendChild(msg);
    supportChatMessages.scrollTop = supportChatMessages.scrollHeight;
  }

  const faqResponses = {
    api_error: 'API 키가 없어도 걱정하지 마세요! 기본 설정인 <b>[로컬 마케팅 엔진]</b>으로 실행하시면 우리 비즈니스 상호·업종·상권에 맞춘 5대 마케팅 전략과 홍보 원고가 즉시 무료로 생성됩니다.',
    pricing: '현재 MarketingMap Studio에서는 모든 마케팅 전략 생성 및 홍보 원고 복사, PDF 출력 기능이 무료로 제공됩니다.',
    howto: '좌측 입력창에 <b>①상호명, ②업종 및 주력상품, ③지역(상권), ④강점/타깃, ⑤마케팅 고민</b>을 입력하고 하단 오렌지색 버튼을 누르시면 우측에 플레이스 키워드, AI 검색 Q&A, 블로그·유튜브·릴스·당근 홍보 가이드, 브랜드 스토리가 즉시 완성됩니다!',
    enterprise: '프랜차이즈 본사, 소상공인 협회, 마케팅 대행사 제휴 문의는 <b>support@marketingmap.kr</b>으로 연락 주시면 맞춤 안내해 드립니다.'
  };

  window.sendSupportFaq = function(key) {
    const questions = {
      api_error: '🔑 API 키 입력 오류 문의',
      pricing: '💳 요금제 및 결제 문의',
      howto: '💻 서비스 사용 방법 문의',
      enterprise: '🏢 제휴/도입 문의'
    };
    appendSupportMessage('user', questions[key]);
    setTimeout(() => {
      appendSupportMessage('bot', faqResponses[key]);
    }, 500);
  };

  function handleSupportSubmit() {
    if (!supportChatInput) return;
    const text = supportChatInput.value.trim();
    if (!text) return;
    
    appendSupportMessage('user', text);
    supportChatInput.value = '';
    
    const textLower = text.toLowerCase();
    let reply = '궁금하신 점은 상단 안내 칩(서비스 사용 방법, API 설정 등)을 클릭하시면 가장 빠르게 확인하실 수 있습니다!';
    
    if (textLower.includes('api') || textLower.includes('키') || textLower.includes('오류')) {
      reply = faqResponses.api_error;
    } else if (textLower.includes('요금') || textLower.includes('결제') || textLower.includes('가격')) {
      reply = faqResponses.pricing;
    } else if (textLower.includes('방법') || textLower.includes('어떻게') || textLower.includes('사용')) {
      reply = faqResponses.howto;
    } else if (textLower.includes('제휴') || textLower.includes('도입') || textLower.includes('문의')) {
      reply = faqResponses.enterprise;
    }
    
    setTimeout(() => {
      appendSupportMessage('bot', reply);
    }, 500);
  }

  if (btnSendSupport && supportChatInput) {
    btnSendSupport.addEventListener('click', handleSupportSubmit);
    supportChatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSupportSubmit();
    });
  }

  if (btnCloseLogin) {
    btnCloseLogin.addEventListener('click', closeLoginModal);
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      showAuthFeedback('');

      const emailVal = (document.getElementById('login-email')?.value || '').trim().toLowerCase();
      const passwordVal = document.getElementById('login-password')?.value || '';

      if (!emailVal || !passwordVal) {
        showAuthFeedback('이메일과 비밀번호를 모두 입력해 주세요.', 'error');
        return;
      }

      const btnSubmitLogin = document.getElementById('btn-submit-login');
      if (btnSubmitLogin) btnSubmitLogin.disabled = true;

      let loggedInUser = null;
      let token = '';

      try {
        const resp = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailVal, password: passwordVal })
        });
        const data = await resp.json();
        if (resp.ok && data.ok) {
          loggedInUser = data.user;
          token = data.token || '';
        } else {
          // Check local DB in case user registered while offline/static
          const localDb = getLocalUsersDb();
          const localMatch = localDb.find(u => u.email.toLowerCase() === emailVal);
          if (localMatch && localMatch.passwordHash === simpleHash(passwordVal)) {
            loggedInUser = localMatch;
          } else {
            showAuthFeedback(data.message || '이메일 또는 비밀번호가 일치하지 않습니다.', 'error');
            if (btnSubmitLogin) btnSubmitLogin.disabled = false;
            return;
          }
        }
      } catch (networkErr) {
        // Offline / static fallback verification
        const localDb = getLocalUsersDb();
        const localMatch = localDb.find(u => u.email.toLowerCase() === emailVal);
        if (!localMatch) {
          showAuthFeedback('가입되지 않은 이메일입니다. 먼저 [회원가입] 탭에서 가입해 주세요.', 'error');
          if (btnSubmitLogin) btnSubmitLogin.disabled = false;
          return;
        }
        if (localMatch.passwordHash && localMatch.passwordHash !== simpleHash(passwordVal)) {
          showAuthFeedback('비밀번호가 일치하지 않습니다. 다시 확인해 주세요.', 'error');
          if (btnSubmitLogin) btnSubmitLogin.disabled = false;
          return;
        }
        loggedInUser = localMatch;
      }

      saveLocalUserRecord(loggedInUser);
      setLoggedInSession(loggedInUser, token);
      showAuthFeedback(`✅ 환영합니다, <strong>${loggedInUser.name}님</strong>!`, 'success');

      setTimeout(() => {
        if (btnSubmitLogin) btnSubmitLogin.disabled = false;
        closeLoginModal();
        triggerPendingAuthActions();
      }, 450);
    });
  }

  // Ensure initial local demo user exists
  getLocalUsersDb();
  checkLoginStatus();
  renderChatHistoryList();
});
