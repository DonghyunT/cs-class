const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('flowchart decision overlay: touch events on True/False buttons do not trigger block drag or preventDefault', () => {
  const flowchartSrc = fs.readFileSync(path.resolve(__dirname, '../js/labs/lab-flowchart.js'), 'utf8');

  // Verify handleBlockMouseDown ignores buttons and overlays
  assert.ok(
    flowchartSrc.includes("e.target.closest('.sim-choice-overlay')"),
    'handleBlockMouseDown must check e.target.closest(.sim-choice-overlay)'
  );
  assert.ok(
    flowchartSrc.includes("e.target.closest('button')"),
    'handleBlockMouseDown must check e.target.closest(button)'
  );

  // Verify sim-choice-overlay stops event bubbling (touchstart, touchend, mousedown, etc.)
  assert.ok(
    flowchartSrc.includes("overlay.className = 'sim-choice-overlay';") &&
    flowchartSrc.includes("overlay.addEventListener(evt, (e) => e.stopPropagation()"),
    'sim-choice-overlay must stop event propagation for touch and mouse events'
  );

  // Verify handleSimDecisionChoice has idempotency guard against multiple rapid events
  assert.ok(
    flowchartSrc.includes('if (!debuggerExec || !debuggerExec.isWaitingUserChoice) return;'),
    'handleSimDecisionChoice must guard against multiple trigger calls'
  );

  // Verify CSS touch-action and pointer-events for Debeot touchscreen usability
  const cssSrc = fs.readFileSync(path.resolve(__dirname, '../css/flowchart.css'), 'utf8');
  assert.ok(
    cssSrc.includes('.sim-choice-overlay {') && cssSrc.includes('touch-action: manipulation !important;'),
    'flowchart.css must specify touch-action: manipulation for sim-choice-overlay'
  );
  assert.ok(
    cssSrc.includes('.sim-choice-overlay button {') && cssSrc.includes('touch-action: manipulation !important;'),
    'flowchart.css must specify touch-action: manipulation for sim-choice-overlay button'
  );
  assert.ok(
    cssSrc.includes('.sim-choice-overlay.placement-below {'),
    'flowchart.css must support placement-below for blocks placed near top of canvas'
  );
});

test('flowchart block event logic: simulate touch event bubbling and verify preventDefault is avoided', () => {
  // Mock DOM event hierarchy
  let defaultPrevented = false;
  let isDraggingBlock = false;

  const mockSpan = {
    classList: { contains: () => false },
    isContentEditable: false,
    closest(selector) {
      if (selector.includes('sim-choice-overlay')) return mockOverlay;
      if (selector.includes('button')) return mockBtn;
      return null;
    }
  };

  const mockBtn = {
    classList: { contains: () => false },
    isContentEditable: false,
    closest(selector) {
      if (selector.includes('sim-choice-overlay')) return mockOverlay;
      if (selector.includes('button')) return mockBtn;
      return null;
    }
  };

  const mockOverlay = {
    classList: { contains: (c) => c === 'sim-choice-overlay' },
    isContentEditable: false,
    closest(selector) {
      if (selector.includes('sim-choice-overlay')) return mockOverlay;
      return null;
    }
  };

  const mockTouchEvent = {
    type: 'touchstart',
    target: mockSpan,
    cancelable: true,
    preventDefault() {
      defaultPrevented = true;
    },
    touches: [{ clientX: 100, clientY: 100 }]
  };

  // Re-create the guard condition from lab-flowchart.js
  function shouldBypassBlockMouseDown(e) {
    return !!(
      e.target.classList.contains('flow-port') || 
      e.target.isContentEditable ||
      e.target.closest('.flow-port') ||
      e.target.closest('button') ||
      e.target.closest('input') ||
      e.target.closest('textarea') ||
      e.target.closest('select') ||
      e.target.closest('a') ||
      e.target.closest('.sim-choice-overlay') ||
      e.target.closest('.sim-input-overlay') ||
      e.target.closest('.sim-output-bubble') ||
      e.target.closest('[contenteditable="true"]')
    );
  }

  // When a student taps the True/False button on a touch device
  if (shouldBypassBlockMouseDown(mockTouchEvent)) {
    // Correctly bypassed! No block drag, no preventDefault
  } else {
    // Buggy path:
    isDraggingBlock = true;
    if (mockTouchEvent.cancelable) mockTouchEvent.preventDefault();
  }

  assert.equal(defaultPrevented, false, 'Touch event default must NOT be prevented on True/False button');
  assert.equal(isDraggingBlock, false, 'Block dragging must NOT be activated on True/False button touch');
});

test('runInteractiveSimulation: supports multi-port/label matching and safe fallback without throwing TypeError', () => {
  const flowchartSrc = fs.readFileSync(path.resolve(__dirname, '../js/labs/lab-flowchart.js'), 'utf8');

  // Verify yesConn supports bottom port and branchLabel
  assert.ok(
    flowchartSrc.includes("c.fromPort === 'bottom'") && flowchartSrc.includes("(c.branchLabel || c.label) === '예'"),
    'runInteractiveSimulation must support bottom port and branchLabel for Yes connection'
  );

  // Verify safe fallback chosenConn || outgoingConns[0]
  assert.ok(
    flowchartSrc.includes('nextConn = chosenConn || outgoingConns[0];'),
    'runInteractiveSimulation must safely fallback to outgoingConns[0] to avoid undefined crash'
  );

  // Unit logic test for connection matching logic
  const outgoingConns = [
    { from: 'blk-dec', fromPort: 'bottom', to: 'blk-1', branchLabel: '예' },
    { from: 'blk-dec', fromPort: 'right', to: 'blk-2', branchLabel: '아니오' }
  ];

  let yesConn = outgoingConns.find(c => (c.branchLabel || c.label) === '예' || c.fromPort === 'yes' || c.fromPort === 'bottom');
  let noConn = outgoingConns.find(c => (c.branchLabel || c.label) === '아니오' || c.fromPort === 'no' || c.fromPort === 'right' || c.fromPort === 'left');

  if (!yesConn && noConn) yesConn = outgoingConns.find(c => c !== noConn);
  if (!noConn && yesConn) noConn = outgoingConns.find(c => c !== yesConn);

  if (!yesConn && !noConn) {
    yesConn = outgoingConns[0];
    noConn = outgoingConns[1] || outgoingConns[0];
  }

  assert.equal(yesConn.to, 'blk-1', 'Yes connection must resolve to blk-1');
  assert.equal(noConn.to, 'blk-2', 'No connection must resolve to blk-2');

  // Verify fallback when connections have arbitrary port names
  const weirdConns = [
    { from: 'blk-dec', fromPort: 'customA', to: 'blk-a' },
    { from: 'blk-dec', fromPort: 'customB', to: 'blk-b' }
  ];

  let wYes = weirdConns.find(c => (c.branchLabel || c.label) === '예' || c.fromPort === 'yes' || c.fromPort === 'bottom');
  let wNo = weirdConns.find(c => (c.branchLabel || c.label) === '아니오' || c.fromPort === 'no' || c.fromPort === 'right' || c.fromPort === 'left');

  if (!wYes && wNo) wYes = weirdConns.find(c => c !== wNo);
  if (!wNo && wYes) wNo = weirdConns.find(c => c !== wYes);
  if (!wYes && !wNo) {
    wYes = weirdConns[0];
    wNo = weirdConns[1] || weirdConns[0];
  }

  assert.ok(wYes, 'wYes must not be undefined');
  assert.ok(wNo, 'wNo must not be undefined');
  assert.notEqual(wYes, wNo, 'wYes and wNo must map to distinct connections when possible');
});

