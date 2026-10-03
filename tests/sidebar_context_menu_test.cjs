const { JSDOM } = require('/tmp/node_modules/jsdom');
const fs = require('fs');
const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body>
<div class="chat-history-list" id="chatHistoryList">
  <div class="history-item" data-session-id="s1"><span class="history-item-text">Test Chat</span></div>
</div>
</body></html>`, { url: 'https://jepong-devxyz-ai.vercel.app/', runScripts: 'outside-only' });
const { window } = dom;
global.window = window; global.document = window.document;
global.MutationObserver = window.MutationObserver;

// Mock app globals
window.chatSessions = { s1: { id: 's1', title: 'Test Chat', pinned: false } };
let renamedId = null, pinnedId = null, deletedId = null;
window.renameChatSession = function (id) { renamedId = id; };
window.togglePinSession = function (id) { pinnedId = id; };
window.deleteChatSession = function (id) { deletedId = id; };
window.saveSessions = function () {};
window.showModernToast = function () {};

let pass = 0, fail = 0;
function assert(c, n) { if (c) { pass++; console.log('  ok:', n); } else { fail++; console.log('  FAIL:', n); } }

dom.window.eval(fs.readFileSync('/tmp/jai-react2/sidebar-context-menu.js', 'utf8'));

setTimeout(() => {
  // Trigger via the exposed API
  window.__jdSideMenu.show(100, 100, 's1');
  setTimeout(() => {
    const menu = document.querySelector('.jd-side-menu');
    assert(!!menu, 'menu appears');
    assert(menu.textContent.includes('Rename'), 'has Rename');
    assert(menu.textContent.includes('Pin'), 'has Pin');
    assert(menu.textContent.includes('Archive'), 'has Archive');
    assert(menu.textContent.includes('Delete'), 'has Delete');
    assert(menu.querySelector('.jd-side-menu__time'), 'has timestamp header');
    assert(menu.querySelector('.danger'), 'Delete is marked danger (red)');

    // Test actions
    menu.querySelector('[data-act="rename"]').click();
    assert(renamedId === 's1', 'Rename calls renameChatSession');
    assert(!document.querySelector('.jd-side-menu'), 'menu closes after action');

    window.__jdSideMenu.show(100, 100, 's1');
    setTimeout(() => {
      document.querySelector('[data-act="pin"]').click();
      assert(pinnedId === 's1', 'Pin calls togglePinSession');

      window.__jdSideMenu.show(100, 100, 's1');
      setTimeout(() => {
        document.querySelector('[data-act="delete"]').click();
        assert(deletedId === 's1', 'Delete calls deleteChatSession');

        // Archive
        window.__jdSideMenu.show(100, 100, 's1');
        setTimeout(() => {
          document.querySelector('[data-act="archive"]').click();
          assert(window.chatSessions.s1.archived === true, 'Archive sets flag');
          const itemGone = !document.querySelector('[data-session-id="s1"]');
          assert(itemGone, 'Archived item removed from list');
          console.log(`\n${pass} passed, ${fail} failed`);
          process.exit(fail ? 1 : 0);
        }, 200);
      }, 200);
    }, 200);
  }, 200);
}, 500);
