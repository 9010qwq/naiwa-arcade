/* games.json: { games: [{ slug, ready, screenshot?, action?, tag? }] }
   A bare array is also accepted. Only ready === true or status === 'ready' opens a game.
   Links are fixed to ./games/<known-slug>/index.html. Missing entries stay closed. */
(() => {
  'use strict';
  const games = [
    {slug:'tray',name:'端稳这桌',action:'稳住托盘，接住每一份快乐。',tag:'平衡 · 接物',kind:'new',color:'#ffd467',symbol:'tray'},
    {slug:'rewind',name:'这笑能撤回吗',action:'把失误倒回去，再秀一次操作。',tag:'回溯 · 闯关',kind:'new',color:'#d5ceef',symbol:'rewind'},
    {slug:'library',name:'图书馆闭麦',action:'忍住笑，躲过图书馆的耳朵。',tag:'反应 · 潜行',kind:'new',color:'#c9dba5',symbol:'library'},
    {slug:'relay',name:'笑声接力局',action:'看准时机，把快乐传下去。',tag:'节奏 · 接力',kind:'new',color:'#ffb295',symbol:'relay'},
    {slug:'pegs',name:'弹珠营业中',action:'瞄准发射，让弹珠多弹几下。',tag:'经典 · 弹珠',kind:'classic',color:'#b8dcd8',symbol:'pegs'},
    {slug:'slide',name:'滑到哪算哪',action:'找准角度，一口气滑到终点。',tag:'经典 · 滑行',kind:'classic',color:'#ffd467',symbol:'slide'},
    {slug:'stack',name:'叠罗汉营业中',action:'找准落点，把罗汉越叠越高。',tag:'经典 · 堆叠',kind:'classic',color:'#d5ceef',symbol:'stack'},
    {slug:'territory',name:'这块地我笑了',action:'画条回家的线，圈下更多地盘。',tag:'经典 · 圈地',kind:'classic',color:'#c9dba5',symbol:'territory'}
  ];
  const drawings = {
    tray:'<path d="M17 71h108l-9 15H26Z" fill="#fff9e9"/><path d="M53 87v13h38V87M42 101h60" fill="none"/><path d="M31 59V39h28v20M26 60h39M79 57c-9-17 20-29 26-10 14-5 21 15 5 17H83" fill="#ff7a36"/><path d="m65 15 9-9m-5 21 13-2" fill="none"/>',
    rewind:'<path d="M111 69c0 23-18 39-41 39S30 92 30 69s17-40 40-40c13 0 25 6 32 15" fill="#fff9e9"/><path d="m91 19 13 28-31 1" fill="#ff7a36"/><path d="m65 51-17 17 17 16V51Zm25 0L73 68l17 16V51Z" fill="#ff7a36"/>',
    library:'<path d="M21 92h106M30 89V28h20v61M55 89V20h24v69M87 89 73 34l20-5 15 55" fill="#fff9e9"/><path d="M33 42h14m11-6h17M86 47l12-4"/><path d="m107 10 20 18M127 10l-20 18" stroke="#ff7a36" stroke-width="7"/>',
    relay:'<path d="M21 73c15-37 76-49 98-7" fill="none" stroke-dasharray="5 10"/><path d="m104 61 20 5-9 18" fill="#ff7a36"/><circle cx="24" cy="84" r="18" fill="#fff9e9"/><circle cx="119" cy="87" r="18" fill="#fff9e9"/><rect x="56" y="38" width="37" height="18" rx="7" fill="#ff7a36" transform="rotate(-32 74 47)"/><path d="M16 83q8 11 16 0m79 3q8 11 16 0" fill="none"/>',
    pegs:'<circle cx="29" cy="82" r="10" fill="#fff9e9"/><circle cx="73" cy="82" r="10" fill="#fff9e9"/><circle cx="117" cy="82" r="10" fill="#fff9e9"/><circle cx="51" cy="51" r="10" fill="#fff9e9"/><circle cx="96" cy="51" r="10" fill="#fff9e9"/><circle cx="80" cy="15" r="14" fill="#ff7a36"/><path d="m79 32-7 24 17 20-10 26M17 106h113" fill="none" stroke-dasharray="4 7"/>',
    slide:'<path d="M19 20h105v89H20V20Zm26 0v65h54V44H69v18" fill="#fff9e9"/><path d="m-1 42 13-5m-9 17 10-1" fill="none"/><rect x="20" y="26" width="25" height="25" rx="7" fill="#ff7a36"/><path d="M106 89h16m-16 8h16" stroke="#ff7a36"/>',
    stack:'<rect x="15" y="80" width="115" height="25" rx="5" fill="#fff9e9"/><rect x="30" y="52" width="84" height="25" rx="5" fill="#ff7a36"/><rect x="43" y="23" width="62" height="25" rx="5" fill="#fff9e9"/><path d="m24 17 6-7m84-1 6 8M10 110h125" fill="none"/><path d="M66 35h15m-24 29h15m-22 29h15" fill="none"/>',
    territory:'<path d="M22 15h103v94H22Z" fill="#fff9e9"/><path d="M22 109V64h45V34h58v75Z" fill="#ff7a36"/><path d="M22 40h24V15M89 109V84h36" fill="none" stroke-dasharray="4 6"/><circle cx="67" cy="36" r="11" fill="#fff9e9"/><path d="m78 24 11-10m-11 0 10 10" fill="none"/>'
  };
  const grid = document.querySelector('#game-grid');
  const count = document.querySelector('#game-count');
  const random = document.querySelector('#random-game');
  const note = document.querySelector('#lobby-note');
  let activeFilter = 'all';
  let readyGames = [];
  let records = new Map();
  const text = (tag, className, value) => {
    const element = document.createElement(tag); element.className = className; element.textContent = value; return element;
  };
  function safeImagePath(value) {
    if (typeof value !== 'string' || !value.trim()) return null;
    try {
      const url = new URL(value, document.baseURI);
      const root = new URL('./', document.baseURI);
      return url.origin === root.origin && url.pathname.startsWith(root.pathname) && /\.(png|jpe?g|webp|gif)(?:$)/i.test(url.pathname) ? url.href : null;
    } catch (_) { return null; }
  }
  function isReady(record) { return !!record && (record.ready === true || (record.ready !== false && record.status === 'ready')); }
  function render() {
    grid.replaceChildren();
    games.forEach((game, i) => {
      const record = records.get(game.slug);
      const ready = isReady(record);
      const card = text('article',`game-card${ready ? '' : ' is-pending'}`,'');
      card.hidden = activeFilter !== 'all' && game.kind !== activeFilter;
      card.dataset.slug = game.slug;
      const link = text('a','card-link','');
      if (ready) link.href = `./games/${game.slug}/index.html`;
      else { link.setAttribute('aria-disabled','true'); link.tabIndex = -1; }
      const art = text('div','card-art','');
      art.style.setProperty('--cover',game.color);
      const fallback = text('div','cover-fallback','');
      fallback.setAttribute('aria-hidden','true');
      fallback.innerHTML = `<svg class="cover-symbol" viewBox="0 0 145 120" fill="none" stroke="#25251f" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">${drawings[game.symbol]}</svg>`;
      art.append(fallback);
      const imagePath = safeImagePath(record && (record.screenshot || record.cover));
      if (imagePath) {
        const screenshot = document.createElement('img'); screenshot.className='card-cover'; screenshot.alt=''; screenshot.loading='lazy'; screenshot.decoding='async';
        screenshot.addEventListener('load',() => {fallback.hidden=true;});
        screenshot.addEventListener('error',() => {screenshot.remove();fallback.hidden=false;});
        screenshot.src=imagePath; art.append(screenshot);
      }
      art.append(text('span','card-number',String(i+1).padStart(2,'0')),text('span',`card-status${ready ? ' is-ready' : ''}`,ready ? '可开玩' : '制作中'));
      const content = text('div','card-content','');
      content.append(text('span','card-tag',typeof record?.tag === 'string' ? record.tag : game.tag));
      const title = text('h3','card-title',game.name); title.id=`title-${game.slug}`; content.append(title);
      const action = text('p','card-action',typeof record?.action === 'string' ? record.action : game.action); action.id=`action-${game.slug}`; content.append(action);
      const bottom = text('div','card-bottom','');
      bottom.append(text('span','',ready ? '开一局' : '正在准备快乐'),text('span','card-arrow',ready ? '↗' : '…'));
      content.append(bottom); link.append(art,content); link.setAttribute('aria-labelledby',title.id); link.setAttribute('aria-describedby',action.id); card.append(link); grid.append(card);
    });
    readyGames = games.filter(game => isReady(records.get(game.slug)));
    count.replaceChildren(text('strong','',String(readyGames.length).padStart(2,'0')),document.createTextNode(' / 08 款已开放'));
    random.disabled = readyGames.length === 0;
    grid.setAttribute('aria-busy','false');
  }
  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click',() => {
    activeFilter=button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(item => { const active=item === button;item.classList.toggle('is-active',active);item.setAttribute('aria-pressed',String(active)); });
    render();
  }));
  random.addEventListener('click',() => {
    if (!readyGames.length) return;
    const game=readyGames[Math.floor(Math.random()*readyGames.length)]; window.location.href=`./games/${game.slug}/index.html`;
  });
  render();
  grid.setAttribute('aria-busy','true');
  fetch('./games.json',{cache:'no-store'})
    .then(response => { if(!response.ok) throw new Error('manifest unavailable'); return response.json(); })
    .then(data => {
      const entries=Array.isArray(data) ? data : data.games;
      if (!Array.isArray(entries)) throw new Error('invalid manifest');
      const known=new Set(games.map(game=>game.slug));
      records=new Map(entries.filter(entry=>entry && known.has(entry.slug)).map(entry=>[entry.slug,entry]));
      render();
      if(!readyGames.length){note.textContent='游戏正在装机，稍后再来逛逛。';note.hidden=false;}
    })
    .catch(() => { render(); note.textContent='游戏正在装机，稍后再来逛逛。'; note.hidden=false; });
})();
