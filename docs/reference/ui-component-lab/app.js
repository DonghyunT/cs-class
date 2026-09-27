// UI Component Lab - Main Application Logic

let currentComponentId = 'button';
let accordionMode = 'single'; // 'single' | 'multiple'

// Tech stack list for Combobox demo
const TECH_STACKS = [
  'React', 'Next.js', 'Vue.js', 'Nuxt.js', 'Svelte',
  'SvelteKit', 'TypeScript', 'Tailwind CSS', 'GraphQL',
  'Astro', 'SolidJS', 'Remix', 'Radix UI', 'shadcn/ui'
];

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initSidebar();
  initSearch();
  initRouting();
});

// =========================================================================
// 1. Sidebar & Navigation
// =========================================================================
function initSidebar() {
  const sidebarNav = document.getElementById('sidebar-nav');
  if (!sidebarNav) return;

  // Group by category
  const categories = {};
  COMPONENTS_DATA.forEach(comp => {
    if (!categories[comp.category]) {
      categories[comp.category] = [];
    }
    categories[comp.category].push(comp);
  });

  let html = '';
  for (const [catName, comps] of Object.entries(categories)) {
    html += `
      <div class="sidebar-category">
        <div class="category-title">${catName}</div>
        <ul class="sidebar-nav-list">
          ${comps.map(comp => `
            <li>
              <button class="nav-item-btn ${comp.id === currentComponentId ? 'active' : ''}" data-id="${comp.id}">
                <span>${comp.name.split('/')[0].trim()}</span>
                <span class="nav-tag">${comp.level.split(' ')[0]}</span>
              </button>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }
  sidebarNav.innerHTML = html;

  sidebarNav.addEventListener('click', (e) => {
    const btn = e.target.closest('.nav-item-btn');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    navigateTo(id);
  });
}

function updateSidebarActive() {
  document.querySelectorAll('.nav-item-btn').forEach(btn => {
    if (btn.getAttribute('data-id') === currentComponentId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

// =========================================================================
// 2. Routing (Hash-based)
// =========================================================================
function initRouting() {
  const hash = window.location.hash.replace('#', '');
  if (hash && COMPONENTS_DATA.some(c => c.id === hash)) {
    currentComponentId = hash;
  }
  renderComponent(currentComponentId);

  window.addEventListener('hashchange', () => {
    const newHash = window.location.hash.replace('#', '');
    if (newHash && newHash !== currentComponentId && COMPONENTS_DATA.some(c => c.id === newHash)) {
      currentComponentId = newHash;
      renderComponent(currentComponentId);
    }
  });
}

function navigateTo(id) {
  if (currentComponentId === id) return;
  currentComponentId = id;
  window.location.hash = id;
  renderComponent(id);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// =========================================================================
// 3. Component Rendering
// =========================================================================
function renderComponent(id) {
  const comp = COMPONENTS_DATA.find(c => c.id === id);
  if (!comp) return;

  updateSidebarActive();
  const container = document.getElementById('content-container');
  if (!container) return;

  const levelClass = comp.level.includes('상급') ? 'advanced' : (comp.level.includes('중급') ? 'intermediate' : '');

  container.innerHTML = `
    <!-- Header -->
    <div class="comp-header">
      <div class="comp-meta-tags">
        <span class="badge badge-category">${comp.category}</span>
        <span class="badge badge-level ${levelClass}">${comp.level}</span>
      </div>
      <h2 class="comp-title">${comp.name}</h2>
      <p class="comp-summary">${comp.summary}</p>
    </div>

    <!-- Playground Canvas -->
    <div class="playground-card">
      <div class="playground-toolbar">
        <span class="playground-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
          Interactive Preview
        </span>
        <span class="playground-status">Live Interactive</span>
      </div>
      <div class="canvas-area">
        ${comp.demoHTML}
      </div>
    </div>

    <!-- Info Tabs Section -->
    <div class="info-section">
      <div class="tab-nav" role="tablist">
        <button class="tab-btn active" data-target="panel-overview">📖 실무 개념 & 용어</button>
        <button class="tab-btn" data-target="panel-keyboard">⌨️ 키보드 조작 (W3C APG)</button>
        <button class="tab-btn" data-target="panel-a11y">♿ 웹 접근성 & ARIA</button>
        <button class="tab-btn" data-target="panel-architecture">💡 시니어 아키텍처 팁</button>
      </div>

      <!-- Tab 1: Overview -->
      <div id="panel-overview" class="tab-panel active">
        <div class="card-grid">
          <div class="info-card">
            <div class="info-card-header">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              핵심 개념 및 용도
            </div>
            <div class="info-card-body">
              <p>${comp.overview.concept}</p>
              ${comp.overview.comparison ? `<div class="callout" style="margin-top: 12px;">${comp.overview.comparison}</div>` : ''}
            </div>
          </div>

          <div class="info-card">
            <div class="info-card-header">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
              Do & Don't 가이드라인
            </div>
            <div class="info-card-body">
              <ul>
                ${comp.overview.doAndDont.map(item => `<li>${item}</li>`).join('')}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 2: Keyboard -->
      <div id="panel-keyboard" class="tab-panel">
        <table class="keyboard-table">
          <thead>
            <tr>
              <th style="width: 180px;">단축키 (Key)</th>
              <th>설명 및 동작</th>
            </tr>
          </thead>
          <tbody>
            ${comp.keyboard.map(kb => `
              <tr>
                <td><kbd class="kbd">${kb.key}</kbd></td>
                <td>${kb.desc}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- Tab 3: A11y -->
      <div id="panel-a11y" class="tab-panel">
        <table class="keyboard-table">
          <thead>
            <tr>
              <th style="width: 240px;">ARIA 속성 및 Role</th>
              <th>역할 및 스크린 리더 고려사항</th>
            </tr>
          </thead>
          <tbody>
            ${comp.accessibility.map(acc => `
              <tr>
                <td><code class="code-inline">${acc.prop}</code></td>
                <td>${acc.desc}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- Tab 4: Architecture -->
      <div id="panel-architecture" class="tab-panel">
        <div class="info-card">
          <div class="info-card-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
            시니어 엔지니어링 관점의 설계 포인트
          </div>
          <div class="info-card-body">
            <p style="font-size: 14px; line-height: 1.7;">${comp.architectureTips}</p>
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach tab switching logic
  attachInfoTabs();

  // Attach component-specific interactive handlers
  bindComponentInteractions(id);
}

function attachInfoTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');

      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) targetPanel.classList.add('active');
    });
  });
}

// =========================================================================
// 4. Interactive Component Logic Handlers
// =========================================================================
function bindComponentInteractions(id) {
  const portalRoot = document.getElementById('portal-root');

  // 0-1. Button
  if (id === 'button') {
    const btnPrimary = document.getElementById('demo-btn-primary');
    const btnSecondary = document.getElementById('demo-btn-secondary');
    const btnGhost = document.getElementById('demo-btn-ghost');
    const btnDanger = document.getElementById('demo-btn-danger');
    const toggleLoading = document.getElementById('demo-btn-loading-toggle');
    const targetLoading = document.getElementById('demo-target-loading-btn');

    if (btnPrimary) btnPrimary.addEventListener('click', () => showToast('Primary 버튼이 클릭되었습니다.', 'info'));
    if (btnSecondary) btnSecondary.addEventListener('click', () => showToast('Secondary 버튼이 클릭되었습니다.', 'info'));
    if (btnGhost) btnGhost.addEventListener('click', () => showToast('Ghost 버튼이 클릭되었습니다.', 'info'));
    if (btnDanger) btnDanger.addEventListener('click', () => showToast('Destructive 버튼이 클릭되었습니다 (주의!).', 'error'));

    if (toggleLoading && targetLoading) {
      let isLoading = false;
      toggleLoading.addEventListener('click', () => {
        isLoading = !isLoading;
        if (isLoading) {
          targetLoading.classList.add('btn-loading');
          targetLoading.setAttribute('aria-busy', 'true');
          targetLoading.innerHTML = `
            <svg class="spinner-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
            <span>저장 중...</span>
          `;
          showToast('버튼이 로딩 상태(비활성화)로 전환되었습니다.', 'info');
        } else {
          targetLoading.classList.remove('btn-loading');
          targetLoading.removeAttribute('aria-busy');
          targetLoading.innerHTML = `<span>저장하기</span>`;
          showToast('버튼이 정상 상태로 복원되었습니다.', 'success');
        }
      });
    }
  }

  // 0-2. Input & Form Field
  if (id === 'input-field') {
    const input = document.getElementById('demo-input-email');
    const count = document.getElementById('demo-char-count');
    const helper = document.getElementById('demo-input-helper');
    const error = document.getElementById('demo-input-error');

    if (input && count && helper && error) {
      input.addEventListener('input', (e) => {
        const val = e.target.value;
        count.innerText = `${val.length}/30`;

        if (val.length === 0) {
          input.classList.remove('has-error');
          input.removeAttribute('aria-invalid');
          error.style.display = 'none';
          helper.style.display = 'block';
        } else if (!val.includes('@') || !val.includes('.')) {
          input.classList.add('has-error');
          input.setAttribute('aria-invalid', 'true');
          error.style.display = 'flex';
          helper.style.display = 'none';
        } else {
          input.classList.remove('has-error');
          input.removeAttribute('aria-invalid');
          error.style.display = 'none';
          helper.style.display = 'block';
        }
      });
    }
  }

  // 0-3. Badge & Chip
  if (id === 'badge-chip') {
    const chipContainer = document.getElementById('demo-chip-container');
    const resetBtn = document.getElementById('demo-reset-chips');

    if (chipContainer) {
      chipContainer.addEventListener('click', (e) => {
        const delBtn = e.target.closest('.chip-delete-btn');
        if (!delBtn) return;
        const chip = delBtn.closest('.chip-item');
        if (chip) {
          const tagName = chip.getAttribute('data-tag');
          chip.style.transform = 'scale(0.8)';
          chip.style.opacity = '0';
          setTimeout(() => chip.remove(), 150);
          showToast(`'${tagName}' 필터 칩이 삭제되었습니다.`, 'info');
        }
      });
    }

    if (resetBtn && chipContainer) {
      resetBtn.addEventListener('click', () => {
        chipContainer.innerHTML = `
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
        `;
        showToast('필터 칩이 모두 복원되었습니다.', 'success');
      });
    }
  }

  // 0-4. Radio Group
  if (id === 'radio-group') {
    const group = document.getElementById('demo-radio-group');
    const result = document.getElementById('demo-radio-result');

    if (group && result) {
      const items = Array.from(group.querySelectorAll('.radio-item'));

      const selectRadio = (targetItem) => {
        items.forEach(item => {
          item.classList.remove('checked');
          item.setAttribute('aria-checked', 'false');
          item.setAttribute('tabindex', '-1');
        });
        targetItem.classList.add('checked');
        targetItem.setAttribute('aria-checked', 'true');
        targetItem.setAttribute('tabindex', '0');
        targetItem.focus();

        const labelText = targetItem.querySelector('.radio-label').innerText;
        result.innerHTML = `현재 선택된 플랜: <strong style="color: var(--accent-text);">${labelText}</strong>`;
        showToast(`'${labelText}' 선택됨`, 'info');
      };

      items.forEach((item, idx) => {
        item.addEventListener('click', () => selectRadio(item));

        // W3C APG Keyboard Interaction (ArrowUp, ArrowDown, ArrowLeft, ArrowRight)
        item.addEventListener('keydown', (e) => {
          let nextIdx = idx;
          if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
            nextIdx = (idx + 1) % items.length;
            e.preventDefault();
            selectRadio(items[nextIdx]);
          } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
            nextIdx = (idx - 1 + items.length) % items.length;
            e.preventDefault();
            selectRadio(items[nextIdx]);
          } else if (e.key === ' ') {
            e.preventDefault();
            selectRadio(item);
          }
        });
      });
    }
  }

  // 1. Dialog (Modal)
  if (id === 'dialog') {
    const openBtn = document.getElementById('demo-open-dialog');
    if (openBtn) {
      openBtn.addEventListener('click', () => {
        openDialogModal(openBtn);
      });
    }
  }

  // 2. Drawer (Sheet)
  if (id === 'drawer') {
    const openDrawerBtn = document.getElementById('demo-open-drawer');
    if (openDrawerBtn) {
      openDrawerBtn.addEventListener('click', () => {
        openDrawerSheet(openDrawerBtn);
      });
    }
  }

  // 3. Popover
  if (id === 'popover') {
    const trigger = document.getElementById('demo-popover-trigger');
    const box = document.getElementById('demo-popover-box');
    if (trigger && box) {
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = box.style.display !== 'none';
        box.style.display = isOpen ? 'none' : 'block';
        trigger.setAttribute('aria-expanded', !isOpen);
      });

      document.addEventListener('click', (e) => {
        if (!box.contains(e.target) && e.target !== trigger) {
          box.style.display = 'none';
          trigger.setAttribute('aria-expanded', 'false');
        }
      });
    }
  }

  // 6. Toast
  if (id === 'toast') {
    const successBtn = document.getElementById('demo-toast-success');
    const errorBtn = document.getElementById('demo-toast-error');

    if (successBtn) {
      successBtn.addEventListener('click', () => {
        showToast('변경 사항이 성공적으로 저장되었습니다!', 'success');
      });
    }
    if (errorBtn) {
      errorBtn.addEventListener('click', () => {
        showToast('네트워크 요청에 실패했습니다. 다시 시도해 주세요.', 'error');
      });
    }
  }

  // 7. Accordion
  if (id === 'accordion') {
    const accWrapper = document.getElementById('demo-accordion');
    const modeBtn = document.getElementById('accordion-mode-toggle');
    const modeText = document.getElementById('accordion-mode-text');

    if (modeBtn && modeText) {
      modeBtn.addEventListener('click', () => {
        accordionMode = accordionMode === 'single' ? 'multiple' : 'single';
        modeText.innerText = accordionMode === 'single' ? 'Single (단일 확장)' : 'Multiple (다중 확장)';
        showToast(`아코디언 모드가 [${accordionMode.toUpperCase()}]로 변경되었습니다.`, 'info');
      });
    }

    if (accWrapper) {
      accWrapper.addEventListener('click', (e) => {
        const trigger = e.target.closest('.accordion-trigger');
        if (!trigger) return;
        const item = trigger.closest('.accordion-item');
        const isExpanded = item.classList.contains('expanded');

        if (accordionMode === 'single') {
          accWrapper.querySelectorAll('.accordion-item').forEach(el => {
            el.classList.remove('expanded');
            el.querySelector('.accordion-trigger').setAttribute('aria-expanded', 'false');
          });
          if (!isExpanded) {
            item.classList.add('expanded');
            trigger.setAttribute('aria-expanded', 'true');
          }
        } else {
          item.classList.toggle('expanded');
          trigger.setAttribute('aria-expanded', !isExpanded);
        }
      });
    }
  }

  // 8. Collapsible
  if (id === 'collapsible') {
    const btn = document.getElementById('demo-collapsible-btn');
    const content = document.getElementById('demo-collapsible-content');
    if (btn && content) {
      btn.addEventListener('click', () => {
        const isHidden = content.style.display === 'none';
        content.style.display = isHidden ? 'block' : 'none';
        btn.innerText = isHidden ? '접기' : '상세 보기';
      });
    }
  }

  // 9. Tabs
  if (id === 'tabs') {
    const tabTriggers = document.querySelectorAll('.tab-trigger-styled');
    tabTriggers.forEach((trigger, index) => {
      trigger.addEventListener('click', () => {
        activateDemoTab(trigger);
      });

      // Keyboard arrow keys navigation (W3C APG Roving tabindex)
      trigger.addEventListener('keydown', (e) => {
        let nextIndex = index;
        if (e.key === 'ArrowRight') {
          nextIndex = (index + 1) % tabTriggers.length;
        } else if (e.key === 'ArrowLeft') {
          nextIndex = (index - 1 + tabTriggers.length) % tabTriggers.length;
        } else {
          return;
        }
        e.preventDefault();
        tabTriggers[nextIndex].focus();
        activateDemoTab(tabTriggers[nextIndex]);
      });
    });
  }

  // 10. Segmented Control
  if (id === 'segmented-control') {
    const segBtns = document.querySelectorAll('.segmented-btn');
    const display = document.getElementById('segmented-display');
    segBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        segBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (display) {
          display.innerHTML = `선택된 주기: <strong style="color: var(--accent-text);">${btn.innerText} (${btn.getAttribute('data-val')})</strong>`;
        }
      });
    });
  }

  // 12. Dropdown Menu
  if (id === 'dropdown-menu') {
    const trigger = document.getElementById('demo-dropdown-trigger');
    const menuBox = document.getElementById('demo-dropdown-box');
    if (trigger && menuBox) {
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = menuBox.style.display !== 'none';
        menuBox.style.display = isOpen ? 'none' : 'block';
        trigger.setAttribute('aria-expanded', !isOpen);
      });

      menuBox.addEventListener('click', (e) => {
        const item = e.target.closest('.menu-item');
        if (item) {
          const actionText = item.querySelector('span').innerText;
          showToast(`'${actionText}' 명령이 실행되었습니다.`, 'info');
          menuBox.style.display = 'none';
          trigger.setAttribute('aria-expanded', 'false');
          trigger.focus();
        }
      });

      document.addEventListener('click', (e) => {
        if (!menuBox.contains(e.target) && e.target !== trigger) {
          menuBox.style.display = 'none';
          trigger.setAttribute('aria-expanded', 'false');
        }
      });
    }
  }

  // 13. Combobox
  if (id === 'combobox') {
    const input = document.getElementById('demo-combobox-input');
    const list = document.getElementById('demo-combobox-list');
    const selectedText = document.getElementById('demo-combobox-selected');

    if (input && list && selectedText) {
      const renderOptions = (filter = '') => {
        const filtered = TECH_STACKS.filter(s => s.toLowerCase().includes(filter.toLowerCase()));
        if (filtered.length === 0) {
          list.innerHTML = `<div style="padding: 8px 12px; font-size: 13px; color: var(--text-muted);">검색 결과가 없습니다.</div>`;
        } else {
          list.innerHTML = filtered.map(tech => `
            <div class="combobox-item" data-val="${tech}">
              <span>${tech}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity: 0.5;"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          `).join('');
        }
        list.style.display = 'block';
      };

      input.addEventListener('focus', () => renderOptions(input.value));
      input.addEventListener('input', (e) => renderOptions(e.target.value));

      list.addEventListener('click', (e) => {
        const item = e.target.closest('.combobox-item');
        if (item && item.hasAttribute('data-val')) {
          const val = item.getAttribute('data-val');
          input.value = val;
          selectedText.innerHTML = `선택된 기술: <strong style="color: var(--accent-text);">${val}</strong>`;
          list.style.display = 'none';
          showToast(`'${val}' 기술이 선택되었습니다.`, 'success');
        }
      });

      document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !list.contains(e.target)) {
          list.style.display = 'none';
        }
      });
    }
  }

  // 14. Switch vs Checkbox
  if (id === 'switch-checkbox') {
    const sw = document.getElementById('demo-switch');
    const swLabel = document.getElementById('demo-switch-label');
    const cb = document.getElementById('demo-checkbox');

    if (sw && swLabel) {
      const toggleSwitch = () => {
        const isChecked = sw.classList.contains('checked');
        sw.classList.toggle('checked');
        sw.setAttribute('aria-checked', !isChecked);
        swLabel.innerText = !isChecked ? '자동 동기화 켜짐' : '자동 동기화 꺼짐';
        showToast(!isChecked ? '동기화가 활성화되었습니다.' : '동기화가 중단되었습니다.', 'info');
      };
      sw.addEventListener('click', toggleSwitch);
      sw.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          toggleSwitch();
        }
      });
    }

    if (cb) {
      const toggleCheckbox = () => {
        const isChecked = cb.classList.contains('checked');
        cb.classList.toggle('checked');
        cb.setAttribute('aria-checked', !isChecked);
        const checkIcon = cb.querySelector('svg');
        if (checkIcon) checkIcon.style.display = !isChecked ? 'block' : 'none';
      };
      cb.addEventListener('click', toggleCheckbox);
      cb.addEventListener('keydown', (e) => {
        if (e.key === ' ') {
          e.preventDefault();
          toggleCheckbox();
        }
      });
    }
  }

  // 15. Slider
  if (id === 'slider') {
    const track = document.getElementById('demo-slider-track');
    const range = document.getElementById('demo-slider-range');
    const thumb = document.getElementById('demo-slider-thumb');
    const valText = document.getElementById('slider-val');

    if (track && range && thumb && valText) {
      let isDragging = false;

      const updateSlider = (percent) => {
        const clamped = Math.max(0, Math.min(100, Math.round(percent)));
        range.style.width = `${clamped}%`;
        thumb.style.left = `${clamped}%`;
        valText.innerText = `${clamped}만 원`;
        track.setAttribute('aria-valuenow', clamped);
        track.setAttribute('aria-valuetext', `${clamped}만 원`);
      };

      const handleMove = (e) => {
        const rect = track.getBoundingClientRect();
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const percent = ((clientX - rect.left) / rect.width) * 100;
        updateSlider(percent);
      };

      track.addEventListener('mousedown', (e) => {
        isDragging = true;
        handleMove(e);
      });

      window.addEventListener('mousemove', (e) => {
        if (isDragging) handleMove(e);
      });

      window.addEventListener('mouseup', () => {
        isDragging = false;
      });

      // Keyboard arrow control
      track.addEventListener('keydown', (e) => {
        let current = parseInt(track.getAttribute('aria-valuenow'), 10) || 50;
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
          updateSlider(current + 2);
          e.preventDefault();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
          updateSlider(current - 2);
          e.preventDefault();
        } else if (e.key === 'Home') {
          updateSlider(0);
          e.preventDefault();
        } else if (e.key === 'End') {
          updateSlider(100);
          e.preventDefault();
        }
      });
    }
  }

  // 16. Skeleton & Optimistic UI
  if (id === 'skeleton-optimistic') {
    const toggleBtn = document.getElementById('toggle-skeleton-btn');
    const skeletonCard = document.getElementById('card-skeleton');
    const loadedCard = document.getElementById('card-loaded');

    if (toggleBtn && skeletonCard && loadedCard) {
      toggleBtn.addEventListener('click', () => {
        const isSkeleton = skeletonCard.style.display !== 'none';
        skeletonCard.style.display = isSkeleton ? 'none' : 'flex';
        loadedCard.style.display = isSkeleton ? 'flex' : 'none';
      });
    }

    const likeBtn = document.getElementById('optimistic-like-btn');
    const likeCount = document.getElementById('optimistic-like-count');
    const optimisticStatus = document.getElementById('optimistic-status');

    if (likeBtn && likeCount && optimisticStatus) {
      let count = 128;
      let isLiked = false;

      likeBtn.addEventListener('click', () => {
        // Optimistic UI Step 1: 즉각적으로 UI 상태 변경
        isLiked = !isLiked;
        count = isLiked ? count + 1 : count - 1;
        likeCount.innerText = count;
        likeBtn.classList.toggle('liked', isLiked);
        optimisticStatus.innerHTML = `<span style="color: var(--accent-text);">⚡ UI 즉시 업데이트 완료 (백그라운드 통신 중...)</span>`;

        // Step 2: 서버 비동기 전송 시뮬레이션 (1.2초 지연)
        setTimeout(() => {
          optimisticStatus.innerHTML = `<span style="color: var(--success);">✓ 서버 동기화 성공 (HTTP 200 OK)</span>`;
        }, 1200);
      });
    }
  }
}

function activateDemoTab(trigger) {
  const targetTabId = trigger.getAttribute('data-tab');
  document.querySelectorAll('.tab-trigger-styled').forEach(t => {
    t.classList.remove('active');
    t.setAttribute('aria-selected', 'false');
  });
  document.querySelectorAll('.tab-content-styled').forEach(c => {
    c.style.display = 'none';
  });

  trigger.classList.add('active');
  trigger.setAttribute('aria-selected', 'true');
  const targetContent = document.getElementById(targetTabId);
  if (targetContent) targetContent.style.display = 'block';
}

// =========================================================================
// 5. Modal / Drawer Global Portal Helpers
// =========================================================================
function openDialogModal(triggerBtn) {
  const portalRoot = document.getElementById('portal-root');
  if (!portalRoot) return;

  // Prevent body scroll
  document.body.style.overflow = 'hidden';

  const modalHtml = `
    <div class="dialog-backdrop" id="dialog-backdrop">
      <div class="dialog-card" role="dialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby="modal-desc" id="dialog-content-box">
        <div class="dialog-header">
          <h3 class="dialog-title" id="modal-title">프로필 정보 수정</h3>
          <button id="modal-close-x" class="btn-icon" aria-label="닫기" style="width: 28px; height: 28px;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <p class="dialog-desc" id="modal-desc">
          이름과 닉네임을 변경합니다. 변경 후 완료 버튼을 눌러주세요.
        </p>
        <div class="dialog-form-row">
          <label for="modal-input-name">사용자 이름</label>
          <input type="text" id="modal-input-name" class="input-text" value="홍길동">
        </div>
        <div class="dialog-form-row">
          <label for="modal-input-email">이메일 계정</label>
          <input type="email" id="modal-input-email" class="input-text" value="user@example.com">
        </div>
        <div class="dialog-footer">
          <button id="modal-cancel-btn" class="btn-secondary">취소</button>
          <button id="modal-save-btn" class="btn-primary">저장 완료</button>
        </div>
      </div>
    </div>
  `;

  portalRoot.innerHTML = modalHtml;

  const backdrop = document.getElementById('dialog-backdrop');
  const card = document.getElementById('dialog-content-box');
  const firstInput = document.getElementById('modal-input-name');
  const cancelBtn = document.getElementById('modal-cancel-btn');
  const saveBtn = document.getElementById('modal-save-btn');
  const closeX = document.getElementById('modal-close-x');

  // Autofocus first input
  setTimeout(() => firstInput && firstInput.focus(), 50);

  const closeModal = () => {
    document.body.style.overflow = '';
    portalRoot.innerHTML = '';
    if (triggerBtn) triggerBtn.focus();
  };

  // Close handlers
  closeX.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  saveBtn.addEventListener('click', () => {
    showToast('프로필 정보가 저장되었습니다.', 'success');
    closeModal();
  });

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });

  // Focus trap & Esc handler
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', handleKeyDown);
      return;
    }

    if (e.key === 'Tab') {
      const focusables = card.querySelectorAll('input, button');
      const firstEl = focusables[0];
      const lastEl = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === firstEl) {
        lastEl.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        firstEl.focus();
        e.preventDefault();
      }
    }
  };

  document.addEventListener('keydown', handleKeyDown);
}

function openDrawerSheet(triggerBtn) {
  const portalRoot = document.getElementById('portal-root');
  if (!portalRoot) return;

  document.body.style.overflow = 'hidden';

  const drawerHtml = `
    <div class="sheet-backdrop" id="sheet-backdrop">
      <div class="sheet-panel" role="dialog" aria-modal="true" aria-label="필터 Drawer" id="sheet-panel-box">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
          <h3 style="font-size: 18px; font-weight: 700;">상세 필터 패널</h3>
          <button id="sheet-close-x" class="btn-icon" aria-label="닫기">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div style="flex: 1; display: flex; flex-direction: column; gap: 18px; font-size: 14px;">
          <div>
            <label style="font-weight: 600; display: block; margin-bottom: 8px;">정렬 기준</label>
            <select class="input-text" style="width: 100%;">
              <option>최신순</option>
              <option>인기순</option>
              <option>조회수 많은 순</option>
            </select>
          </div>
          <div>
            <label style="font-weight: 600; display: block; margin-bottom: 8px;">카테고리</label>
            <div style="display: flex; flex-direction: column; gap: 8px; font-size: 13.5px;">
              <label><input type="checkbox" checked> 디자인 시스템</label>
              <label><input type="checkbox" checked> 웹 접근성 (A11y)</label>
              <label><input type="checkbox"> 성능 최적화</label>
            </div>
          </div>
        </div>
        <div style="display: flex; gap: 10px; margin-top: 20px;">
          <button id="sheet-apply-btn" class="btn-primary" style="flex: 1;">필터 적용</button>
        </div>
      </div>
    </div>
  `;

  portalRoot.innerHTML = drawerHtml;

  const backdrop = document.getElementById('sheet-backdrop');
  const closeX = document.getElementById('sheet-close-x');
  const applyBtn = document.getElementById('sheet-apply-btn');

  const closeDrawer = () => {
    document.body.style.overflow = '';
    portalRoot.innerHTML = '';
    if (triggerBtn) triggerBtn.focus();
  };

  closeX.addEventListener('click', closeDrawer);
  applyBtn.addEventListener('click', () => {
    showToast('선택한 필터가 적용되었습니다.', 'success');
    closeDrawer();
  });
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeDrawer();
  });

  const handleDrawerKey = (e) => {
    if (e.key === 'Escape') {
      closeDrawer();
      document.removeEventListener('keydown', handleDrawerKey);
    }
  };
  document.addEventListener('keydown', handleDrawerKey);
}

// Toast notification helper
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast-item ${type}`;
  toast.setAttribute('role', 'status');

  const iconSvg = type === 'success' 
    ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>'
    : (type === 'error' 
      ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
      : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>');

  toast.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      ${iconSvg}
      <span style="font-weight: 500;">${message}</span>
    </div>
    <button class="btn-ghost" style="padding: 4px; border-radius: 4px; color: var(--text-muted);" aria-label="닫기">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  `;

  toast.querySelector('button').addEventListener('click', () => {
    toast.remove();
  });

  container.appendChild(toast);

  // Auto remove after 4s
  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }
  }, 4000);
}

// =========================================================================
// 6. Search & Theme
// =========================================================================
function initSearch() {
  const searchInput = document.getElementById('component-search');
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    document.querySelectorAll('.sidebar-category').forEach(cat => {
      let hasVisibleChild = false;
      cat.querySelectorAll('.nav-item-btn').forEach(btn => {
        const text = btn.innerText.toLowerCase();
        const id = btn.getAttribute('data-id');
        const comp = COMPONENTS_DATA.find(c => c.id === id);
        const match = text.includes(q) || (comp && comp.summary.toLowerCase().includes(q));

        if (match) {
          btn.parentElement.style.display = 'block';
          hasVisibleChild = true;
        } else {
          btn.parentElement.style.display = 'none';
        }
      });
      cat.style.display = hasVisibleChild ? 'block' : 'none';
    });
  });

  // '/' key shortcut to focus search input
  window.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== searchInput) {
      e.preventDefault();
      searchInput.focus();
    }
  });
}

function initTheme() {
  const toggleBtn = document.getElementById('theme-toggle');
  const savedTheme = localStorage.getItem('ui-lab-theme');

  const applyTheme = (isLight) => {
    document.documentElement.classList.toggle('light-theme', isLight);
    document.documentElement.classList.toggle('dark-theme', !isLight);
    document.body.classList.toggle('light-theme', isLight);
    document.body.classList.toggle('dark-theme', !isLight);
  };

  if (savedTheme === 'light') {
    applyTheme(true);
  } else {
    applyTheme(false);
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const isCurrentlyLight = document.documentElement.classList.contains('light-theme');
      const nextLight = !isCurrentlyLight;
      applyTheme(nextLight);
      localStorage.setItem('ui-lab-theme', nextLight ? 'light' : 'dark');
      showToast(nextLight ? '라이트 테마로 전환되었습니다.' : '다크 테마로 전환되었습니다.', 'info');
    });
  }
}
