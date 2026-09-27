// UI Component Lab - Comprehensive Component Data (20 Components)

const COMPONENTS_DATA = [
  // =========================================================================
  // 0. BASICS & GENERAL (초보자 필수 기초)
  // =========================================================================
  {
    id: 'button',
    name: 'Button / 버튼',
    category: 'Basics & General',
    level: '기본 (초급)',
    summary: '클릭 인터랙션을 통해 폼 제출, 모달 열기, 데이터 저장 등 즉각적인 작업을 실행하는 가장 기초적인 요소입니다.',
    demoHTML: `
      <div style="display: flex; flex-direction: column; gap: 18px; align-items: center; width: 100%;">
        <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;">
          <button id="demo-btn-primary" class="btn-primary">Primary (솔리드)</button>
          <button id="demo-btn-secondary" class="btn-secondary">Secondary (아웃라인)</button>
          <button id="demo-btn-ghost" class="btn-ghost" style="border: 1px dashed var(--border-default);">Ghost (고스트)</button>
          <button id="demo-btn-danger" class="btn-danger">Destructive (위험/삭제)</button>
        </div>
        <div style="display: flex; gap: 12px; align-items: center; margin-top: 4px; background: var(--bg-subtle); padding: 12px 18px; border-radius: var(--radius-md); border: 1px solid var(--border-default);">
          <span style="font-size: 13px; color: var(--text-secondary);">로딩 상태 테스트: </span>
          <button id="demo-btn-loading-toggle" class="btn-secondary" style="font-size: 12.5px; padding: 6px 12px;">
            로딩 스위치 토글
          </button>
          <button id="demo-target-loading-btn" class="btn-primary" style="font-size: 13px; padding: 6px 16px;">
            <span>저장하기</span>
          </button>
        </div>
      </div>
    `,
    overview: {
      concept: '버튼은 웹 인터페이스에서 행동(Action)을 트리거하는 가장 핵심적인 요소입니다. 색상과 형태(Variant)를 통해 어떤 행동이 가장 중요한지 시각적 위계(Visual Hierarchy)를 전달합니다.',
      doAndDont: [
        '✅ Do: 한 화면에서 가장 중요한 행동에는 오직 1개의 Primary 버튼만 사용하세요 (시선 분산 방지).',
        '✅ Do: 폼 안에서 단순 자바스크립트 동작을 실행하는 버튼은 반드시 <code class="code-inline">type="button"</code>을 명시하세요 (기본값이 type="submit"이라 페이지가 새로고침되는 버그 방지).',
        '❌ Don\'t: 링크(<code class="code-inline">&lt;a&gt;</code>)를 버튼처럼 꾸며서 JS 클릭 이벤트를 달지 마세요 (URL 이동은 &lt;a&gt;, 동작 실행은 &lt;button&gt;).'
      ],
      comparison: 'Button (&lt;button&gt;) vs Link (&lt;a&gt;): 초보자가 가장 많이 실수하는 부분! 새 페이지로 이동하거나 특정 URL 주소를 가질 때는 &lt;a&gt; 태그를 써야 뒤로가기 및 새 탭 열기(Ctrl+클릭)가 지원됩니다. 반면 모달 열기, 장바구니 담기, 폼 제출은 &lt;button&gt; 태그를 사용해야 합니다.'
    },
    keyboard: [
      { key: 'Enter', desc: '포커스된 버튼을 클릭 실행합니다.' },
      { key: 'Space', desc: '포커스된 버튼을 활성화(클릭)합니다.' },
      { key: 'Tab', desc: '다음 포커스 가능한 버튼으로 이동합니다.' }
    ],
    accessibility: [
      { prop: 'type="button | submit | reset"', desc: '버튼의 명시적 타입 지정 (기본값인 submit 주의).' },
      { prop: 'aria-disabled="true"', desc: '완전 비활성화 대신 스크린 리더 포커스는 유지하며 동작만 막을 때 사용.' },
      { prop: 'aria-label="라벨"', desc: '아이콘만 있는 버튼(Icon-only Button)에 스크린 리더용 텍스트를 제공.' }
    ],
    architectureTips: '버튼이 로딩 중일 때는 pointer-events: none 및 aria-busy="true"를 주어 중복 클릭(Double submit)을 원천 차단하고, 스피너 아이콘과 함께 "처리 중..." 상태 텍스트를 제공해야 합니다.'
  },

  {
    id: 'input-field',
    name: 'Input & Form Field / 텍스트 입력창',
    category: 'Basics & General',
    level: '기본 (초급)',
    summary: '사용자로부터 텍스트를 입력받는 기본 필드로, 명확한 레이블(Label)과 유효성 검사 에러 피드백을 제공합니다.',
    demoHTML: `
      <div style="display: flex; justify-content: center; width: 100%;">
        <div class="form-field-group">
          <label for="demo-input-email" class="form-label">
            <span>이메일 주소 <span class="required-mark">*</span></span>
            <span id="demo-char-count" style="font-size: 11px; color: var(--text-muted); font-weight: normal;">0/30</span>
          </label>
          <input type="email" id="demo-input-email" class="input-text" placeholder="name@example.com" maxlength="30">
          <div id="demo-input-helper" class="form-helper-text">회사 또는 개인 이메일을 입력해주세요.</div>
          <div id="demo-input-error" class="form-error-text" style="display: none;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span>올바른 이메일 형식이 아닙니다 (예: user@domain.com).</span>
          </div>
        </div>
      </div>
    `,
    overview: {
      concept: '텍스트, 이메일, 비밀번호 등을 입력받는 기본 요소입니다. 입력 필드는 독립적으로 존재하지 않고 레이블(Label), 안내 문구(Helper Text), 에러 메시지(Error Message)와 함께 완전한 폼 필드 그룹을 이룹니다.',
      doAndDont: [
        '✅ Do: 반드시 <code class="code-inline">&lt;label for="id"&gt;</code>와 <code class="code-inline">&lt;input id="id"&gt;</code>를 연결하세요 (레이블을 클릭해도 입력창에 커서가 감).',
        '❌ Don\'t: 절대로 플레이스홀더(Placeholder)를 레이블 대신 쓰지 마세요! 글자를 타이핑하기 시작하면 사라져서 내가 뭘 쓰고 있었는지 모르게 됩니다.',
        '✅ Do: 에러가 발생했을 때는 붉은 색상뿐만 아니라 명확한 텍스트 에러 문구를 함께 표시해야 색약 사용자도 인지할 수 있습니다.'
      ],
      comparison: 'Placeholder vs Helper Text: 플레이스홀더는 옅은 예시 문구(예: name@domain.com)일 뿐 안내문이 아닙니다. 필수 입력 조건이나 설명은 입력창 아래에 헬퍼 텍스트로 상시 노출하는 것이 바른 UX입니다.'
    },
    keyboard: [
      { key: 'Tab', desc: '다음 입력 필드로 이동합니다.' },
      { key: 'Shift + Tab', desc: '이전 입력 필드로 이동합니다.' }
    ],
    accessibility: [
      { prop: '&lt;label for="id"&gt;', desc: '입력창과 레이블을 논리적으로 결합 (스크린 리더가 인풋 포커스 시 라벨을 읽음).' },
      { prop: 'aria-invalid="true/false"', desc: '현재 입력값에 유효성 검사 에러가 있는지 여부 전달.' },
      { prop: 'aria-describedby="err-id"', desc: '에러 발생 시 에러 메시지 태그의 ID를 연결하여 스크린 리더가 에러를 함께 낭독하게 함.' }
    ],
    architectureTips: '실시간 유효성 검사는 타이핑할 때마다 즉시 에러를 띄우기보다는, 사용자가 입력을 마치고 포커스를 벗어났을 때(onBlur) 또는 폼 제출 시점에 첫 에러를 띄우고, 에러가 발생한 이후에만 실시간으로(onChange) 유효성을 재검사하는 것이 사용자 스트레스를 줄이는 모던 폼 패턴입니다.'
  },

  {
    id: 'badge-chip',
    name: 'Badge & Chip / 배지와 태그 칩',
    category: 'Basics & General',
    level: '기본 (초급)',
    summary: '상태 정보나 알림 숫자를 간결하게 표시하는 배지(Badge)와, 선택/삭제가 가능한 인터랙티브 칩(Chip)입니다.',
    demoHTML: `
      <div style="display: flex; flex-direction: column; gap: 20px; align-items: center;">
        <div style="display: flex; gap: 14px; align-items: center; flex-wrap: wrap; justify-content: center;">
          <div class="badge badge-category" style="gap: 6px;">
            <span class="badge-status-dot online"></span>
            <span>시스템 정상 가동</span>
          </div>
          <div class="badge badge-level" style="gap: 4px;">
            <span>알림</span>
            <span style="background: var(--accent); color: white; border-radius: 10px; padding: 0 5px; font-size: 10px;">+9</span>
          </div>
          <div class="badge badge-level intermediate">Beta v2.0</div>
        </div>

        <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
          <span style="font-size: 13px; color: var(--text-secondary);">선택된 필터 칩 (클릭하여 삭제해 보세요):</span>
          <div class="chip-container" id="demo-chip-container">
            <span class="chip-item" data-tag="React">
              React
              <button class="chip-delete-btn" aria-label="React 필터 삭제">✕</button>
            </span>
            <span class="chip-item" data-tag="TypeScript">
              TypeScript
              <button class="chip-delete-btn" aria-label="TypeScript 필터 삭제">✕</button>
            </span>
            <span class="chip-item" data-tag="Next.js">
              Next.js
              <button class="chip-delete-btn" aria-label="Next.js 필터 삭제">✕</button>
            </span>
          </div>
          <button id="demo-reset-chips" class="btn-ghost" style="font-size: 12px; text-decoration: underline; color: var(--accent-text);">
            칩 모두 다시 복원하기
          </button>
        </div>
      </div>
    `,
    overview: {
      concept: '배지(Badge)는 순수 시각적 상태(NEW, 99+, 온라인)를 나타내며 클릭할 수 없는 정적 라벨입니다. 반면 칩(Chip/Tag)은 사용자가 클릭하여 켜고 끄거나 [x] 버튼으로 제거할 수 있는 컴팩트한 인터랙션 요소입니다.',
      doAndDont: [
        '✅ Do: 검색 필터 결과나 선택된 다중 항목 목록에는 삭제 가능한 칩을 사용합니다.',
        '❌ Don\'t: 배지 안에 긴 문장을 넣지 마세요 (1~2단어 또는 숫자만 권장).'
      ],
      comparison: 'Badge vs Chip: 배지(Badge)는 "읽기 전용 상태 안내(Read-only)", 칩(Chip)은 "사용자가 조작 가능한 인터랙티브 태그(Interactive)"입니다.'
    },
    keyboard: [
      { key: 'Backspace / Delete', desc: '포커스된 칩을 삭제합니다.' },
      { key: 'Tab', desc: '칩 사이를 포커스 이동합니다.' }
    ],
    accessibility: [
      { prop: 'aria-label="태그 삭제"', desc: '칩의 [X] 삭제 버튼에 명확한 접근성 레이블 부여.' }
    ],
    architectureTips: '필터 칩 세트는 태그 추가/삭제 시 부드러운 스케일/페이드 애니메이션을 적용하면 사용자가 어떤 필터가 빠졌는지 즉각적으로 인지할 수 있습니다.'
  },

  // =========================================================================
  // 1. OVERLAYS
  // =========================================================================
  {
    id: 'dialog',
    name: 'Dialog (Modal) / 모달',
    category: 'Overlays',
    level: '실무 (중급)',
    summary: '사용자의 작업을 일시 중단하고 주의를 집중시켜 결정을 요구하거나 중요한 정보를 전달하는 차단형 대화상자입니다.',
    demoHTML: `
      <div style="text-align: center;">
        <p style="color: var(--text-secondary); margin-bottom: 16px; font-size: 14px;">
          모달이 열리면 배경이 어두워지고(Backdrop), 키보드 포커스가 모달 내부에 갇힙니다(Focus Trap).
        </p>
        <button id="demo-open-dialog" class="btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
          프로필 수정 모달 열기
        </button>
      </div>
    `,
    overview: {
      concept: '화면의 최상단 레이어에 떠서 본문과의 상호작용을 완전히 차단(Inert/Block)합니다. 사용자가 확인 또는 취소를 누르기 전까지 이전 화면으로 돌아가지 못하게 하여 결제, 삭제 확인, 긴급 경고 등에 사용됩니다.',
      doAndDont: [
        '✅ Do: 계정 삭제, 결제 최종 승인 등 사용자의 즉각적 결정이 필요한 경우 사용합니다.',
        '✅ Do: Esc 키를 누르거나 어두운 배경(Backdrop)을 클릭하면 닫히도록 배려합니다.',
        '❌ Don\'t: 단순 안내 메시지나 사소한 정보 제공을 위해 페이지 진입 시마다 모달을 띄우지 마세요(사용자 피로도 급증).'
      ],
      comparison: 'Dialog vs Popover: 모달(Dialog)은 배경 클릭 및 상호작용을 차단하지만, 팝오버(Popover)는 배경을 차단하지 않고 해당 팝업 외부를 클릭하면 조용히 닫힙니다.'
    },
    keyboard: [
      { key: 'Tab', desc: '모달 내부의 다음 포커스 가능한 요소(입력창, 버튼)로 이동합니다.' },
      { key: 'Shift + Tab', desc: '모달 내부의 이전 포커스 가능한 요소로 역방향 이동합니다.' },
      { key: 'Esc', desc: '모달을 즉시 닫고, 모달을 열었던 원래의 트리거 버튼으로 포커스를 복원합니다.' },
      { key: 'Enter / Space', desc: '선택된 확인/취소 버튼을 실행합니다.' }
    ],
    accessibility: [
      { prop: 'role="dialog"', desc: '이 컨테이너가 대화상자임을 스크린 리더에게 명시합니다.' },
      { prop: 'aria-modal="true"', desc: '모달 뒤쪽의 본문 요소들이 비활성(Inert) 상태임을 보조공학기기에 알립니다.' },
      { prop: 'aria-labelledby="id"', desc: '모달의 타이틀 제목 요소를 가리켜 모달이 열리자마자 제목을 읽어주도록 합니다.' },
      { prop: 'aria-describedby="id"', desc: '모달 본문의 상세 설명 문구를 연결합니다.' }
    ],
    architectureTips: '상급자 핵심: Focus Trap 구현. 모달이 열리면 document.body의 스크롤을 막고(overflow: hidden), 첫 번째 인풋으로 autofocus하며, 마지막 버튼에서 Tab을 누르면 첫 번째 인풋으로 강제 회전시켜야 합니다. 모달이 닫히면 직전에 클릭했던 트리거 버튼으로 focus()를 되돌려주는 것이 웹 접근성 필수입니다.'
  },

  {
    id: 'drawer',
    name: 'Drawer (Sheet) / 슬라이드 서랍',
    category: 'Overlays',
    level: '실무 (중급)',
    summary: '화면의 가장자리(좌, 우, 하단)에서 미끄러져 나오는 패널로, 모바일 네비게이션 메뉴나 긴 폼 작업에 적합합니다.',
    demoHTML: `
      <div style="text-align: center;">
        <p style="color: var(--text-secondary); margin-bottom: 16px; font-size: 14px;">
          모바일 환경 및 상세 설정, 장바구니 미리보기 등에서 주로 쓰이는 우측 슬라이드 패널입니다.
        </p>
        <button id="demo-open-drawer" class="btn-secondary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          상세 필터 Drawer 열기
        </button>
      </div>
    `,
    overview: {
      concept: '모바일 햄버거 메뉴, 장바구니 요약, 상세 필터 등 기존 페이지의 흐름을 크게 벗어나지 않으면서 보조 작업을 처리할 수 있는 넓은 공간을 제공합니다.',
      doAndDont: [
        '✅ Do: 모바일 뷰포트에서는 화면 아래에서 올라오는 Bottom Sheet 형태로 반응형 처리합니다.',
        '✅ Do: 슬라이드 아웃 애니메이션 시간은 250ms~300ms 내외로 기분 좋은 속도를 유지합니다.',
        '❌ Don\'t: 전체 화면을 완전히 덮는 형태라면 드로어 대신 새 페이지 라우팅을 고려하세요.'
      ],
      comparison: 'Modal vs Drawer: 모달은 중앙에서 시선을 강하게 집중시키지만 콘텐츠 공간이 좁습니다. 드로어는 높이가 100vh에 달해 스크롤이 필요한 긴 폼이나 필터 목록을 담기에 훨씬 유리합니다.'
    },
    keyboard: [
      { key: 'Esc', desc: '드로어를 닫고 원래 트리거로 포커스를 복원합니다.' },
      { key: 'Tab', desc: '드로어 내부의 입력 요소 사이를 탐색합니다.' }
    ],
    accessibility: [
      { prop: 'role="dialog"', desc: '드로어도 대화상자의 일종으로 취급됩니다.' },
      { prop: 'aria-hidden="true"', desc: '드로어가 닫혀 있을 때 화면 밖으로 밀려난 DOM이 스크린 리더에 잡히지 않도록 합니다.' }
    ],
    architectureTips: 'CSS transform: translateX(100%)와 will-change: transform을 사용하여 GPU 가속을 적용해야 렉 없는 60fps 부드러운 애니메이션을 얻을 수 있습니다.'
  },

  {
    id: 'popover',
    name: 'Popover / 팝오버',
    category: 'Overlays',
    level: '실무 (중급)',
    summary: '특정 트리거 요소를 기준으로 배치되는 비차단형 플로팅 컨테이너입니다. 캘린더 피커나 빠른 액션에 사용됩니다.',
    demoHTML: `
      <div style="text-align: center;">
        <div class="popover-container">
          <button id="demo-popover-trigger" class="btn-secondary" aria-haspopup="dialog" aria-expanded="false">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            치수 설정 열기
          </button>
          <div id="demo-popover-box" class="popover-content" style="display: none;">
            <div style="font-weight: 600; font-size: 14px; margin-bottom: 8px;">크기 설정</div>
            <div style="display: flex; flex-direction: column; gap: 8px; font-size: 13px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>너비</span>
                <input type="text" value="100%" class="input-text" style="width: 80px; padding: 4px 8px;">
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>높이</span>
                <input type="text" value="auto" class="input-text" style="width: 80px; padding: 4px 8px;">
              </div>
            </div>
          </div>
        </div>
      </div>
    `,
    overview: {
      concept: '트리거 버튼을 클릭했을 때 나타나는 풍선 도움말 형태의 패널입니다. 툴팁과 달리 폼 입력창, 버튼 등 클릭 가능한 인터랙티브 요소를 자유롭게 포함할 수 있습니다.',
      doAndDont: [
        '✅ Do: 화면 경계선에 닿으면 팝업의 위치를 자동으로 반대편으로 뒤집는(Flip) 로직을 갖춥니다.',
        '✅ Do: 팝오버 바깥을 클릭하면 자연스럽게 닫히도록 Outside Click 감지기를 적용합니다.',
        '❌ Don\'t: 단순 텍스트 힌트 목적으로 팝오버를 남발하지 마세요 (툴팁 권장).'
      ],
      comparison: 'Popover vs Tooltip: 툴팁은 마우스 호버 시 뜨며 클릭할 수 없는 순수 텍스트입니다. 팝오버는 클릭 시 열리며 내부 버튼/입력창과 상호작용할 수 있습니다.'
    },
    keyboard: [
      { key: 'Enter / Space', desc: '트리거 버튼에서 팝오버를 열거나 닫습니다.' },
      { key: 'Esc', desc: '팝오버를 닫고 트리거 버튼으로 포커스를 이동합니다.' }
    ],
    accessibility: [
      { prop: 'aria-haspopup="dialog"', desc: '트리거에 지정하여 누르면 팝업이 나타남을 고지합니다.' },
      { prop: 'aria-expanded="true/false"', desc: '팝오버가 현재 펼쳐져 있는지 여부를 동적으로 갱신합니다.' }
    ],
    architectureTips: 'Floating UI(구 Popper.js) 같은 라이브러리의 원리를 이해해야 합니다. 부모의 overflow: hidden에 잘리지 않도록 Portal을 통해 body에 렌더링하고, trigger.getBoundingClientRect()로 절대 좌표(x, y)를 계산해 부착합니다.'
  },

  {
    id: 'tooltip',
    name: 'Tooltip / 툴팁',
    category: 'Overlays',
    level: '기본 (초급)',
    summary: '마우스를 올리거나 키보드 포커스가 닿았을 때 나타나는 짧은 설명용 레이블입니다.',
    demoHTML: `
      <div style="display: flex; gap: 16px; justify-content: center; align-items: center;">
        <div class="tooltip-trigger-wrap">
          <button class="btn-icon" aria-label="즐겨찾기에 추가">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </button>
          <div class="tooltip-box" role="tooltip">즐겨찾기에 추가 (단축키: ⌘+D)</div>
        </div>

        <div class="tooltip-trigger-wrap">
          <button class="btn-icon" aria-label="링크 복사">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          </button>
          <div class="tooltip-box" role="tooltip">클립보드에 링크 복사</div>
        </div>
      </div>
    `,
    overview: {
      concept: '아이콘 버튼처럼 텍스트 라벨이 없는 요소의 의미를 보완할 때 주로 사용합니다. 사용자의 흐름을 방해하지 않는 비침해적(Non-intrusive) 정보 제공 도구입니다.',
      doAndDont: [
        '✅ Do: 툴팁 안에는 1~2줄의 짧고 직관적인 설명만 담습니다.',
        '❌ Don\'t: 툴팁 내부에 클릭 가능한 버튼이나 링크를 넣지 마세요 (마우스 이동 시 닫혀서 클릭 불가).',
        '❌ Don\'t: 모바일 기기에서는 호버(Hover)가 없으므로 툴팁에만 핵심 정보를 의존해서는 안 됩니다.'
      ],
      comparison: 'Tooltip vs Title 속성: HTML 기본 title="" 속성은 브라우저마다 렌더링 딜레이가 제각각이고 접근성이 매우 떨어집니다. 커스텀 CSS/JS 툴팁을 만드는 것이 표준입니다.'
    },
    keyboard: [
      { key: 'Tab', desc: '아이콘 버튼에 포커스되면 툴팁이 자동으로 표시됩니다.' },
      { key: 'Esc', desc: '포커스를 유지한 채로 툴팁만 닫을 수 있어야 합니다 (WCAG 2.1 표준).' }
    ],
    accessibility: [
      { prop: 'role="tooltip"', desc: '스크린 리더에게 이 요소가 툴팁 텍스트임을 명시합니다.' },
      { prop: 'aria-describedby="tooltip-id"', desc: '트리거 요소와 툴팁을 연결하여 스크린 리더가 버튼 포커스 시 툴팁을 읽게 합니다.' }
    ],
    architectureTips: '툴팁은 마우스 진입 즉시 뜨면 화면을 어지럽히므로, 통상 200~400ms의 딜레이(Delay)를 두고 띄우며, 다른 툴팁으로 이동할 때는 딜레이 없이 즉시 전환되는 Skip Delay 알고리즘이 적용됩니다.'
  },

  {
    id: 'hover-card',
    name: 'Hover Card / 호버 카드',
    category: 'Overlays',
    level: '실무 (중급)',
    summary: '링크에 마우스를 올렸을 때 이동하지 않고도 프로필, 문서 미리보기를 빠르게 확인할 수 있는 리치 프리뷰 카드입니다.',
    demoHTML: `
      <div style="text-align: center;">
        <span style="font-size: 14px; color: var(--text-secondary);">프로젝트 리드: </span>
        <span class="hovercard-trigger">
          @radix_core
          <div class="hovercard-content">
            <div style="display: flex; gap: 12px; align-items: flex-start;">
              <div style="width: 44px; height: 44px; border-radius: 50%; background: var(--accent); display: flex; align-items: center; justify-content: center; font-weight: 700; color: white;">
                RC
              </div>
              <div style="flex: 1; text-align: left;">
                <div style="font-weight: 700; font-size: 14px; color: var(--text-primary);">Radix UI Core</div>
                <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 6px;">@radix_core</div>
                <div style="font-size: 12.5px; color: var(--text-secondary); line-height: 1.4;">
                  접근성을 고려한 고품질 헤드리스 UI 프리미티브를 제작하는 팀입니다.
                </div>
              </div>
            </div>
          </div>
        </span>
      </div>
    `,
    overview: {
      concept: '트위터(X), 깃허브, 노션 등에서 사용자 멘션이나 이슈 링크에 마우스를 올리면 뜨는 미니 프로필 카드입니다. 페이지 이동 없이 빠른 맥락 파악을 가능하게 합니다.',
      doAndDont: [
        '✅ Do: 마우스가 링크에서 호버 카드로 옮겨갈 때 꺼지지 않도록 약간의 호버 마진(Hit area) 및 안전 타임아웃(Safe Triangle)을 둡니다.',
        '✅ Do: 팔로우 버튼, 링크 등 간단한 액션을 포함할 수 있습니다.'
      ],
      comparison: 'Hover Card vs Tooltip: 툴팁은 순수 텍스트만 허용되지만, 호버 카드는 이미지, 링크, 버튼을 포함할 수 있는 완전한 리치 인터랙션 카드입니다.'
    },
    keyboard: [
      { key: 'Tab', desc: '키보드 사용자를 위해 링크 포커스 시에도 카드가 보이거나 상세 페이지로 바로 갈 수 있어야 합니다.' }
    ],
    accessibility: [
      { prop: 'aria-haspopup="dialog"', desc: '링크 뒤에 리치 팝업이 존재함을 알립니다.' }
    ],
    architectureTips: '마우스가 트리거에서 카드 본문으로 대각선 이동할 때 마우스아웃 이벤트로 창이 닫혀버리는 문제를 방지하기 위해 pointer-events 및 커서 궤적 삼각형 알고리즘(Amazon mega menu 등에서 쓰임)을 고려합니다.'
  },

  {
    id: 'toast',
    name: 'Toast (Snackbar) / 토스트',
    category: 'Overlays',
    level: '실무 (중급)',
    summary: '사용자의 행동에 대한 결과를 화면 모퉁이에 잠시 띄워 알려주는 비동기 상태 피드백 알림입니다.',
    demoHTML: `
      <div style="display: flex; gap: 12px; justify-content: center;">
        <button id="demo-toast-success" class="btn-secondary" style="border-color: var(--success); color: var(--success);">
          성공 토스트 발송
        </button>
        <button id="demo-toast-error" class="btn-secondary" style="border-color: var(--danger); color: var(--danger);">
          에러 토스트 발송
        </button>
      </div>
    `,
    overview: {
      concept: '토스트는 식빵 굽는 기계(토스터)에서 빵이 뿅 하고 튀어나오듯 아래나 위에서 나타났다 사라지는 데서 유래했습니다. 사용자의 현재 작업을 방해하지 않고 조용히 결과를 알립니다.',
      doAndDont: [
        '✅ Do: 3~5초 후 자동으로 닫히되, 마우스를 올리면(Hover) 타이머를 일시 중지(Pause)합니다.',
        '✅ Do: "실행 취소(Undo)" 같은 즉각적인 보상 액션을 함께 배치하면 최고의 UX가 됩니다.',
        '❌ Don\'t: 결제 오류나 데이터 손실 같은 치명적인 정보는 자동으로 사라지는 토스트로 띄우지 마세요(모달 권장).'
      ],
      comparison: 'Toast vs Banner: 토스트는 플로팅되어 일정 시간 후 사라집니다. 배너(Banner)는 화면 상단에 인라인으로 고정되어 사용자가 직접 닫을 때까지 유지됩니다.'
    },
    keyboard: [
      { key: 'Alt + T / F6', desc: '접근성 표준: 화면 구석에 뜬 토스트 영역으로 키보드 포커스를 신속히 이동시키는 단축키를 제공합니다.' }
    ],
    accessibility: [
      { prop: 'aria-live="polite"', desc: '중요: 현재 스크린 리더가 읽고 있는 말이 끝난 후 자연스럽게 토스트 메시지를 소리 내어 읽어줍니다.' },
      { prop: 'role="status"', desc: '성공/상태 안내용 역할 부여 (치명적 에러는 role="alert" 사용).' }
    ],
    architectureTips: '토스트는 단일 인스턴스가 아니라 여러 알림이 차곡차곡 쌓이는 큐(Queue) 구조로 설계해야 합니다. 최대 노출 개수(보통 3개)를 제한하고 오래된 토스트는 아래로 밀려나며 자동 폐기됩니다.'
  },

  // =========================================================================
  // 2. DISCLOSURE & NAVIGATION
  // =========================================================================
  {
    id: 'accordion',
    name: 'Accordion / 아코디언',
    category: 'Disclosure & Nav',
    level: '기본 (초급)',
    summary: '세로로 나열된 헤더를 클릭하여 섹션을 접거나 펼칠 수 있는 인터페이스입니다. FAQ나 설정 페이지에 주로 쓰입니다.',
    demoHTML: `
      <div style="width: 100%; display: flex; flex-direction: column; align-items: center; gap: 12px;">
        <div style="display: flex; gap: 8px; font-size: 13px; align-items: center;">
          <span>모드 설정: </span>
          <button id="accordion-mode-toggle" class="btn-ghost" style="border: 1px solid var(--border-default);">
            모드: <strong id="accordion-mode-text" style="color: var(--accent-text);">Single (단일 확장)</strong>
          </button>
        </div>
        <div class="accordion-wrapper" id="demo-accordion">
          <div class="accordion-item expanded">
            <button class="accordion-trigger" aria-expanded="true">
              <span>웹 접근성(A11y)이란 무엇인가요?</span>
              <svg class="accordion-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div class="accordion-content">
              장애인이나 고령자 등 모든 사용자가 신체적 제약 없이 동등하게 웹 사이트의 정보를 이용할 수 있도록 보장하는 기술과 표준입니다.
            </div>
          </div>
          <div class="accordion-item">
            <button class="accordion-trigger" aria-expanded="false">
              <span>헤드리스 UI(Headless UI)의 장점은?</span>
              <svg class="accordion-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div class="accordion-content">
              디자인 CSS 스타일이 전혀 강제되지 않고, 오직 키보드 조작과 접근성 ARIA 상태 로직만 제공하므로 완벽한 커스텀 디자인 시스템 구축이 가능합니다.
            </div>
          </div>
          <div class="accordion-item">
            <button class="accordion-trigger" aria-expanded="false">
              <span>Focus Trap은 언제 필요한가요?</span>
              <svg class="accordion-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div class="accordion-content">
              모달이나 풀스크린 드로어가 열렸을 때 사용자가 Tab 키를 눌러 배경의 보이지 않는 링크를 누르지 못하도록 포커스를 내부로 가둘 때 필수적입니다.
            </div>
          </div>
        </div>
      </div>
    `,
    overview: {
      concept: '한정된 세로 공간에 많은 양의 텍스트나 항목을 깔끔하게 압축해서 보여주고 싶을 때 사용합니다. 악기 아코디언처럼 늘어났다 줄어드는 형태입니다.',
      doAndDont: [
        '✅ Do: 사용자가 전체 내용을 비교해서 읽어야 하는 중요한 문서는 아코디언 뒤에 숨기지 마세요.',
        '✅ Do: 한 번에 하나만 열리는 Single 모드와 여러 개를 동시에 열 수 있는 Multiple 모드를 용도에 맞게 선택합니다.'
      ],
      comparison: 'Accordion vs Tabs: 아코디언은 수직 스크롤 흐름을 유지하며 내용이 아래로 밀려나지만, 탭은 동일한 직사각형 공간 내에서 내용 뷰를 통째로 교체합니다.'
    },
    keyboard: [
      { key: 'Enter / Space', desc: '포커스된 아코디언 헤더를 펼치거나 접습니다.' },
      { key: '↓ / ↑', desc: '헤더 사이를 위아래 방향키로 신속하게 순환 이동합니다.' },
      { key: 'Home / End', desc: '첫 번째 또는 마지막 아코디언 헤더로 즉시 점프합니다.' }
    ],
    accessibility: [
      { prop: 'aria-expanded="true/false"', desc: '현재 항목이 열려 있는지 여부를 스크린 리더에 알립니다.' },
      { prop: 'aria-controls="panel-id"', desc: '헤더 버튼이 어떤 내용 패널을 제어하는지 ID로 연결합니다.' }
    ],
    architectureTips: 'CSS 애니메이션 구현 시 height: auto는 transition이 먹히지 않습니다. grid-template-rows: 0fr -> 1fr 기법이나 max-height를 활용하여 자연스러운 개폐 애니메이션을 구현합니다.'
  },

  {
    id: 'collapsible',
    name: 'Collapsible / 접기·펼치기',
    category: 'Disclosure & Nav',
    level: '기본 (초급)',
    summary: '단일 영역의 콘텐츠를 보이거나 숨길 수 있는 가장 기초적인 토글 컴포넌트입니다.',
    demoHTML: `
      <div style="width: 100%; display: flex; justify-content: center;">
        <div class="collapsible-box">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-weight: 600; font-size: 14px;">저장소 통계</span>
            <button id="demo-collapsible-btn" class="btn-ghost" style="font-size: 12px; border: 1px solid var(--border-default);">
              상세 보기
            </button>
          </div>
          <div style="font-size: 13px; color: var(--text-secondary);">Stars: 14.2k • Forks: 1.8k</div>
          <div id="demo-collapsible-content" style="display: none; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-subtle); font-size: 13px; color: var(--text-muted);">
            Open Issues: 42개<br>
            Recent Commits: 18분 전<br>
            License: MIT
          </div>
        </div>
      </div>
    `,
    overview: {
      concept: 'HTML5 네이티브 태그인 <code class="code-inline">&lt;details&gt;</code>와 <code class="code-inline">&lt;summary&gt;</code>로 브라우저 자체 지원도 가능한 컴포넌트입니다. 부가적인 부연설명을 접어둘 때 유용합니다.',
      doAndDont: [
        '✅ Do: 기본값은 접힘(Closed)으로 두어 화면의 시각적 복잡도를 낮춥니다.'
      ],
      comparison: 'Collapsible vs Accordion: Collapsible은 단독 1개 요소를 토글하는 것이고, Accordion은 이러한 Collapsible이 여러 개 모여 상호 연동되는 세트입니다.'
    },
    keyboard: [
      { key: 'Enter / Space', desc: '트리거 버튼을 토글합니다.' }
    ],
    accessibility: [
      { prop: 'aria-expanded', desc: '펼침 상태를 동기화합니다.' }
    ],
    architectureTips: '순수 HTML &lt;details open&gt;을 사용하면 JS 없이도 완전한 접근성 지원이 가능합니다.'
  },

  {
    id: 'tabs',
    name: 'Tabs / 탭',
    category: 'Disclosure & Nav',
    level: '실무 (중급)',
    summary: '동일한 컨텍스트 내에서 서로 다른 내용 패널을 탭 버튼으로 전환하며 보여주는 내비게이션입니다.',
    demoHTML: `
      <div style="width: 100%; display: flex; justify-content: center;">
        <div class="tabs-demo-wrap">
          <div class="tab-list-styled" role="tablist" aria-label="프로필 탭 데모">
            <button class="tab-trigger-styled active" role="tab" aria-selected="true" data-tab="tab-acc">계정 정보</button>
            <button class="tab-trigger-styled" role="tab" aria-selected="false" data-tab="tab-sec">보안 설정</button>
            <button class="tab-trigger-styled" role="tab" aria-selected="false" data-tab="tab-not">알림 관리</button>
          </div>
          <div id="tab-acc" class="tab-content-styled">
            <h4 style="font-size: 14px; font-weight: 600; margin-bottom: 6px; color: var(--text-primary);">계정 세부사항</h4>
            <p>이름과 프로필 사진, 기본 이메일 주소를 변경할 수 있습니다.</p>
          </div>
          <div id="tab-sec" class="tab-content-styled" style="display: none;">
            <h4 style="font-size: 14px; font-weight: 600; margin-bottom: 6px; color: var(--text-primary);">보안 및 인증</h4>
            <p>2단계 인증(2FA)을 활성화하고 최근 로그인 기기를 확인합니다.</p>
          </div>
          <div id="tab-not" class="tab-content-styled" style="display: none;">
            <h4 style="font-size: 14px; font-weight: 600; margin-bottom: 6px; color: var(--text-primary);">알림 환경설정</h4>
            <p>이메일 구독 및 마케팅 알림 수신 여부를 설정합니다.</p>
          </div>
        </div>
      </div>
    `,
    overview: {
      concept: '한 화면에서 페이지 이동 없이 관련된 정보 그룹을 빠르게 오갈 수 있게 만듭니다. 데스크톱과 모바일 모두에서 가장 널리 쓰이는 표준 패턴입니다.',
      doAndDont: [
        '✅ Do: 탭의 개수는 보통 2~6개 사이로 유지합니다.',
        '❌ Don\'t: 탭을 2줄 이상으로 겹쳐 쌓는 다단 탭(Multi-row tabs)은 사용자가 선택 위치를 잃어버리므로 절대 금기시됩니다.'
      ],
      comparison: 'Tabs vs Segmented Control: 탭은 패널 뷰 전체를 교체하는 탐색용이고, 세그먼트 컨트롤은 폼 내부에서 값을 선택하는 인라인 입력 도구입니다.'
    },
    keyboard: [
      { key: '← / →', desc: '좌우 화살표 키로 이전/다음 탭으로 이동하며 즉시 활성화합니다.' },
      { key: 'Home / End', desc: '첫 번째 탭 또는 마지막 탭으로 이동합니다.' }
    ],
    accessibility: [
      { prop: 'role="tablist"', desc: '탭 버튼들을 묶는 컨테이너.' },
      { prop: 'role="tab"', desc: '개별 탭 버튼.' },
      { prop: 'role="tabpanel"', desc: '탭에 매칭되는 실제 본문 내용 영역.' },
      { prop: 'aria-selected="true/false"', desc: '현재 어떤 탭이 활성화되었는지 표시.' }
    ],
    architectureTips: 'W3C 접근성 표준에 따르면, 탭 버튼 사이의 이동은 Tab 키가 아니라 좌우 화살표(Arrow keys)로 이루어져야 하며, 탭 그룹 자체는 단 한 번의 Tab 키로 통과할 수 있어야 합니다(Roving tabindex 패턴).'
  },

  {
    id: 'segmented-control',
    name: 'Segmented Control / 세그먼트 컨트롤',
    category: 'Disclosure & Nav',
    level: '실무 (중급)',
    summary: '2~5개의 상호 배타적인 옵션 중 하나를 즉시 선택할 수 있는 인라인 토글 버튼 바입니다.',
    demoHTML: `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 14px;">
        <div class="segmented-control" role="group" aria-label="보기 모드">
          <button class="segmented-btn active" data-val="day">일간</button>
          <button class="segmented-btn" data-val="week">주간</button>
          <button class="segmented-btn" data-val="month">월간</button>
          <button class="segmented-btn" data-val="year">연간</button>
        </div>
        <div id="segmented-display" style="font-size: 13px; color: var(--text-secondary);">
          선택된 주기: <strong style="color: var(--accent-text);">일간 (Day)</strong>
        </div>
      </div>
    `,
    overview: {
      concept: 'iOS에서 널리 보급된 UI로, 라디오 버튼(Radio Button)의 시각적으로 업그레이드된 현대적 변형입니다. 차트 보기 단위나 필터 토글에 최적화되어 있습니다.',
      doAndDont: [
        '✅ Do: 옵션 간의 글자 길이가 비슷할 때 시각적 밸런스가 가장 좋습니다.',
        '❌ Don\'t: 옵션이 6개 이상으로 많아지면 세그먼트 컨트롤 대신 Dropdown/Select를 사용해야 합니다.'
      ],
      comparison: 'Segmented Control vs Radio Button: 내부적인 접근성 원리와 동작은 라디오 버튼과 100% 동일하지만, 외형이 둥근 캡슐형 버튼 그룹으로 디자인된 것입니다.'
    },
    keyboard: [
      { key: '← / →', desc: '라디오 그룹 표준에 따라 화살표 키로 이전/다음 옵션을 즉시 선택합니다.' }
    ],
    accessibility: [
      { prop: 'role="radiogroup"', desc: '전체 바를 라디오 그룹으로 선언.' },
      { prop: 'role="radio"', desc: '각 세그먼트 버튼을 라디오 항목으로 매핑.' },
      { prop: 'aria-checked="true/false"', desc: '선택 상태 전달.' }
    ],
    architectureTips: '슬라이딩 인디케이터(배경 pill이 좌우로 스르륵 미끄러지는 효과)를 구현할 때는 선택된 버튼의 offsetLeft와 offsetWidth를 계산하여 CSS transform: translateX()로 이동시킵니다.'
  },

  {
    id: 'breadcrumb',
    name: 'Breadcrumb / 브레드크럼',
    category: 'Disclosure & Nav',
    level: '기본 (초급)',
    summary: '현재 페이지의 웹 사이트 계층 구조 내 위치를 보여주고 상위 단계로 쉽게 돌아갈 수 있게 돕는 경로 네비게이션입니다.',
    demoHTML: `
      <div style="display: flex; justify-content: center;">
        <nav class="breadcrumb-nav" aria-label="사이트 경로">
          <a href="#" style="color: var(--text-muted);">홈</a>
          <span class="breadcrumb-separator">/</span>
          <a href="#" style="color: var(--text-muted);">디자인 시스템</a>
          <span class="breadcrumb-separator">/</span>
          <a href="#" style="color: var(--text-muted);">컴포넌트</a>
          <span class="breadcrumb-separator">/</span>
          <span class="breadcrumb-current" aria-current="page">브레드크럼</span>
        </nav>
      </div>
    `,
    overview: {
      concept: '동화 헨젤과 그레텔에서 숲속에 길을 잃지 않으려고 빵부스러기를 떨어뜨린 이야기에서 유래했습니다. 쇼핑몰 카테고리나 문서 사이트에서 필수적입니다.',
      doAndDont: [
        '✅ Do: 현재 페이지(마지막 항목)는 링크가 아닌 텍스트로 두고 aria-current="page"를 지정합니다.',
        '✅ Do: 계층 구분자(/, > 등)는 장식용이므로 스크린 리더가 읽지 않도록 aria-hidden="true" 처리합니다.'
      ],
      comparison: 'Breadcrumb vs History Back: 브레드크럼은 사용자가 방문했던 과거 발자취(방문 기록)가 아니라 사이트의 엄격한 "정보 구조 계층(IA)"을 보여줍니다.'
    },
    keyboard: [
      { key: 'Tab', desc: '링크 순서대로 포커스를 이동합니다.' }
    ],
    accessibility: [
      { prop: 'aria-label="Breadcrumb"', desc: 'nav 태그에 명시하여 일반 메뉴와 브레드크럼을 구분.' },
      { prop: 'aria-current="page"', desc: '마지막 요소가 현재 보고 있는 페이지임을 알림.' }
    ],
    architectureTips: 'SEO(검색엔진 최적화) 관점에서 구글 봇이 사이트 구조를 크롤링할 수 있도록 Schema.org의 BreadcrumbList JSON-LD 마이크로데이터를 함께 삽입하는 것이 실무 표준입니다.'
  },

  // =========================================================================
  // 3. FORM & SELECTION
  // =========================================================================
  {
    id: 'radio-group',
    name: 'Radio Group / 라디오 그룹',
    category: 'Form & Selection',
    level: '기본 (초급)',
    summary: '상호 배타적인 여러 옵션 중 반드시 단 1개만 선택할 수 있는 라디오 버튼 그룹입니다.',
    demoHTML: `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 16px; width: 100%;">
        <div class="radio-group-wrap" role="radiogroup" aria-label="구독 멤버십 플랜 선택" id="demo-radio-group">
          <div class="radio-item checked" role="radio" aria-checked="true" tabindex="0" data-val="starter">
            <div class="radio-circle">
              <div class="radio-inner-dot"></div>
            </div>
            <div class="radio-text-box">
              <div class="radio-label">스타터 플랜 (무료)</div>
              <div class="radio-desc">개인 학습 및 토이 프로젝트에 적합합니다.</div>
            </div>
          </div>

          <div class="radio-item" role="radio" aria-checked="false" tabindex="-1" data-val="pro">
            <div class="radio-circle">
              <div class="radio-inner-dot"></div>
            </div>
            <div class="radio-text-box">
              <div class="radio-label">프로 플랜 (월 12,000원)</div>
              <div class="radio-desc">팀 협업 및 고성능 클라우드 기능이 제공됩니다.</div>
            </div>
          </div>

          <div class="radio-item" role="radio" aria-checked="false" tabindex="-1" data-val="enterprise">
            <div class="radio-circle">
              <div class="radio-inner-dot"></div>
            </div>
            <div class="radio-text-box">
              <div class="radio-label">엔터프라이즈 (맞춤 견적)</div>
              <div class="radio-desc">전담 매니저 및 99.9% 가동률 보장 SLA.</div>
            </div>
          </div>
        </div>

        <div id="demo-radio-result" style="font-size: 13px; color: var(--text-secondary);">
          현재 선택된 플랜: <strong style="color: var(--accent-text);">스타터 플랜 (무료)</strong>
        </div>
      </div>
    `,
    overview: {
      concept: '옛날 자동차 라디오에서 한 방송국 주파수 버튼을 꾹 누르면 다른 버튼이 툭 튀어나오는 물리적 기계 구조에서 유래했습니다. 여러 선택지 중 반드시 하나만 골라야 할 때 씁니다.',
      doAndDont: [
        '✅ Do: 옵션 중 가장 안전하거나 권장되는 기본값(Default option)을 반드시 1개 선택해 두세요.',
        '✅ Do: 옵션 개수는 2~5개일 때 가장 적합합니다. 6개 이상이면 드롭다운(Select)을 고려하세요.',
        '❌ Don\'t: 한 번 선택한 후 선택을 해제하여 "아무것도 선택 안 함" 상태로 되돌릴 수 없다는 점에 주의하세요 (선택 해제가 필요하다면 체크박스를 써야 함).'
      ],
      comparison: 'Radio vs Checkbox: 체크박스는 "짜장면도 먹고 탕수육도 먹을래 (0개 이상 다중 선택)", 라디오는 "짜장면 vs 짬뽕 중 무조건 1개만 골라 (배타적 단일 선택)"입니다.'
    },
    keyboard: [
      { key: '↓ / →', desc: '다음 라디오 버튼으로 포커스를 이동하고 "즉시 선택"합니다 (W3C APG 표준).' },
      { key: '↑ / ←', desc: '이전 라디오 버튼으로 포커스를 이동하고 "즉시 선택"합니다.' },
      { key: 'Tab', desc: '라디오 그룹 전체를 단 1번의 Tab으로 빠져나갑니다 (선택된 라디오만 탭 포커스를 받음).' },
      { key: 'Space', desc: '포커스된 라디오 버튼을 선택합니다.' }
    ],
    accessibility: [
      { prop: 'role="radiogroup"', desc: '여러 라디오 버튼을 하나로 묶는 컨테이너에 선언.' },
      { prop: 'role="radio"', desc: '개별 라디오 버튼 요소.' },
      { prop: 'aria-checked="true/false"', desc: '현재 선택 여부 전달.' },
      { prop: 'tabindex="0" vs "-1"', desc: '선택된 항목만 tabindex="0"이고 나머지는 "-1"로 설정하여 탭 키 1번으로 그룹을 건너뛰게 함 (Roving tabindex 패턴).' }
    ],
    architectureTips: 'W3C 접근성 가이드라인에 따르면, 라디오 그룹 내에서 화살표 키(Arrow key)를 누르면 포커스 이동과 동시에 선택 상태(Selection)가 즉각 변경되어야 하며, 마지막 항목에서 아래 화살표를 누르면 첫 번째 항목으로 순환(Wrap)되어야 합니다.'
  },
  {
    id: 'dropdown-menu',
    name: 'Dropdown Menu / 드롭다운 메뉴',
    category: 'Form & Selection',
    level: '실무 (중급)',
    summary: '버튼 클릭 시 일련의 액션이나 명령 목록이 아래로 펼쳐지는 액션형 메뉴입니다.',
    demoHTML: `
      <div style="text-align: center; position: relative;">
        <div style="display: inline-block; position: relative;">
          <button id="demo-dropdown-trigger" class="btn-secondary" aria-haspopup="menu" aria-expanded="false">
            옵션 더보기
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div id="demo-dropdown-box" class="dropdown-menu-box" style="display: none;">
            <button class="menu-item" role="menuitem">
              <span>새 탭에서 열기</span>
              <span class="menu-shortcut">⌘T</span>
            </button>
            <button class="menu-item" role="menuitem">
              <span>링크 복사</span>
              <span class="menu-shortcut">⌘C</span>
            </button>
            <div class="menu-separator"></div>
            <button class="menu-item" role="menuitem" style="color: var(--danger);">
              <span>프로젝트 삭제</span>
              <span class="menu-shortcut">⌫</span>
            </button>
          </div>
        </div>
      </div>
    `,
    overview: {
      concept: 'Select와 달리 단순히 값을 입력하기 위한 것이 아니라, 시스템 명령(수정, 공유, 복사, 삭제)을 실행하기 위한 컨텍스트 메뉴입니다.',
      doAndDont: [
        '✅ Do: 키보드 단축키가 있는 명령이라면 우측에 키보드 힌트(Shortcut)를 표시합니다.',
        '✅ Do: 삭제 같은 파괴적인 액션은 하단에 배치하고 빨간색으로 시각적 경고를 줍니다.'
      ],
      comparison: 'Dropdown Menu vs Select: Select는 폼에서 하나의 값을 선택해 제출(Submit)하기 위함이고, Dropdown Menu는 클릭하는 즉시 특정 함수나 명령을 실행하기 위함입니다.'
    },
    keyboard: [
      { key: '↓ / ↑', desc: '메뉴 항목 사이를 위아래 방향키로 포커스 이동합니다.' },
      { key: 'Enter / Space', desc: '해당 메뉴 명령을 실행하고 메뉴를 닫습니다.' },
      { key: 'Esc', desc: '메뉴를 닫고 트리거 버튼으로 포커스를 복원합니다.' }
    ],
    accessibility: [
      { prop: 'role="menu"', desc: '메뉴 컨테이너 선언.' },
      { prop: 'role="menuitem"', desc: '개별 메뉴 실행 버튼.' }
    ],
    architectureTips: '메뉴가 열렸을 때 첫 번째 메뉴 아이템으로 자동 포커스(Auto-focus)를 보내고, 방향키 순환 시 첫 번째 항목에서 위쪽 키를 누르면 맨 아래 항목으로 순환 랩핑(Wrap around)되도록 만듭니다.'
  },

  {
    id: 'combobox',
    name: 'Combobox (Autocomplete) / 콤보박스',
    category: 'Form & Selection',
    level: '심화 (상급)',
    summary: '입력 필드(Input)와 제안 목록(Listbox)이 합쳐져 실시간 검색 및 자동완성을 제공하는 고급 컨트롤입니다.',
    demoHTML: `
      <div style="display: flex; justify-content: center;">
        <div class="combobox-wrap">
          <label style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 6px;">기술 스택 검색</label>
          <input type="text" id="demo-combobox-input" class="input-text" style="width: 100%;" placeholder="타이핑해 보세요 (예: React, TypeScript)..." autocomplete="off">
          <div id="demo-combobox-list" class="combobox-results" style="display: none;">
            <!-- Rendered by JS -->
          </div>
          <div id="demo-combobox-selected" style="margin-top: 8px; font-size: 12.5px; color: var(--text-muted);">
            선택된 기술: 없음
          </div>
        </div>
      </div>
    `,
    overview: {
      concept: '항목이 수십 개~수만 개에 달할 때 단순 Select 드롭다운으로 스크롤하기 어렵기 때문에 사용자가 직접 타이핑하여 결과를 좁혀나갈 수 있도록 돕습니다.',
      doAndDont: [
        '✅ Do: 일치하는 검색어가 없을 때는 친절한 Empty State ("검색 결과가 없습니다")를 표시합니다.',
        '✅ Do: 입력어와 일치하는 하이라이트 글자(굵게 표시) 처리를 제공합니다.'
      ],
      comparison: 'Combobox vs Select: 일반 Select는 타이핑 검색이 불가능하지만, 콤보박스는 실시간 키워드 필터링과 원격 API 호출을 결합할 수 있습니다.'
    },
    keyboard: [
      { key: '↓ / ↑', desc: '검색 목록 사이를 이동합니다 (입력창 포커스를 유지한 채 가상 포커스 이동).' },
      { key: 'Enter', desc: '현재 하이라이트된 옵션을 선택하고 목록을 닫습니다.' },
      { key: 'Esc', desc: '제안 목록을 닫고 입력창을 비우거나 이전 상태로 되돌립니다.' }
    ],
    accessibility: [
      { prop: 'role="combobox"', desc: '입력창에 콤보박스 역할 선언.' },
      { prop: 'aria-autocomplete="list"', desc: '목록 형태로 자동완성을 제안함을 고지.' },
      { prop: 'aria-activedescendant="item-id"', desc: '실제 포커스는 input에 머물면서 현재 선택된 가상 목록 ID를 스크린 리더에 실시간 전달(가장 중요한 접근성 패턴).' }
    ],
    architectureTips: 'Combobox는 프론트엔드 컴포넌트 중 구현 난이도가 가장 높은 편에 속합니다. debounce를 통한 API 요청 최적화와 aria-activedescendant를 통한 가상 포커스 관리가 핵심입니다.'
  },

  {
    id: 'switch-checkbox',
    name: 'Switch vs Checkbox / 스위치와 체크박스',
    category: 'Form & Selection',
    level: '기본 (초급)',
    summary: '즉각적인 시스템 상태 변경(Switch)과 일괄 제출용 다중 선택(Checkbox)의 UX 차이를 비교합니다.',
    demoHTML: `
      <div style="display: flex; flex-direction: column; gap: 20px; align-items: center;">
        <div style="background: var(--bg-subtle); padding: 16px 20px; border-radius: var(--radius-md); border: 1px solid var(--border-default); width: 340px;">
          <div style="font-size: 13px; font-weight: 700; color: var(--accent-text); margin-bottom: 8px;">1. Toggle Switch (즉시 반영)</div>
          <div class="switch-box">
            <div id="demo-switch" class="switch-track checked" role="switch" aria-checked="true" tabindex="0">
              <div class="switch-thumb"></div>
            </div>
            <span id="demo-switch-label" style="font-size: 14px; font-weight: 500;">자동 동기화 켜짐</span>
          </div>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: 6px;">누르는 즉시 클라우드에 실시간 저장됩니다.</div>
        </div>

        <div style="background: var(--bg-subtle); padding: 16px 20px; border-radius: var(--radius-md); border: 1px solid var(--border-default); width: 340px;">
          <div style="font-size: 13px; font-weight: 700; color: #46a758; margin-bottom: 8px;">2. Checkbox (제출 시 반영)</div>
          <div id="demo-checkbox" class="custom-checkbox" tabindex="0" role="checkbox" aria-checked="false">
            <div class="checkbox-visual">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="display: none;"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <span style="font-size: 14px; font-weight: 500;">서비스 이용약관에 동의합니다</span>
          </div>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: 6px;">하단의 '가입 완료' 버튼을 눌러야 폼이 제출됩니다.</div>
        </div>
      </div>
    `,
    overview: {
      concept: '실무에서 디자이너와 개발자가 가장 많이 헷갈려하는 부분입니다. 스위치는 물리적 조명 스위치처럼 누르자마자 켜지는 "즉시 효과"이고, 체크박스는 "체크한 후 저장 버튼을 누르는" 맥락에 씁니다.',
      doAndDont: [
        '✅ Do: "저장" 버튼이 있는 모달이나 긴 폼 안에서는 Switch 대신 Checkbox를 사용하세요.',
        '✅ Do: 환경설정(다크 모드, Wi-Fi 켜기, 푸시 알림 수신)처럼 즉시 켜고 꺼야 할 때는 Switch를 사용하세요.'
      ],
      comparison: 'Switch vs Checkbox: 폼 제출(Submit) 여부와 즉시성(Immediacy)이 두 컴포넌트를 가르는 결정적 기준입니다.'
    },
    keyboard: [
      { key: 'Space', desc: '체크박스와 스위치의 체크 상태를 토글합니다.' }
    ],
    accessibility: [
      { prop: 'role="switch"', desc: '스위치 컨트롤임을 알림.' },
      { prop: 'role="checkbox"', desc: '체크박스 컨트롤임을 알림.' },
      { prop: 'aria-checked="true/false"', desc: '선택 상태.' }
    ],
    architectureTips: '체크박스에는 true, false 외에도 자식 항목 일부만 선택되었음을 나타내는 indeterminate (불확정) 3차 상태가 존재합니다 (HTML 엘리먼트 프로퍼티 checkbox.indeterminate = true).'
  },

  {
    id: 'slider',
    name: 'Slider / 슬라이더',
    category: 'Form & Selection',
    level: '실무 (중급)',
    summary: '연속적인 수치 범위(볼륨, 가격 필터, 밝기)를 마우스 드래그나 키보드로 조절하는 컴포넌트입니다.',
    demoHTML: `
      <div style="display: flex; justify-content: center;">
        <div class="slider-container">
          <div style="display: flex; justify-content: space-between; font-size: 13.5px;">
            <span>최대 예산 필터</span>
            <strong id="slider-val" style="color: var(--accent-text);">50만 원</strong>
          </div>
          <div id="demo-slider-track" class="slider-track" role="slider" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50" tabindex="0">
            <div id="demo-slider-range" class="slider-range" style="width: 50%;"></div>
            <div id="demo-slider-thumb" class="slider-thumb" style="left: 50%;"></div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted);">
            <span>0원</span>
            <span>100만 원</span>
          </div>
        </div>
      </div>
    `,
    overview: {
      concept: '정확한 수치를 타이핑하기보다는 대략적인 비율이나 범위를 직관적으로 스캔하며 조절하고 싶을 때 최고의 UX를 제공합니다.',
      doAndDont: [
        '✅ Do: 최소값과 최대값, 그리고 현재 선택된 값을 레이블로 명확히 표시합니다.',
        '✅ Do: 양 끝점을 모두 조절해야 할 때는 Dual-thumb Range Slider(이중 슬라이더)를 사용합니다.'
      ],
      comparison: 'Slider vs Number Input: 정밀한 계좌 송금액 입력은 Number Input이 맞고, 볼륨이나 사진 필터 강도 조절은 Slider가 적합합니다.'
    },
    keyboard: [
      { key: '← / ↓', desc: '값을 1단계 감소시킵니다.' },
      { key: '→ / ↑', desc: '값을 1단계 증가시킵니다.' },
      { key: 'PageUp / PageDown', desc: '값을 10% 단위로 크게 건너뜁니다.' },
      { key: 'Home / End', desc: '최소값 또는 최대값으로 즉시 이동합니다.' }
    ],
    accessibility: [
      { prop: 'role="slider"', desc: '슬라이더 역할.' },
      { prop: 'aria-valuemin / aria-valuemax', desc: '허용되는 최소/최대값.' },
      { prop: 'aria-valuenow', desc: '현재 수치값 동기화.' },
      { prop: 'aria-valuetext', desc: '숫자 대신 "50만 원" 같은 사람이 읽기 편한 텍스트 전달.' }
    ],
    architectureTips: '터치 디바이스 지원을 위해 터치 이벤트(touchstart, touchmove) 및 Pointer Events API를 사용하여 마우스와 모바일 터치를 통일된 코드로 제어해야 합니다.'
  },

  // =========================================================================
  // 4. STATE & PERFORMANCE
  // =========================================================================
  {
    id: 'skeleton-optimistic',
    name: 'Skeleton & Optimistic UI / 체감 성능 패턴',
    category: 'State & Performance',
    level: '심화 (상급)',
    summary: '체감 대기 시간을 극적으로 줄여주는 스켈레톤 로딩과, 서버 응답 전 UI를 먼저 성공 처리하는 낙관적 업데이트 패턴입니다.',
    demoHTML: `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 20px;">
        <!-- Skeleton Area -->
        <div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
          <div style="display: flex; gap: 8px;">
            <button id="toggle-skeleton-btn" class="btn-secondary" style="font-size: 13px;">
              로딩 상태 토글 (스켈레톤 ↔ 실제 데이터)
            </button>
          </div>
          
          <div class="skeleton-card" id="card-skeleton">
            <div style="display: flex; gap: 12px; align-items: center;">
              <div class="skeleton-box" style="width: 42px; height: 42px; border-radius: 50%;"></div>
              <div style="flex: 1; display: flex; flex-direction: column; gap: 6px;">
                <div class="skeleton-box" style="width: 60%; height: 14px;"></div>
                <div class="skeleton-box" style="width: 40%; height: 11px;"></div>
              </div>
            </div>
            <div class="skeleton-box" style="width: 100%; height: 60px;"></div>
          </div>

          <div class="skeleton-card" id="card-loaded" style="display: none;">
            <div style="display: flex; gap: 12px; align-items: center;">
              <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80" style="width: 42px; height: 42px; border-radius: 50%; object-fit: cover;">
              <div>
                <div style="font-weight: 700; font-size: 14px;">김프론트</div>
                <div style="font-size: 12px; color: var(--text-muted);">방금 전 게시됨</div>
              </div>
            </div>
            <div style="font-size: 13.5px; line-height: 1.5; color: var(--text-primary);">
              오늘 Radix UI 기반 컴포넌트 랩을 구축했습니다! 체감 성능이 정말 환상적이네요. 🚀
            </div>
          </div>
        </div>

        <!-- Optimistic UI Area -->
        <div style="background: var(--bg-subtle); padding: 16px 20px; border-radius: var(--radius-md); border: 1px solid var(--border-default); width: 340px; text-align: center;">
          <div style="font-size: 13px; font-weight: 700; color: var(--accent-text); margin-bottom: 6px;">
            낙관적 UI (Optimistic UI) 시뮬레이터
          </div>
          <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 12px;">
            서버 응답을 기다리지 않고 즉시 숫자가 증가합니다.
          </p>
          <div style="display: flex; justify-content: center; gap: 10px;">
            <button id="optimistic-like-btn" class="optimistic-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              <span>좋아요</span>
              <strong id="optimistic-like-count">128</strong>
            </button>
          </div>
          <div id="optimistic-status" style="font-size: 11.5px; color: var(--text-muted); margin-top: 8px;">
            상태: 대기 중
          </div>
        </div>
      </div>
    `,
    overview: {
      concept: '현대 프론트엔드의 성능은 단순 로딩 속도뿐만 아니라 "사용자가 느끼는 인지된 성능(Perceived Performance)"이 결정합니다. 스켈레톤은 레이아웃 이동(CLS)을 막고, 낙관적 업데이트는 네트워크 지연 시간을 0으로 만듭니다.',
      doAndDont: [
        '✅ Do: 스켈레톤의 형태는 실제 들어올 데이터의 레이아웃 비율과 정확히 일치시켜야 렌더링 시 덜컹거림이 없습니다.',
        '✅ Do: 낙관적 업데이트 실패 시(네트워크 끊김 등) 원래 값으로 조용히 롤백하고 토스트로 에러를 알립니다.',
        '❌ Don\'t: 결제 승인이나 금전 거래처럼 절대 실패하면 안 되는 작업에는 낙관적 UI를 적용하면 안 됩니다.'
      ],
      comparison: 'Spinner vs Skeleton: 회전하는 원형 스피너는 사용자의 주의를 "기다리는 시간"에 집중시키지만, 스켈레톤은 "곧 나타날 콘텐츠의 구조"를 미리 상상하게 만들어 대기 시간을 훨씬 짧게 느끼게 합니다.'
    },
    keyboard: [
      { key: 'Tab', desc: '인터랙티브 요소로 포커스 이동.' }
    ],
    accessibility: [
      { prop: 'aria-busy="true"', desc: '데이터를 로딩 중인 컨테이너에 지정하여 보조공학기기가 준비될 때까지 기다리게 함.' },
      { prop: 'aria-live="polite"', desc: '로딩이 완료되었을 때 알림.' }
    ],
    architectureTips: 'React Query(TanStack Query)의 onMutate와 onError 롤백 핸들러, SWR의 mutate(data, false) 옵션이 바로 낙관적 UI를 구현하는 실무 표준 기법입니다.'
  }
];
