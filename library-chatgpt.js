/* JepongDevxyz AI — ChatGPT-style Library (2026-10-01)
   Pixel-perfect replica of ChatGPT's Library UI:
   - Full-screen page (not modal): back arrow, "Library" title, 3-dot menu
   - Tabs: Suggested | Favorites | Folders (pill style)
   - 2-column grid with thumbnails, filenames, type icons
   - Bottom: search bar + plus button
   - 3-dot menu: Select / Grid / List
   - Plus menu: Upload files / New folder
   - Favorites: star items (stored in metadata JSONB)
   - Folders: organize items (account-scoped Supabase folders + metadata)
   Replaces the old #libraryModal. Pure addition. Idempotent. */
(function () {
  'use strict';
  if (window.__jdLibChatGPT) return;
  window.__jdLibChatGPT = true;

  var CSS = [
    /* Full-screen page */
    '#jdChatLibraryPage{position:fixed;inset:0;z-index:25000;background:#000;color:#fff;',
    'display:flex;flex-direction:column;font-family:inherit}',
    '#jdChatLibraryPage[hidden]{display:none!important}',
    /* Header */
    '.jdlib-header{display:flex;align-items:center;justify-content:space-between;',
    'padding:12px 8px;flex:0 0 auto}',
    '.jdlib-hbtn{width:40px;height:40px;border-radius:50%;border:none;background:#282828;color:#fff;',
    'display:flex;align-items:center;justify-content:center;cursor:pointer}',
    '.jdlib-hbtn:active{background:rgba(255,255,255,.1)}',
    '.jdlib-hbtn svg{width:24px;height:24px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}',
    '.jdlib-title{font-size:1.1rem;font-weight:600;letter-spacing:.2px}',
    /* Tabs */
    '.jdlib-tabs{display:flex;gap:8px;padding:4px 16px 12px;flex:0 0 auto}',
    '.jdlib-tab{border:none;background:none;color:#999;font-size:.95rem;font-weight:500;',
    'padding:8px 16px;border-radius:20px;cursor:pointer;transition:all .2s}',
    '.jdlib-tab.active{background:#2f2f2f;color:#fff}',
    '.jdlib-tab:active{transform:scale(.95)}',
    /* Content */
    '.jdlib-content{flex:1;overflow-y:auto;padding:0 16px 100px;-webkit-overflow-scrolling:touch}',
    '.jdlib-content.selecting{padding-top:56px}',
    '.jdlib-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
    '.jdlib-grid.list{grid-template-columns:1fr}',
    /* Cards */
    '.jdlib-card{background:#1e1e1e;border-radius:12px;overflow:hidden;cursor:pointer;',
    'transition:transform .15s}',
    '.jdlib-card:active{transform:scale(.97)}',
    '.jdlib-thumb{width:100%;aspect-ratio:1/.85;background:#2a2a2a;display:flex;',
    'align-items:center;justify-content:center;position:relative;overflow:hidden}',
    '.jdlib-thumb img{width:100%;height:100%;object-fit:cover}',
    '.jdlib-thumb .jdlib-ficon{width:28px;height:28px}',
    '.jdlib-info{padding:10px 12px;display:flex;align-items:center;gap:8px}',
    '.jdlib-name{flex:1;font-size:.88rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.jdlib-ticon{width:20px;height:20px;flex:0 0 auto}',
    /* List mode */
    '.jdlib-grid.list .jdlib-card{display:flex;align-items:center}',
    '.jdlib-grid.list .jdlib-thumb{width:56px;height:56px;aspect-ratio:auto;border-radius:8px;margin:8px;flex:0 0 auto}',
    '.jdlib-grid.list .jdlib-info{flex:1;padding:8px 12px 8px 0}',
    /* Folder cards */
    '.jdlib-folder{min-width:0;text-align:left;cursor:pointer}',
    '.jdlib-folder:active{transform:scale(.97)}',
    '.jdlib-folder-icon{aspect-ratio:1/.95;background:#242424;border:1px solid #333;border-radius:11px;',
    'display:flex;align-items:center;justify-content:center}',
    '.jdlib-folder-icon svg{width:32px;height:32px;stroke:#fff;fill:none;stroke-width:1.7}',
    '.jdlib-folder .jdlib-fname{font-size:.9rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:7px}',
    '.jdlib-folder .jdlib-fcount{font-size:.78rem;color:#999;margin-top:2px}',
    /* Empty state */
    '.jdlib-empty{text-align:center;padding:60px 20px;color:#888;grid-column:1/-1}',
    '.jdlib-empty svg{width:56px;height:56px;stroke:#555;fill:none;stroke-width:1.5;margin-bottom:16px}',
    '.jdlib-empty p{margin:0;font-size:.95rem;line-height:1.5}',
    '.jdlib-empty .jdlib-del{width:64px;height:64px;border-radius:50%;background:#2f2f2f;',
    'display:flex;align-items:center;justify-content:center;margin:24px auto 0;cursor:pointer}',
    '.jdlib-empty .jdlib-del svg{width:28px;height:28px;stroke:#fff;margin:0}',
    /* Bottom bar */
    '.jdlib-bottom{position:absolute;bottom:0;left:0;right:0;display:flex;gap:12px;',
    'padding:12px 16px calc(12px + env(safe-area-inset-bottom));background:linear-gradient(transparent,#000 40%)}',
    '.jdlib-search{flex:1;display:flex;align-items:center;gap:10px;background:#2f2f2f;',
    'border-radius:24px;padding:0 18px;height:48px;cursor:text}',
    '.jdlib-search svg{width:20px;height:20px;stroke:#999;fill:none;stroke-width:2;flex:0 0 auto}',
    '.jdlib-search span{color:#888;font-size:.95rem}',
    '.jdlib-search input{flex:1;background:none;border:none;outline:none;color:#fff;font-size:.95rem;display:none}',
    '.jdlib-search.active input{display:block}',
    '.jdlib-search.active span{display:none}',
    '.jdlib-plus{width:48px;height:48px;border-radius:50%;background:#2f2f2f;border:none;color:#fff;',
    'display:flex;align-items:center;justify-content:center;cursor:pointer;flex:0 0 auto}',
    '.jdlib-plus:active{transform:scale(.9)}',
    '.jdlib-plus svg{width:24px;height:24px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round}',
    /* Dropdown menus */
    '.jdlib-menu{position:absolute;background:#2f2f2f;border-radius:16px;padding:8px;min-width:180px;',
    'box-shadow:0 8px 32px rgba(0,0,0,.5);z-index:26000}',
    '.jdlib-menu[hidden]{display:none}',
    '.jdlib-mi{display:flex;align-items:center;gap:12px;width:100%;border:none;background:none;color:#fff;',
    'font-size:.92rem;padding:12px 14px;border-radius:10px;cursor:pointer;text-align:left}',
    '.jdlib-mi:active{background:rgba(255,255,255,.08)}',
    '.jdlib-mi svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}',
    '.jdlib-mi .jdlib-check{margin-left:auto;color:#fff;font-weight:700}',
    /* Select mode */
    '.jdlib-card.selected{outline:2px solid #6366f1}',
    '.jdlib-selbar{position:absolute;top:105px;left:0;right:0;background:#1e1e1e;padding:12px 16px;',
    'display:flex;align-items:center;justify-content:space-between;z-index:10}',
    '.jdlib-selbar[hidden]{display:none}',
    '.jdlib-selbar button{background:#333;color:#fff;border:0;border-radius:20px;padding:9px 12px}',
    '.jdlib-folder-dialog{position:absolute;inset:0;background:rgba(0,0,0,.65);z-index:27000;display:flex;',
    'align-items:flex-start;justify-content:center;padding: min(30vh,210px) 16px 16px}',
    '.jdlib-folder-dialog[hidden]{display:none}',
    '.jdlib-dialog-panel{width:min(100%,420px);background:#202020;border-radius:20px;padding:18px;color:#fff}',
    '.jdlib-dialog-panel label{display:block;border:1px solid #aaa;border-radius:4px;padding:6px 10px;font-size:12px}',
    '.jdlib-dialog-panel input{display:block;width:100%;box-sizing:border-box;border:0;outline:0;',
    'background:transparent;color:#fff;font:inherit;padding:5px 0}',
    '.jdlib-dialog-actions{display:flex;justify-content:flex-end;gap:14px;margin-top:16px}',
    '.jdlib-dialog-actions button{border:0;background:none;color:#fff;padding:8px;cursor:pointer}',
    '.jdlib-dialog-actions button:disabled{opacity:.4}',
    /* Light mode (follows theme) */
    'body.theme-light #jdChatLibraryPage{background:#fff;color:#111}',
    'body.theme-light .jdlib-hbtn{color:#111}',
    'body.theme-light .jdlib-tab{color:#666}',
    'body.theme-light .jdlib-tab.active{background:#e8e8e8;color:#111}',
    'body.theme-light .jdlib-card{background:#f0f0f2}',
    'body.theme-light .jdlib-thumb{background:#e0e0e2}',
    'body.theme-light .jdlib-folder{background:#f0f0f2}',
    'body.theme-light .jdlib-folder-icon{background:#f0f0f2;border-color:#ddd}',
    'body.theme-light .jdlib-folder-icon svg{stroke:#222}',
    'body.theme-light .jdlib-search{background:#e8e8e8}',
    'body.theme-light .jdlib-search span{color:#888}',
    'body.theme-light .jdlib-search input{color:#111}',
    'body.theme-light .jdlib-plus{background:#e8e8e8;color:#111}',
    'body.theme-light .jdlib-menu{background:#fff;box-shadow:0 8px 32px rgba(0,0,0,.15)}',
    'body.theme-light .jdlib-mi{color:#111}'
    ,'body.theme-light .jdlib-dialog-panel{background:#fff;color:#111}',
    'body.theme-light .jdlib-dialog-panel input{color:#111}'
  ].join('\n');

  var I = {
    back: '<svg viewBox="0 0 24 24"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>',
    dots: '<svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="19" r="1.5" fill="currentColor"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14"/><path d="M5 12h14"/></svg>',
    image: '<svg viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/></svg>',
    doc: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>',
    video: '<svg viewBox="0 0 24 24"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2"/></svg>',
    audio: '<svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
    folder: '<svg viewBox="0 0 24 24"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>',
    bookmark: '<svg viewBox="0 0 24 24"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>',
    grid: '<svg viewBox="0 0 24 24"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>',
    list: '<svg viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
    select: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>',
    upload: '<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/></svg>',
    newfolder: '<svg viewBox="0 0 24 24"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/><path d="M12 10v6"/><path d="M9 13h6"/></svg>',
    star: '<svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>'
  };

  var state = {
    tab: 'suggested', // suggested | favorites | folders
    view: 'grid',     // grid | list
    items: [],
    folders: [],
    currentFolder: null,
    selectMode: false,
    selected: new Set(),
    search: ''
  };

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function typeIcon(mime) {
    mime = (mime || '').toLowerCase();
    if (mime.indexOf('image/') === 0) return { icon: 'image', color: '#f472b6' };
    if (mime.indexOf('video/') === 0) return { icon: 'video', color: '#a78bfa' };
    if (mime.indexOf('audio/') === 0) return { icon: 'audio', color: '#60a5fa' };
    return { icon: 'doc', color: '#a78bfa' };
  }

  function getMeta(item) {
    try { return item.metadata || {}; } catch (e) { return {}; }
  }

  function isFav(item) { return !!getMeta(item).favorite; }
  function itemFolder(item) { return getMeta(item).folder || null; }

  /* ---------- Build the page ---------- */
  function buildPage() {
    if (document.getElementById('jdChatLibraryPage')) return;
    if (!document.getElementById('jdLibChatCss')) {
      var st = document.createElement('style');
      st.id = 'jdLibChatCss';
      st.textContent = CSS;
      document.head.appendChild(st);
    }

    var page = document.createElement('div');
    page.id = 'jdChatLibraryPage';
    page.setAttribute('hidden', '');
    page.innerHTML =
      '<div class="jdlib-header">' +
      '<button class="jdlib-hbtn" id="jdLibBack">' + I.back + '</button>' +
      '<div class="jdlib-title">Library</div>' +
      '<button class="jdlib-hbtn" id="jdLibMenu">' + I.dots + '</button>' +
      '</div>' +
      '<div class="jdlib-tabs">' +
      '<button class="jdlib-tab active" data-tab="suggested">Suggested</button>' +
      '<button class="jdlib-tab" data-tab="favorites">Favorites</button>' +
      '<button class="jdlib-tab" data-tab="folders">Folders</button>' +
      '</div>' +
      '<div class="jdlib-content" id="jdLibContent"><div class="jdlib-grid" id="jdLibGrid"></div></div>' +
      '<div class="jdlib-selbar" id="jdLibSelectedActions" hidden><span id="jdLibSelectedCount">0 selected</span>' +
      '<button type="button" id="jdLibAttachSelected">Add to chat</button>' +
      '<button type="button" id="jdLibDeleteSelected">Delete</button>' +
      '<button type="button" id="jdLibCancelSelected">Cancel</button></div>' +
      '<div class="jdlib-bottom">' +
      '<div class="jdlib-search" id="jdLibSearchBar">' + I.search + '<span>Search</span><input id="jdLibSearchInput" type="text" placeholder="Search">' + '</div>' +
      '<button class="jdlib-plus" id="jdLibPlus">' + I.plus + '</button>' +
      '</div>' +
      '<div class="jdlib-menu" id="jdLibMenuPop" hidden></div>' +
      '<div class="jdlib-menu" id="jdLibPlusPop" hidden></div>' +
      '<div class="jdlib-folder-dialog" id="jdLibFolderDialog" hidden>' +
      '<form class="jdlib-dialog-panel" id="jdLibFolderForm"><label>Name<input id="jdLibFolderName" maxlength="120" autocomplete="off" required></label>' +
      '<div class="jdlib-dialog-actions"><button type="button" id="jdLibFolderCancel">Cancel</button>' +
      '<button type="submit" id="jdLibFolderCreate" disabled>Create</button></div></form></div>';
    document.body.appendChild(page);

    // Events
    document.getElementById('jdLibBack').addEventListener('click', function(){
      if(state.currentFolder){state.currentFolder=null;document.querySelector('.jdlib-title').textContent='Library';render();}
      else closeLibrary();
    });
    document.getElementById('jdLibMenu').addEventListener('click', toggleMenu);
    document.getElementById('jdLibPlus').addEventListener('click', togglePlus);
    document.getElementById('jdLibFolderCancel').addEventListener('click', closeFolderDialog);
    document.getElementById('jdLibFolderName').addEventListener('input', function(e){
      document.getElementById('jdLibFolderCreate').disabled=!e.target.value.trim();
    });
    document.getElementById('jdLibFolderForm').addEventListener('submit', submitFolderDialog);
    document.getElementById('jdLibCancelSelected').addEventListener('click', function(){state.selected.clear();state.selectMode=false;render();});
    document.getElementById('jdLibAttachSelected').addEventListener('click', async function(){
      var items=state.items.filter(function(it){return state.selected.has(it.id);});
      for(var item of items)await attachLibraryItem(item);
    });
    document.getElementById('jdLibDeleteSelected').addEventListener('click', async function(){
      var items=state.items.filter(function(it){return state.selected.has(it.id);});
      if(!items.length)return;
      if(!confirm('Delete '+items.length+' selected file(s)?'))return;
      for(var item of items)await itemAction(item,'del');
      state.selected.clear();state.selectMode=false;render();
    });
    page.querySelectorAll('.jdlib-tab').forEach(function (t) {
      t.addEventListener('click', function () { switchTab(t.dataset.tab); });
    });

    var searchBar = document.getElementById('jdLibSearchBar');
    var searchInput = document.getElementById('jdLibSearchInput');
    searchBar.addEventListener('click', function (e) {
      if (e.target !== searchInput) {
        searchBar.classList.add('active');
        searchInput.focus();
      }
    });
    searchInput.addEventListener('input', function () {
      state.search = searchInput.value;
      render();
    });
    searchInput.addEventListener('blur', function () {
      if (!searchInput.value) searchBar.classList.remove('active');
    });

    // Close menus on outside tap. Include SVG descendants of the plus icon.
    document.addEventListener('click', function (e) {
      var mp = document.getElementById('jdLibMenuPop');
      var pp = document.getElementById('jdLibPlusPop');
      if (mp && !mp.hidden && !mp.contains(e.target) && e.target.id !== 'jdLibMenu') mp.hidden = true;
      if (pp && !pp.hidden && !pp.contains(e.target) && !isLibraryPlusTarget(e.target)) pp.hidden = true;
    });
  }

  function isLibraryPlusTarget(target) {
    return !!(target && typeof target.closest === 'function' && target.closest('#jdLibPlus'));
  }

  /* ---------- Open/Close ---------- */
  function openLibrary() {
    buildPage();
    var page = document.getElementById('jdChatLibraryPage');
    page.removeAttribute('hidden');
    // Hide the old modal if it's open
    var old = document.getElementById('libraryModal');
    if (old) old.classList.remove('open');
    loadItems();
    // Push for back-nav
    if (window.jdBackNav) window.jdBackNav.push(page);
  }

  function closeLibrary() {
    var page = document.getElementById('jdChatLibraryPage');
    if (page) {
      closeFolderDialog();
      page.setAttribute('hidden', '');
      if (window.jdBackNav) window.jdBackNav.pop(page);
    }
  }

  /* ---------- Data ---------- */
  async function loadItems() {
    var grid = document.getElementById('jdLibGrid');
    if (!grid) return;
    var libraryStore = window.JDLibraryStorage;
    if (!libraryStore || !libraryStore.isSignedIn()) {
      state.items=[];state.folders=[];state.selected.clear();
      grid.innerHTML = '<div class="jdlib-empty">' + I.folder + '<p>Sign in to use your Library.</p></div>';
      return;
    }
    grid.innerHTML = '<div class="jdlib-empty"><p>Loading Library…</p></div>';
    try {
      var accountId=libraryStore.accountId();
      var results=await Promise.all([libraryStore.listItems(),libraryStore.listFolders()]);
      if(accountId!==libraryStore.accountId())return loadItems();
      if(results[0].error)throw results[0].error;
      if(results[1].error)throw results[1].error;
      state.items = results[0].data || [];
      state.folders = (results[1].data || []).map(function(f){return {id:f.id,name:f.name,count:0};});
      loadFolders();
      render();
    } catch (e) {
      if(accountId!==libraryStore.accountId())return loadItems();
      grid.innerHTML = '<div class="jdlib-empty"><p>'+esc(e.message||'Failed to load Library.')+'</p></div>';
    }
  }

  function loadFolders() {
    var fromItems = {};
    state.items.forEach(function (it) {
      var f = itemFolder(it);
      if (f) fromItems[f] = (fromItems[f] || 0) + 1;
    });
    state.folders.forEach(function(f){f.count=fromItems[f.name]||0;});
    // Existing item metadata may predate the dedicated folder table.
    Object.keys(fromItems).forEach(function(name){
      if(!state.folders.some(function(f){return f.name===name;}))state.folders.push({name:name,count:fromItems[name],legacy:true});
    });
  }

  /* ---------- Render ---------- */
  function render() {
    var grid = document.getElementById('jdLibGrid');
    if (!grid) return;
    grid.className = 'jdlib-grid' + (state.view === 'list' ? ' list' : '');
    var selectedActions=document.getElementById('jdLibSelectedActions');
    if(selectedActions){
      selectedActions.hidden=!state.selectMode;
      document.getElementById('jdLibSelectedCount').textContent=state.selected.size+' selected';
      document.getElementById('jdLibContent').classList.toggle('selecting',state.selectMode);
    }

    var q = state.search.toLowerCase();
    function matchSearch(it) {
      return !q || (it.file_name || '').toLowerCase().indexOf(q) !== -1;
    }

    if (state.tab === 'folders' && !state.currentFolder) {
      renderFolders(grid);
    } else {
      var items = state.items.filter(matchSearch);
      if (state.tab === 'favorites') items = items.filter(isFav);
      if (state.currentFolder) items = items.filter(function (it) { return itemFolder(it) === state.currentFolder; });
      renderItems(grid, items);
    }
  }

  function renderFolders(grid) {
    var folders=state.folders.filter(function(f){return !state.search||f.name.toLowerCase().includes(state.search.toLowerCase());});
    if (!folders.length) {
      grid.innerHTML = '<div class="jdlib-empty">' + I.folder +
        '<p>'+(state.search?'No matching folders.':'No folders yet.<br>Tap + to create one.')+'</p></div>';
      return;
    }
    grid.innerHTML = folders.map(function (f) {
      return '<div class="jdlib-folder" data-folder="' + esc(f.name) + '">' +
        '<div class="jdlib-folder-icon">'+I.folder+'</div>' +
        '<div class="jdlib-fname">' + esc(f.name) + '</div>' +
        '<div class="jdlib-fcount">' + f.count + ' item' + (f.count === 1 ? '' : 's') + '</div>' +
        '</div>';
    }).join('');
    grid.querySelectorAll('.jdlib-folder').forEach(function (el) {
      el.addEventListener('click', function () {
        state.currentFolder = el.dataset.folder;
        document.querySelector('.jdlib-title').textContent=state.currentFolder;
        render();
      });
      el.addEventListener('contextmenu',function(e){
        e.preventDefault();showFolderMenu(state.folders.find(function(f){return f.name===el.dataset.folder;}),e.clientX,e.clientY);
      });
    });
  }

  function renderItems(grid, items) {
    if (!items.length) {
      var msg = state.tab === 'favorites'
        ? I.bookmark + '<p><b>Save your favorites</b><br>Items you add to Favorites will appear here.</p>'
        : I.folder + '<p>No files yet.</p>';
      grid.innerHTML = '<div class="jdlib-empty">' + msg + '</div>';
      return;
    }
    grid.innerHTML = items.map(function (it) {
      var ti = typeIcon(it.mime_type);
      var isImg = (it.mime_type || '').indexOf('image/') === 0;
      var thumb = isImg
        ? '<div class="jdlib-thumb" data-thumb="' + it.id + '"><div class="jdlib-ficon" style="color:' + ti.color + '">' + I[ti.icon] + '</div></div>'
        : '<div class="jdlib-thumb"><div class="jdlib-ficon" style="color:' + ti.color + '">' + I[ti.icon] + '</div></div>';
      var sel = state.selected.has(it.id) ? ' selected' : '';
      return '<div class="jdlib-card' + sel + '" data-id="' + it.id + '">' +
        thumb +
        '<div class="jdlib-info">' +
        '<div class="jdlib-ticon" style="color:' + ti.color + '">' + I[ti.icon] + '</div>' +
        '<div class="jdlib-name">' + esc(it.file_name) + '</div>' +
        '</div></div>';
    }).join('');

    // Thumbnails
    items.forEach(function (it) {
      if ((it.mime_type || '').indexOf('image/') !== 0) return;
      getThumb(it).then(function (url) {
        if (!url) return;
        var el = grid.querySelector('[data-thumb="' + it.id + '"]');
        if (el) el.innerHTML = '<img src="' + url + '" loading="lazy" alt="">';
      });
    });

    // Click handlers
    grid.querySelectorAll('.jdlib-card').forEach(function (card) {
      card.addEventListener('click', function () {
        var id = card.dataset.id;
        if (state.selectMode) {
          if (state.selected.has(id)) { state.selected.delete(id); card.classList.remove('selected'); }
          else { state.selected.add(id); card.classList.add('selected'); }
          render();
        } else {
          var item = state.items.find(function (x) { return x.id === id; });
          if (item){
            var rect=card.getBoundingClientRect();
            showItemMenu(item.id,rect.left,Math.min(rect.bottom+4,window.innerHeight-290));
          }
        }
      });
      card.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        showItemMenu(card.dataset.id, e.clientX, e.clientY);
      });
    });
  }

  var thumbCache = {};
  async function getThumb(item) {
    if (thumbCache[item.id]) return thumbCache[item.id];
    try {
      var r = await cloudClient.storage.from('user-library').createSignedUrl(item.storage_path, 3600);
      if (r.data && r.data.signedUrl) {
        thumbCache[item.id] = r.data.signedUrl;
        return r.data.signedUrl;
      }
    } catch (e) {}
    return null;
  }

  function openItem(item) {
    // Use existing download function
    if (typeof downloadLibraryItem === 'function') {
      downloadLibraryItem(item.id, encodeURIComponent(item.storage_path));
    }
  }

  /* ---------- Tabs ---------- */
  function switchTab(tab) {
    state.tab = tab;
    state.currentFolder = null;
    state.selectMode = false;
    state.selected.clear();
    document.querySelectorAll('.jdlib-tab').forEach(function (t) {
      t.classList.toggle('active', t.dataset.tab === tab);
    });
    // Update title if in a folder
    document.querySelector('.jdlib-title').textContent = 'Library';
    render();
  }

  /* ---------- Menus ---------- */
  function toggleMenu() {
    var pop = document.getElementById('jdLibMenuPop');
    var btn = document.getElementById('jdLibMenu');
    if (!pop || !btn) return;
    if (!pop.hidden) { pop.hidden = true; return; }
    var r = btn.getBoundingClientRect();
    pop.style.top = (r.bottom + 8) + 'px';
    pop.style.right = '8px';
    pop.innerHTML =
      '<button class="jdlib-mi" data-act="select">' + I.select + 'Select</button>' +
      '<button class="jdlib-mi" data-act="grid">' + I.grid + 'Grid' + (state.view === 'grid' ? '<span class="jdlib-check">✓</span>' : '') + '</button>' +
      '<button class="jdlib-mi" data-act="list">' + I.list + 'List' + (state.view === 'list' ? '<span class="jdlib-check">✓</span>' : '') + '</button>';
    pop.hidden = false;
    pop.querySelectorAll('.jdlib-mi').forEach(function (b) {
      b.addEventListener('click', function () {
        pop.hidden = true;
        menuAction(b.dataset.act);
      });
    });
  }

  function menuAction(act) {
    if (act === 'select') {
      state.selectMode = !state.selectMode;
      if (!state.selectMode) state.selected.clear();
      render();
    } else if (act === 'grid' || act === 'list') {
      state.view = act;
      render();
    }
  }

  function togglePlus() {
    var pop = document.getElementById('jdLibPlusPop');
    var btn = document.getElementById('jdLibPlus');
    if (!pop || !btn) return;
    if (!pop.hidden) { pop.hidden = true; return; }
    var r = btn.getBoundingClientRect();
    pop.style.bottom = (window.innerHeight - r.top + 8) + 'px';
    pop.style.right = '16px';
    pop.innerHTML =
      '<button class="jdlib-mi" data-act="upload">' + I.upload + 'Upload files</button>' +
      '<button class="jdlib-mi" data-act="newfolder">' + I.newfolder + 'New folder</button>';
    pop.hidden = false;
    pop.querySelectorAll('.jdlib-mi').forEach(function (b) {
      b.addEventListener('click', function () {
        pop.hidden = true;
        plusAction(b.dataset.act);
      });
    });
  }

  function plusAction(act) {
    if (act === 'upload') {
      var inp = document.createElement('input');
      inp.type = 'file';
      inp.multiple = true;
      inp.style.position = 'fixed';
      inp.style.left = '-10000px';
      inp.style.top = '0';
      inp.style.width = '1px';
      inp.style.height = '1px';
      inp.style.opacity = '0';
      inp.setAttribute('aria-hidden', 'true');
      var removeUploadInput = function () {
        if (inp.parentNode) inp.parentNode.removeChild(inp);
      };
      inp.onchange = async function () {
        var files = Array.from(inp.files || []);
        removeUploadInput();
        if (!files.length) return;
        var libraryStore = window.JDLibraryStorage;
        if (!libraryStore || typeof libraryStore.saveFile !== 'function') {
          if (typeof showModernAlert === 'function') showModernAlert('Library upload is unavailable. Please reload and try again.', 'Library');
          return;
        }
        var results = await Promise.all(files.map(async function (f) {
          try { return await libraryStore.saveFile(f); }
          catch (error) { return { error: error }; }
        }));
        var failed = results.filter(function (result) { return !result || result.error; });
        await loadItems();
        if (failed.length) {
          var message = String(failed[0].error && failed[0].error.message || 'Upload failed.');
          if (typeof showModernAlert === 'function') showModernAlert(message, 'Library upload');
        } else if (typeof showModernToast === 'function') {
          showModernToast(files.length === 1 ? 'File saved to Library.' : files.length + ' files saved to Library.');
        }
      };
      inp.addEventListener('cancel', removeUploadInput, { once: true });
      document.body.appendChild(inp);
      inp.click();
    } else if (act === 'newfolder') {
      var dialog=document.getElementById('jdLibFolderDialog');
      var input=document.getElementById('jdLibFolderName');
      dialog.hidden=false;input.value='';document.getElementById('jdLibFolderCreate').disabled=true;
      requestAnimationFrame(function(){input.focus();});
    }
  }

  function closeFolderDialog(){
    var dialog=document.getElementById('jdLibFolderDialog');
    if(dialog)dialog.hidden=true;
    document.getElementById('jdLibFolderName')?.blur();
  }

  async function submitFolderDialog(event){
    event.preventDefault();
    var name=document.getElementById('jdLibFolderName').value.trim();
    if(!name)return;
    if(state.folders.some(function(f){return f.name.toLowerCase()===name.toLowerCase();})){
      showLibraryError(new Error('A folder with that name already exists.'));return;
    }
    var button=document.getElementById('jdLibFolderCreate');button.disabled=true;
    var result=await window.JDLibraryStorage.createFolder(name);
    if(result.error){showLibraryError(result.error);button.disabled=false;return;}
    closeFolderDialog();state.tab='folders';state.currentFolder=null;
    document.querySelectorAll('.jdlib-tab').forEach(function(t){t.classList.toggle('active',t.dataset.tab==='folders');});
    await loadItems();
  }

  function showLibraryError(error){
    if(typeof showModernAlert==='function')showModernAlert(String(error?.message||error||'Library action failed.'),'Library');
  }

  function showFolderMenu(folder,x,y){
    if(!folder)return;
    var pop=document.getElementById('jdLibMenuPop');
    pop.style.top=y+'px';pop.style.left=Math.max(8,Math.min(x,window.innerWidth-200))+'px';pop.style.right='auto';
    pop.innerHTML='<button class="jdlib-mi" type="button">'+I.trash+'Delete folder</button>';
    pop.hidden=false;
    pop.querySelector('button').addEventListener('click',async function(){
      pop.hidden=true;
      if(!confirm('Delete folder '+folder.name+'? Its files will remain in Library.'))return;
      var result=await window.JDLibraryStorage.deleteFolder(folder);
      if(result.error){showLibraryError(result.error);return;}
      state.currentFolder=null;await loadItems();
    });
  }

  function showItemMenu(id, x, y) {
    var item = state.items.find(function (z) { return z.id === id; });
    if (!item) return;
    var pop = document.getElementById('jdLibMenuPop');
    pop.style.top = Math.max(8,y) + 'px';
    pop.style.left = Math.max(8,Math.min(x, window.innerWidth - 200)) + 'px';
    pop.style.right = 'auto';
    var fav = isFav(item);
    pop.innerHTML =
      '<button class="jdlib-mi" data-act="attach">' + I.plus + 'Add to chat</button>' +
      '<button class="jdlib-mi" data-act="open">' + I.doc + 'Open</button>' +
      '<button class="jdlib-mi" data-act="fav">' + I.star + (fav ? 'Remove from Favorites' : 'Add to Favorites') + '</button>' +
      '<button class="jdlib-mi" data-act="move">' + I.folder + 'Move to folder</button>' +
      '<button class="jdlib-mi" data-act="del">' + I.trash + 'Delete</button>';
    pop.hidden = false;
    pop.querySelectorAll('.jdlib-mi').forEach(function (b) {
      b.addEventListener('click', function () {
        pop.hidden = true;
        itemAction(item, b.dataset.act);
      });
    });
  }

  async function itemAction(item, act) {
    var store=window.JDLibraryStorage;
    if(act==='attach'){await attachLibraryItem(item);return;}
    if(act==='open'){openItem(item);return;}
    if (act === 'fav') {
      var meta = getMeta(item);
      meta = {...meta,favorite:!meta.favorite};
      try {
        var result=await store.updateItemMetadata(item.id,meta);
        if(result.error)throw result.error;
        item.metadata = meta;
        render();
      } catch (e) {showLibraryError(e);}
    } else if (act === 'move') {
      if (!state.folders.length) {
        if (typeof showModernAlert === 'function') showModernAlert('Create a folder first (tap +).', 'Library');
        return;
      }
      var name = prompt('Move to folder:\n' + state.folders.map(function (f) { return '- ' + f.name; }).join('\n'));
      if (name) {
        name=name.trim();
        if(!state.folders.some(function(f){return f.name===name;})){showLibraryError(new Error('Choose an existing folder.'));return;}
        var meta2 = {...getMeta(item),folder:name};
        try {
          var moved=await store.updateItemMetadata(item.id,meta2);
          if(moved.error)throw moved.error;
          item.metadata = meta2;
          loadFolders(); render();
        } catch (e) {showLibraryError(e);}
      }
    } else if (act === 'del') {
      if(!state.selectMode&&!confirm('Delete '+item.file_name+' from Library?'))return;
      try{
        var deleted=await store.deleteItem(item);
        if(deleted.error)throw deleted.error;
        delete thumbCache[item.id];
        await loadItems();
      }catch(e){showLibraryError(e);}
    }
  }

  async function attachLibraryItem(item){
    try{
      var file=await window.JDLibraryStorage.getFile(item);
      if(file.error)throw file.error;
      if(typeof addSelectedFiles!=='function')throw new Error('Chat attachments are unavailable.');
      await addSelectedFiles([file],{manualLibrary:true});
      closeLibrary();
      if(typeof showModernToast==='function')showModernToast('Added '+item.file_name+' to chat.');
    }catch(e){showLibraryError(e);}
  }

  /* ---------- Init: override openLibrary ---------- */
  function init() {
    buildPage();
    // Override the global openLibrary to use our page
    window.openLibrary = openLibrary;
    window.closeJdLibrary = closeLibrary;
    // Also handle back-nav close event
    document.addEventListener('jd-back-close', function (e) {
      var page = document.getElementById('jdChatLibraryPage');
      if (page && !page.hidden && (e.target === page || page.contains(e.target))) {
        closeLibrary();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
