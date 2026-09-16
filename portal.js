/* Hirobius Portal Kit — single-page client portal renderer.
 *
 * A client page ships only data and links this script + theme.css. This file
 * builds the entire page from that data, so structure, styling and behavior are
 * all shared across clients — edit here once and every portal updates.
 *
 * ── Data model (script type="application/json" id="portal-data") ─────────────
 *   {
 *     "client": "Client Name",
 *     "subtitle": "optional subtitle",
 *     "lastUpdated": "2026-01-01",
 *     "header":   { "eyebrow": false, "livelyHeading": true },  // both optional
 *     "progress": true,                                          // show done-count line
 *     "parties":  [{ "label": "Lilac", "cls": "a" }, { "label": "Hirobius", "cls": "b" }],
 *     "copyForAI":{ "mode": "generic|payload", "payloadId": "portal-payload",
 *                   "label": "Copy for AI", "placement": ["top","footer"] },
 *     "sections": [ …ordered typed sections, see below… ],
 *     "contact":  { "name": "", "email": "" },
 *     "footer":   { "lines": ["Prepared by …", "City, ST"] }
 *   }
 *
 * If "sections" is omitted, a legacy layout is synthesized from top-level
 * "phases" / "updates" / "accordions" / "docs" (keeps older client pages working).
 *
 * ── Section types ───────────────────────────────────────────────────────────
 *   assist   {id,title,body,steps[],notes[],cta:{label}}            — intro + Copy-for-AI CTA
 *   callout  {id,variant:"alert"|"plain",title,body,items[]}        — pulled-out note
 *   status   {id,eyebrow,title,note,phases[{id,title,status,items[{label,status,desc}]}]}
 *   tasks    {id,eyebrow,title,note,subgroups[{id,title,count,decisions,tasks[]}]}
 *   list     {id,eyebrow,title,count,note,items[{name,sub,status:{label,kind},note}],footNote}
 *   queue    {id,eyebrow,title,note,items[],footNote}               — ordered list
 *   cards    {id,eyebrow,title,columns,items[{n,title,text}]}       — value cards
 *   request  {id,eyebrow,title,note,placeholder,email,subject}      — mailto feedback box
 *   updates  {id,eyebrow,title,items[{date,note}]}
 *   accordions {id,eyebrow,title,items[{title,bodyId}]}
 *   docs     {id,eyebrow,title,note,items[{title,desc,bodyId}]}
 *   A task:  {id,title,owner,tags[],fields[{k,v|drafts|list}],steps[],stepsOpen,statusToggle}
 *   status is one of: "done" | "in-progress" | "upcoming".
 */
(function () {
  var SVGNS = 'http://www.w3.org/2000/svg';
  var STATES = { 'done': 'Done', 'in-progress': 'In progress', 'upcoming': 'Upcoming' };
  var ICONS = {
    chevron:  ['m9 18 6-6-6-6'],
    file:     ['M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z', 'M14 2v4a2 2 0 0 0 2 2h4', 'M16 13H8', 'M16 17H8', 'M10 9H8'],
    close:    ['M18 6 6 18', 'm6 6 12 12'],
    sun:      ['M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z', 'M12 1v2', 'M12 21v2', 'M4.2 4.2l1.4 1.4', 'M18.4 18.4l1.4 1.4', 'M1 12h2', 'M21 12h2', 'M4.2 19.8l1.4-1.4', 'M18.4 5.6l1.4-1.4'],
    moon:     ['M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z'],
    monitor:  ['M20 3H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1Z', 'M8 21h8', 'M12 17v4'],
    copy:     ['M9 11a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2z', 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'],
    check:    ['M20 6 9 17l-5-5'],
    alert:    ['M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z', 'M12 9v4', 'M12 17h.01']
  };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function icon(name, cls) {
    var s = document.createElementNS(SVGNS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('class', 'icon' + (cls ? ' ' + cls : ''));
    (ICONS[name] || []).forEach(function (d) {
      var p = document.createElementNS(SVGNS, 'path');
      p.setAttribute('d', d);
      s.appendChild(p);
    });
    return s;
  }
  function fmtDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!m) return iso || '';
    return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }
  function normState(s) { return STATES[s] ? s : 'upcoming'; }
  function itemsOf(p) { return Array.isArray(p.items) ? p.items : []; }
  function doneIn(p) { return itemsOf(p).filter(function (i) { return normState(i.status) === 'done'; }).length; }
  function mdSource(id) { var n = document.getElementById(id); return n ? n.textContent : ''; }
  function arr(x) { return Array.isArray(x) ? x : []; }
  function secHead(title, countText) {
    var head = el('div', 'sec-head');
    head.appendChild(el('h2', null, title));
    if (countText != null) head.appendChild(el('span', 'count', countText));
    return head;
  }
  // A short line of inline markdown (bold/links/code) with the wrapping <p> removed.
  function inlineHTML(md) {
    var html = mdToHtml(md || '');
    return html.replace(/^<p>/, '').replace(/<\/p>\s*$/, '');
  }
  // {{token_name}} → a styled chip reading "token name". Everything else escaped.
  function withTokens(text) {
    var out = document.createDocumentFragment();
    var re = /\{\{\s*([a-z0-9_]+)\s*\}\}/gi, last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) out.appendChild(document.createTextNode(text.slice(last, m.index)));
      out.appendChild(el('span', 'tok', m[1].replace(/_/g, ' ')));
      last = m.index + m[0].length;
    }
    if (last < text.length) out.appendChild(document.createTextNode(text.slice(last)));
    return out;
  }

  // Monochrome status checkbox: done = checked, in-progress = indeterminate, upcoming = empty.
  function checkbox(state) {
    var s = normState(state);
    var box = el('span', 'cbx cbx-' + s);
    box.setAttribute('role', 'img');
    box.setAttribute('aria-label', STATES[s]);
    var svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', '0 0 20 20'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('class', 'cbx-svg');
    var rect = document.createElementNS(SVGNS, 'rect');
    rect.setAttribute('x', '2.5'); rect.setAttribute('y', '2.5'); rect.setAttribute('width', '15'); rect.setAttribute('height', '15'); rect.setAttribute('rx', '4');
    svg.appendChild(rect);
    var mark = s === 'done' ? 'M5.5 10.5l3 3 6-6.5' : (s === 'in-progress' ? 'M6 10h8' : null);
    if (mark) {
      var p = document.createElementNS(SVGNS, 'path');
      p.setAttribute('d', mark); p.setAttribute('class', 'cbx-mark');
      svg.appendChild(p);
    }
    box.appendChild(svg);
    return box;
  }
  function phaseState(p) {
    var items = itemsOf(p);
    if (!items.length) return normState(p.status);
    var done = items.filter(function (i) { return normState(i.status) === 'done'; }).length;
    if (done === items.length) return 'done';
    if (done > 0 || items.some(function (i) { return normState(i.status) === 'in-progress'; })) return 'in-progress';
    return 'upcoming';
  }
  function itemList(p) {
    var ul = el('ul', 'items');
    itemsOf(p).forEach(function (it) {
      var li = el('li', 'item ' + normState(it.status));
      li.appendChild(checkbox(it.status));
      var txt = el('div', 'item-text');
      txt.appendChild(el('span', 'label', it.label || ''));
      if (it.desc) txt.appendChild(el('p', 'desc', it.desc));
      li.appendChild(txt);
      ul.appendChild(li);
    });
    return ul;
  }

  /* --- Minimal, safe Markdown -> HTML (headings, bold, italic, code, links,
     lists, tables, hr, callouts, collapsibles, paragraphs). Escaped first. --- */
  function mdToHtml(src) {
    function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    function inline(s) {
      s = esc(s);
      s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
      s = s.replace(/\[([^\]]+)\]\(#([a-z0-9-]+)\)/gi, '<a href="#$2" class="xref" data-ref="$2">$1</a>');
      s = s.replace(/\[([^\]]+)\]\((mailto:[^\s)]+)\)/g, '<a href="$2">$1</a>');
      s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
      s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      s = s.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
      return s;
    }
    var lines = src.replace(/\r/g, '').replace(/^\n+|\n+$/g, '').split('\n');
    var out = [], i = 0;
    function isTableSep(s) { return /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(s) && s.indexOf('-') > -1; }
    function cells(row) { return row.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(function (c) { return inline(c.trim()); }); }
    while (i < lines.length) {
      var line = lines[i];
      if (/^\s*$/.test(line)) { i++; continue; }
      var dm = /^:::(\+)?\s+(.+?)\s*$/.exec(line);
      if (dm) {
        i++; var inner = [];
        while (i < lines.length && !/^:::\s*$/.test(lines[i])) { inner.push(lines[i]); i++; }
        if (i < lines.length) i++;
        out.push('<details class="md-acc"' + (dm[1] ? ' open' : '') + '><summary>' + inline(dm[2]) +
          '</summary><div class="md-acc-body">' + mdToHtml(inner.join('\n')) + '</div></details>');
        continue;
      }
      var h = /^(#{1,6})\s+(.*)$/.exec(line);
      if (h) { var lv = h[1].length; out.push('<h' + lv + '>' + inline(h[2]) + '</h' + lv + '>'); i++; continue; }
      if (/^---+\s*$/.test(line)) { out.push('<hr>'); i++; continue; }
      if (/^\s*>\s?/.test(line)) {
        var bq = [];
        while (i < lines.length && /^\s*>\s?/.test(lines[i])) { bq.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
        out.push('<blockquote class="callout">' + mdToHtml(bq.join('\n')) + '</blockquote>');
        continue;
      }
      if (line.indexOf('|') > -1 && i + 1 < lines.length && isTableSep(lines[i + 1])) {
        var head = cells(line); i += 2; var rows = [];
        while (i < lines.length && lines[i].indexOf('|') > -1 && !/^\s*$/.test(lines[i])) { rows.push(cells(lines[i])); i++; }
        var t = '<table><thead><tr>' + head.map(function (c) { return '<th>' + c + '</th>'; }).join('') + '</tr></thead><tbody>';
        t += rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>'; }).join('');
        out.push(t + '</tbody></table>');
        continue;
      }
      if (/^\s*[-*]\s+/.test(line)) {
        var ul = '<ul>';
        while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) { ul += '<li>' + inline(lines[i].replace(/^\s*[-*]\s+/, '')) + '</li>'; i++; }
        out.push(ul + '</ul>'); continue;
      }
      if (/^\s*\d+\.\s+/.test(line)) {
        var ol = '<ol>';
        while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) { ol += '<li>' + inline(lines[i].replace(/^\s*\d+\.\s+/, '')) + '</li>'; i++; }
        out.push(ol + '</ol>'); continue;
      }
      var para = [line]; i++;
      while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^(#{1,6}\s|[-*]\s|\d+\.\s|:::|\s*>\s?|---+\s*$)/.test(lines[i]) &&
             !(lines[i].indexOf('|') > -1 && i + 1 < lines.length && isTableSep(lines[i + 1]))) { para.push(lines[i]); i++; }
      out.push('<p>' + inline(para.join(' ')) + '</p>');
    }
    return out.join('\n');
  }

  /* --- Document reader --- */
  var overlay = null;
  function closeReader() { if (overlay) { overlay.remove(); overlay = null; document.body.style.overflow = ''; } }
  function openReader(title, bodyId) {
    closeReader();
    overlay = el('div', 'reader-overlay');
    overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true'); overlay.setAttribute('aria-label', title);
    var bar = el('div', 'reader-bar');
    bar.appendChild(el('div', 'reader-title', title));
    var close = el('button', 'reader-close'); close.setAttribute('aria-label', 'Close');
    close.appendChild(icon('close')); close.addEventListener('click', closeReader);
    bar.appendChild(close);
    var body = el('div', 'reader-body');
    var article = el('article', 'md'); article.innerHTML = mdToHtml(mdSource(bodyId));
    body.appendChild(article);
    overlay.appendChild(bar); overlay.appendChild(body);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeReader(); });
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    close.focus();
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeReader(); });
  var REF_TITLES = {};
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a.xref[data-ref]') : null;
    if (!a) return;
    e.preventDefault();
    var id = a.getAttribute('data-ref');
    if (mdSource(id)) openReader(REF_TITLES[id] || 'Document', id);
  });

  /* --- Theme switcher: System -> Light -> Dark, saved per-viewer --- */
  var THEME_KEY = 'portal-theme';
  var THEMES = ['system', 'light', 'dark'];
  function readTheme() { try { var v = localStorage.getItem(THEME_KEY); return THEMES.indexOf(v) > -1 ? v : 'system'; } catch (e) { return 'system'; } }
  function applyTheme(t) {
    if (t === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
  }
  function themeButton() {
    var btn = el('button', 'theme-toggle'); btn.type = 'button';
    function paint() {
      var t = readTheme();
      var lbl = t === 'system' ? 'System' : (t === 'light' ? 'Light' : 'Dark');
      btn.textContent = '';
      btn.appendChild(icon(t === 'light' ? 'sun' : (t === 'dark' ? 'moon' : 'monitor')));
      btn.setAttribute('aria-label', 'Theme: ' + lbl + '. Tap to change.');
      btn.setAttribute('title', 'Theme: ' + lbl);
    }
    btn.addEventListener('click', function () {
      var next = THEMES[(THEMES.indexOf(readTheme()) + 1) % THEMES.length];
      try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
      applyTheme(next); paint();
    });
    paint();
    return btn;
  }
  applyTheme(readTheme());

  /* --- Copy for AI ---------------------------------------------------------
     Two modes:
       generic  — compile the whole rendered portal into one Markdown blob.
       payload  — copy a named JSON block verbatim (e.g. a structured intake
                  payload whose own instructions tell the assistant what to do). */
  function textForAI(data) {
    var name = data.client || 'Client';
    var L = ['# ' + name + ' — Client Portal (complete contents)', ''];
    L.push('_The full text of ' + name + "'s private project portal, maintained by Hirobius" +
      (data.lastUpdated ? ', last updated ' + fmtDate(data.lastUpdated) : '') +
      '. Exported so it can be pasted into any AI assistant for questions or summaries._');
    if (data.subtitle) { L.push(''); L.push(data.subtitle); }
    arr(data.sections).forEach(function (sec) {
      if (sec.type === 'status') {
        L.push('', '---', '', '## ' + (sec.title || 'Project Status'));
        arr(sec.phases).forEach(function (p) {
          L.push('', '### ' + (p.title || '') + ' (' + doneIn(p) + '/' + itemsOf(p).length + ' done)');
          itemsOf(p).forEach(function (it) {
            var s = normState(it.status);
            var mark = s === 'done' ? '[x]' : (s === 'in-progress' ? '[~]' : '[ ]');
            L.push('- ' + mark + ' ' + (it.label || '') + (it.desc ? ' — ' + it.desc : ''));
          });
        });
      } else if (sec.type === 'updates') {
        var us = arr(sec.items).slice().sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });
        if (us.length) { L.push('', '---', '', '## ' + (sec.title || 'Status Updates')); us.forEach(function (u) { L.push('- ' + (u.date ? fmtDate(u.date) + ': ' : '') + (u.note || '')); }); }
      } else if (sec.type === 'accordions') {
        L.push('', '---', '', '## ' + (sec.title || 'How We Work Together'));
        arr(sec.items).forEach(function (a) { L.push('', '### ' + (a.title || ''), '', mdSource(a.bodyId).trim()); });
      } else if (sec.type === 'docs') {
        L.push('', '---', '', '# ' + (sec.title || 'Documents'));
        arr(sec.items).forEach(function (dc) { L.push('', '---', '', mdSource(dc.bodyId).trim()); });
      }
    });
    if (data.contact && data.contact.email) {
      L.push('', '---', '', '## Contact', '', (data.contact.name ? data.contact.name + ' — ' : '') + data.contact.email);
    }
    return L.join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
  }
  function copyText(data, cfg) {
    if (cfg && cfg.mode === 'payload' && cfg.payloadId) return mdSource(cfg.payloadId).trim() + '\n';
    return textForAI(data);
  }
  function legacyCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.top = '-1000px'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length);
      var ok = document.execCommand('copy'); document.body.removeChild(ta);
      return ok;
    } catch (e) { return false; }
  }
  function setLabel(btn, iconName, text) {
    btn.textContent = ''; btn.appendChild(icon(iconName)); btn.appendChild(el('span', null, text));
  }
  function wireCopy(btn, getText, labels) {
    function flash(t) { setLabel(btn, 'check', t); setTimeout(function () { setLabel(btn, 'copy', labels.idle); }, 2200); }
    btn.addEventListener('click', function () {
      var text = getText();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { flash(labels.ok); },
          function () { flash(legacyCopy(text) ? labels.ok : labels.manual); });
      } else { flash(legacyCopy(text) ? labels.ok : labels.manual); }
    });
  }
  // Solid CTA button (assist blocks) — no icon, just the label, matching .copy-btn.
  function ctaButton(data, cfg, label) {
    var btn = el('button', 'copy-btn'); btn.type = 'button';
    var LBL = label || (cfg && cfg.label) || 'Copy for AI';
    btn.textContent = LBL;
    var flashing = false;
    btn.addEventListener('click', function () {
      var text = copyText(data, cfg);
      function done(ok) { if (flashing) return; flashing = true; btn.textContent = ok ? 'Copied to clipboard' : 'Press Ctrl/⌘+C to copy'; setTimeout(function () { btn.textContent = LBL; flashing = false; }, 2200); }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(legacyCopy(text)); });
      else done(legacyCopy(text));
    });
    return btn;
  }
  var AI_NOTE = 'Copies this whole portal as text. Paste it into ChatGPT, Claude, or any AI assistant and ask it anything about the plan.';
  function aiBlock(data, cfg, extraCls) {
    var w = el('div', 'foot-ai' + (extraCls ? ' ' + extraCls : ''));
    var btn = el('button', 'ai-copy'); btn.type = 'button';
    var LBL = (cfg && cfg.label) || 'Copy everything for AI';
    setLabel(btn, 'copy', LBL);
    wireCopy(btn, function () { return copyText(data, cfg); }, { idle: LBL, ok: 'Copied — now paste into any AI', manual: 'Press Ctrl/⌘+C to copy' });
    w.appendChild(btn);
    w.appendChild(el('p', 'foot-ai-note', (cfg && cfg.note) || AI_NOTE));
    return w;
  }

  /* --- Owner chip ---------------------------------------------------------- */
  function ownerChip(ownerText, parties) {
    parties = arr(parties);
    var hits = parties.filter(function (p) { return p.label && ownerText.toLowerCase().indexOf(p.label.toLowerCase()) > -1; });
    var cls = hits.length >= 2 ? 'both' : (hits[0] ? hits[0].cls : 'a');
    var wrap = el('p', 'owner');
    wrap.appendChild(el('span', 'owner-chip ' + cls, ownerText));
    return wrap;
  }

  /* --- Shared section shell (eyebrow + heading + note) --------------------- */
  function sectionShell(sec) {
    var s = el('section');
    if (sec.id) s.id = sec.id;
    if (sec.eyebrow) s.appendChild(el('p', 'sec-eyebrow', sec.eyebrow));
    if (sec.title) s.appendChild(secHead(sec.title, sec.count));
    if (sec.note) { var n = el('p', 'sec-note'); n.innerHTML = inlineHTML(sec.note); s.appendChild(n); }
    return s;
  }

  /* --- Section renderers --------------------------------------------------- */
  var TASK_NODES = [];       // task cards with a status toggle (for progress)
  var PROGRESS_EL = null;    // the "N of M done" line
  var CHECK_KEY = 'portal-checks';

  function renderStatus(sec) {
    var s = sectionShell(sec);
    var wrap = el('div', 'phases');
    arr(sec.phases).forEach(function (p) {
      var card = el('div', 'phase');
      if (p.id) card.id = p.id;
      var h = el('div', 'phase-head');
      h.appendChild(checkbox(phaseState(p)));
      h.appendChild(el('h3', null, p.title || ''));
      card.appendChild(h);
      card.appendChild(el('p', 'phase-prog', doneIn(p) + ' of ' + itemsOf(p).length + ' done'));
      card.appendChild(itemList(p));
      wrap.appendChild(card);
    });
    s.appendChild(wrap);
    return s;
  }

  function renderUpdates(sec) {
    var items = arr(sec.items).slice().sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });
    if (sec.count == null && items.length) sec = Object.assign({}, sec, { count: items.length + (items.length === 1 ? ' entry' : ' entries') });
    var s = sectionShell(sec);
    var feed = el('ul', 'feed');
    items.forEach(function (u) {
      var li = el('li', 'entry');
      var t = el('time', null, fmtDate(u.date));
      if (u.date) t.setAttribute('datetime', u.date);
      li.appendChild(t);
      li.appendChild(el('p', null, u.note || ''));
      feed.appendChild(li);
    });
    s.appendChild(feed);
    return s;
  }

  function renderAccordions(sec) {
    var s = sectionShell(sec);
    arr(sec.items).forEach(function (a) {
      var d = el('details', 'acc');
      var sum = document.createElement('summary');
      sum.appendChild(icon('chevron', 'chev'));
      sum.appendChild(el('h3', null, a.title || ''));
      d.appendChild(sum);
      var body = el('div', 'acc-body md');
      body.innerHTML = mdToHtml(mdSource(a.bodyId));
      d.appendChild(body);
      s.appendChild(d);
    });
    return s;
  }

  function renderDocs(sec) {
    var s = sectionShell(sec);
    var dwrap = el('div', 'docs');
    arr(sec.items).forEach(function (dc) {
      if (dc.bodyId) REF_TITLES[dc.bodyId] = dc.title || 'Document';
      var title = dc.title || 'Document';
      var card = el('div', 'doc');
      var txt = el('div', 'txt');
      var dh = el('h3'); dh.appendChild(icon('file', 'doc-ico')); dh.appendChild(document.createTextNode(title));
      txt.appendChild(dh);
      if (dc.desc) txt.appendChild(el('p', null, dc.desc));
      card.appendChild(txt);
      var actions = el('div', 'doc-actions');
      var read = el('button', 'doc-link'); read.type = 'button'; read.textContent = 'Read';
      read.addEventListener('click', function () { openReader(title, dc.bodyId); });
      actions.appendChild(read);
      card.appendChild(actions);
      dwrap.appendChild(card);
    });
    s.appendChild(dwrap);
    return s;
  }

  // Email/message draft box (subject + tokenized body).
  function draftBox(d) {
    var box = el('div', 'email');
    if (d.subject != null) {
      var subj = el('div', 'subj');
      subj.appendChild(el('b', null, 'Subject: '));
      subj.appendChild(withTokens(d.subject));
      box.appendChild(subj);
    }
    var body = el('div', 'body');
    String(d.body || '').split(/\n{2,}/).forEach(function (para) {
      var p = el('p');
      para.split('\n').forEach(function (ln, i) { if (i) p.appendChild(document.createElement('br')); p.appendChild(withTokens(ln)); });
      body.appendChild(p);
    });
    box.appendChild(body);
    return box;
  }
  function taskField(f) {
    var wrap = el('div', 'field' + (f.call ? ' call' : ''));
    wrap.appendChild(el('span', 'k', f.k || ''));
    if (f.drafts) {
      var v = el('div', 'v');
      var list = arr(f.drafts);
      var host = v;
      if (f.collapsed) {
        var det = el('details');
        var sum = document.createElement('summary');
        sum.appendChild(el('span', 's-closed', f.summaryClosed || ('Read the ' + list.length + ' drafts')));
        sum.appendChild(el('span', 's-open', f.summaryOpen || ('Hide the ' + list.length + ' drafts')));
        det.appendChild(sum); v.appendChild(det); host = det;
      }
      list.forEach(function (d) {
        if (d.label) { var dl = el('p', 'draft-label', d.label); if (d.when) dl.appendChild(el('span', 'when', d.when)); host.appendChild(dl); }
        host.appendChild(draftBox(d));
      });
      if (f.cap) { var cap = el('p', 'cap'); cap.innerHTML = inlineHTML(f.cap); v.appendChild(cap); }
      wrap.appendChild(v);
    } else if (f.list) {
      var vv = el('div', 'v');
      var ol = el('ol', 'cats');
      if (f.list.single) ol.style.gridTemplateColumns = '1fr';
      arr(f.list.items).forEach(function (it) { var li = el('li'); li.innerHTML = inlineHTML(it); ol.appendChild(li); });
      vv.appendChild(ol); wrap.appendChild(vv);
    } else {
      var p = el('p', 'v'); p.innerHTML = inlineHTML(f.v || ''); wrap.appendChild(p);
    }
    return wrap;
  }
  function renderTaskCard(task, ctx) {
    var card = el('div', 'task');
    if (task.id) card.id = String(task.id).toLowerCase();
    var row = el('div', 'task-row');
    if (task.id) row.appendChild(el('span', 'code', task.id));
    row.appendChild(el('span', 'title', task.title || ''));
    arr(task.tags).forEach(function (tg) { row.appendChild(el('span', 'pill tag', tg)); });
    card.appendChild(row);
    if (task.owner) card.appendChild(ownerChip(task.owner, ctx.parties));
    arr(task.fields).forEach(function (f) { card.appendChild(taskField(f)); });
    if (arr(task.steps).length) {
      var det = el('details'); if (task.stepsOpen) det.setAttribute('open', '');
      var sum = document.createElement('summary');
      sum.appendChild(el('span', 's-closed', 'Show steps'));
      sum.appendChild(el('span', 's-open', 'Hide steps'));
      det.appendChild(sum);
      var ol = el('ol', 'steps');
      task.steps.forEach(function (st) { var li = el('li'); li.innerHTML = inlineHTML(st); ol.appendChild(li); });
      det.appendChild(ol);
      card.appendChild(det);
    }
    if (task.statusToggle !== false && task.id) addStatusToggle(card, String(task.id));
    return card;
  }
  function addStatusToggle(card, code) {
    var label = el('label', 'status');
    var box = document.createElement('input'); box.type = 'checkbox'; box.className = 'chk';
    box.setAttribute('aria-label', 'Mark ' + code + ' done');
    var txt = el('span');
    function reflect() { if (box.checked) { card.classList.add('done'); txt.textContent = 'Done'; } else { card.classList.remove('done'); txt.textContent = 'To do'; } }
    box.addEventListener('change', function () {
      var saved = readChecks(); if (box.checked) saved[code] = true; else delete saved[code];
      writeChecks(saved); reflect(); updateProgress();
    });
    label.appendChild(box); label.appendChild(txt);
    card.appendChild(label);
    TASK_NODES.push({ card: card, code: code, box: box, reflect: reflect });
  }
  function renderTasks(sec, ctx) {
    var s = sectionShell(sec);
    arr(sec.subgroups).forEach(function (g) {
      var head = el('h3', 'subhead'); if (g.id) head.id = g.id;
      head.appendChild(document.createTextNode(g.title || ''));
      if (g.count) head.appendChild(el('span', 'sub-count', g.count));
      s.appendChild(head);
      if (g.decisions) {
        var dwrap = el('div', 'decisions');
        if (g.decisions.eyebrow) dwrap.appendChild(el('p', 'dec-eyebrow', g.decisions.eyebrow));
        var grid = el('div', 'dec-grid');
        arr(g.decisions.items).forEach(function (d) {
          var dc = el('div', 'decision');
          dc.appendChild(el('span', 'dk', d.k || 'Decided'));
          var p = el('p'); p.innerHTML = inlineHTML(d.text || d); dc.appendChild(p);
          grid.appendChild(dc);
        });
        dwrap.appendChild(grid); s.appendChild(dwrap);
      }
      var tasks = el('div', 'tasks');
      arr(g.tasks).forEach(function (t) { tasks.appendChild(renderTaskCard(t, ctx)); });
      s.appendChild(tasks);
    });
    return s;
  }

  function statusPillClass(kind) { return kind === 'built' ? 'pill built' : (kind === 'wait' ? 'pill wait' : 'pill'); }
  function renderList(sec) {
    var s = sectionShell(sec);
    var list = el('div', 'wf-list');
    arr(sec.items).forEach(function (it) {
      var item = el('div', 'wf-item');
      var top = el('div', 'wf-top');
      var name = el('span', 'wf-name'); name.appendChild(document.createTextNode(it.name || ''));
      if (it.sub) { name.appendChild(document.createTextNode(' ')); name.appendChild(el('span', 'sub', it.sub)); }
      top.appendChild(name);
      if (it.status) top.appendChild(el('span', statusPillClass(it.status.kind), it.status.label || ''));
      item.appendChild(top);
      if (it.note) { var w = el('p', 'wf-wait'); w.innerHTML = inlineHTML(it.note); item.appendChild(w); }
      list.appendChild(item);
    });
    s.appendChild(list);
    if (sec.footNote) { var fn = el('p', 'sec-note foot'); fn.innerHTML = inlineHTML(sec.footNote); s.appendChild(fn); }
    return s;
  }

  function renderQueue(sec) {
    var s = sectionShell(sec);
    var ol = el('ol', 'queue');
    arr(sec.items).forEach(function (it) { var li = el('li'); li.innerHTML = inlineHTML(it); ol.appendChild(li); });
    s.appendChild(ol);
    if (sec.footNote) { var fn = el('p', 'sec-note foot'); fn.innerHTML = inlineHTML(sec.footNote); s.appendChild(fn); }
    return s;
  }

  function renderCards(sec) {
    var s = sectionShell(sec);
    var grid = el('div', 'cards' + (sec.columns === 3 ? ' cards-3' : ''));
    arr(sec.items).forEach(function (c) {
      var card = el('div', 'card');
      if (c.n) card.appendChild(el('p', 'n', c.n));
      card.appendChild(el('h3', null, c.title || ''));
      var p = el('p'); p.innerHTML = inlineHTML(c.text || ''); card.appendChild(p);
      grid.appendChild(card);
    });
    s.appendChild(grid);
    return s;
  }

  function renderRequest(sec) {
    var s = sectionShell(sec);
    var box = el('div', 'request');
    var lab = el('label', 'ak req-label', 'Your request'); lab.setAttribute('for', 'reqText');
    box.appendChild(lab);
    var ta = el('textarea'); ta.id = 'reqText'; ta.rows = 4; if (sec.placeholder) ta.placeholder = sec.placeholder;
    box.appendChild(ta);
    var rrow = el('div', 'req-row');
    var btn = el('button', 'copy-btn'); btn.type = 'button'; btn.textContent = sec.button || 'Email this request';
    btn.addEventListener('click', function () {
      var subj = encodeURIComponent(sec.subject || 'Custom request');
      var body = encodeURIComponent(ta.value.trim());
      window.location.href = 'mailto:' + (sec.email || '') + '?subject=' + subj + '&body=' + body;
    });
    rrow.appendChild(btn);
    if (sec.hint) rrow.appendChild(el('p', 'req-hint', sec.hint));
    box.appendChild(rrow);
    s.appendChild(box);
    return s;
  }

  function renderCallout(sec) {
    var c = el('div', 'callout' + (sec.variant === 'alert' ? ' alert' : ''));
    if (sec.id) c.id = sec.id;
    if (sec.title) {
      var t = el('p', 'callout-title');
      if (sec.variant === 'alert') t.appendChild(icon('alert', 'ico'));
      t.appendChild(document.createTextNode(sec.title));
      c.appendChild(t);
    }
    if (arr(sec.items).length) {
      var ul = el('ul', 'callout-list');
      sec.items.forEach(function (it) { var li = el('li'); li.innerHTML = inlineHTML(it); ul.appendChild(li); });
      c.appendChild(ul);
    } else if (sec.body) {
      var b = el('div', 'md'); b.innerHTML = mdToHtml(sec.body); c.appendChild(b);
    }
    return c;
  }

  function renderAssist(sec, data, cfg) {
    var wrap = el('div', 'assist'); if (sec.id) wrap.id = sec.id;
    var txt = el('div', 'txt');
    if (sec.title) txt.appendChild(el('h2', null, sec.title));
    if (sec.body) { var p = el('p'); p.innerHTML = inlineHTML(sec.body); txt.appendChild(p); }
    if (arr(sec.steps).length) {
      var ol = el('ol', 'how');
      sec.steps.forEach(function (st) { var li = el('li'); li.innerHTML = inlineHTML(st); ol.appendChild(li); });
      txt.appendChild(ol);
    }
    arr(sec.notes).forEach(function (nt) { var p = el('p', 'how-foot'); p.innerHTML = inlineHTML(nt); txt.appendChild(p); });
    wrap.appendChild(txt);
    var label = (sec.cta && sec.cta.label) || (cfg && cfg.label) || 'Copy for AI';
    wrap.appendChild(ctaButton(data, cfg, label));
    return wrap;
  }

  /* --- Progress line + saved checkmarks ----------------------------------- */
  function readChecks() { try { return JSON.parse(localStorage.getItem(CHECK_KEY) || '{}'); } catch (e) { return {}; } }
  function writeChecks(o) { try { localStorage.setItem(CHECK_KEY, JSON.stringify(o)); } catch (e) {} }
  function updateProgress() {
    if (!PROGRESS_EL) return;
    var done = TASK_NODES.filter(function (t) { return t.card.classList.contains('done'); }).length;
    PROGRESS_EL.textContent = done + ' of ' + TASK_NODES.length + ' items marked done (saved on this device).';
  }
  function restoreChecks() {
    var saved = readChecks();
    TASK_NODES.forEach(function (t) { if (saved[t.code]) t.box.checked = true; t.reflect(); });
    updateProgress();
  }

  /* --- TOC (right gutter) + scroll-spy ------------------------------------ */
  function buildTOC(entries) {
    if (entries.length < 4) return;
    var aside = el('aside', 'toc'); aside.setAttribute('aria-label', 'On this page');
    aside.appendChild(el('p', 'toc-title', 'On this page'));
    var nav = document.createElement('nav');
    entries.forEach(function (e) {
      var a = el('a', e.sub ? 'sub' : null, e.label);
      a.setAttribute('href', '#' + e.id);
      nav.appendChild(a);
    });
    aside.appendChild(nav);
    document.body.appendChild(aside);

    var links = Array.prototype.slice.call(aside.querySelectorAll('a'));
    var items = links.map(function (a) { return { link: a, el: document.getElementById(a.getAttribute('href').slice(1)) }; }).filter(function (x) { return x.el; });
    var ticking = false;
    function refresh() {
      ticking = false;
      var line = window.scrollY + Math.min(window.innerHeight * 0.28, 220);
      var current = items[0];
      for (var i = 0; i < items.length; i++) { if (items[i].el.getBoundingClientRect().top + window.scrollY <= line) current = items[i]; }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = items[items.length - 1];
      links.forEach(function (l) { l.classList.remove('active'); });
      if (current) current.link.classList.add('active');
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(refresh); } }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    refresh();
  }

  /* --- Clickable task-ID references (A1, B3, …) --------------------------- */
  function idLinkify() {
    var re = /\b([A-C][0-9])\b/g;
    var scopes = document.querySelectorAll('.wf-wait, .field .v, ol.queue li');
    Array.prototype.forEach.call(scopes, function (node) { walk(node); });
    function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (c) {
        if (c.nodeType === 3) linkify(c);
        else if (c.nodeType === 1 && c.tagName !== 'A') walk(c);
      });
    }
    function linkify(textNode) {
      var text = textNode.nodeValue; re.lastIndex = 0;
      if (!re.test(text)) return; re.lastIndex = 0;
      var frag = document.createDocumentFragment(), last = 0, m;
      while ((m = re.exec(text))) {
        var code = m[1], id = code.toLowerCase();
        if (!document.getElementById(id)) continue;
        frag.appendChild(document.createTextNode(text.slice(last, m.index)));
        var a = el('a', 'idlink', code); a.setAttribute('href', '#' + id);
        frag.appendChild(a); last = m.index + code.length;
      }
      if (last === 0) return;
      frag.appendChild(document.createTextNode(text.slice(last)));
      textNode.parentNode.replaceChild(frag, textNode);
    }
  }

  /* --- Lively variable-weight heading (opt-in, skipped under reduced-motion) */
  function livelyHeading(hero) {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var h1 = hero && hero.querySelector('h1'); if (!h1) return;
    var BASE = 720, MAX = 920, RADIUS = 130;
    var text = h1.textContent, chars = []; h1.textContent = '';
    for (var i = 0; i < text.length; i++) {
      if (text[i] === ' ') { h1.appendChild(document.createTextNode(' ')); continue; }
      var s = el('span', 'wchar', text[i]); s.style.fontVariationSettings = '"wght" ' + BASE;
      h1.appendChild(s); chars.push(s);
    }
    var mx = -9999, my = -9999, running = false;
    function tick() {
      if (!running) return;
      for (var i = 0; i < chars.length; i++) {
        var r = chars[i].getBoundingClientRect();
        var d = Math.hypot(mx - (r.left + r.width / 2), my - (r.top + r.height / 2));
        var w = d < RADIUS ? BASE + (1 - d / RADIUS) * (MAX - BASE) : BASE;
        chars[i].style.fontVariationSettings = '"wght" ' + Math.round(w);
      }
      requestAnimationFrame(tick);
    }
    hero.addEventListener('pointermove', function (e) { mx = e.clientX; my = e.clientY; }, { passive: true });
    hero.addEventListener('pointerenter', function () { if (!running) { running = true; requestAnimationFrame(tick); } });
    hero.addEventListener('pointerleave', function () { running = false; mx = my = -9999; for (var i = 0; i < chars.length; i++) chars[i].style.fontVariationSettings = '"wght" ' + BASE; });
  }

  /* --- Legacy fallback: synthesize sections from top-level keys ------------ */
  function legacySections(data) {
    var secs = [];
    if (arr(data.phases).length) secs.push({ type: 'status', title: 'Project Status', phases: data.phases });
    if (arr(data.updates).length) secs.push({ type: 'updates', title: 'Status Updates', note: 'Newest first. Short notes from Hirobius as the project moves.', items: data.updates });
    if (arr(data.accordions).length) secs.push({ type: 'accordions', title: 'How We Work Together', items: data.accordions });
    if (arr(data.docs).length) secs.push({ type: 'docs', title: 'Documents', note: 'Tap a document to read it here. Everything below is yours to keep.', items: data.docs });
    return secs;
  }

  var RENDERERS = {
    callout: renderCallout, status: renderStatus, updates: renderUpdates,
    accordions: renderAccordions, docs: renderDocs, tasks: renderTasks, list: renderList,
    queue: renderQueue, cards: renderCards, request: renderRequest
  };

  function render() {
    var dataEl = document.getElementById('portal-data');
    if (!dataEl) { console.error('portal-kit: no #portal-data'); return; }
    var data;
    try { data = JSON.parse(dataEl.textContent); }
    catch (e) { console.error('portal-kit: #portal-data JSON invalid:', e); return; }

    var cfg = data.copyForAI || { mode: 'generic', placement: ['top', 'footer'] };
    var ctx = { parties: data.parties || [{ label: 'Lilac', cls: 'a' }, { label: 'Hirobius', cls: 'b' }] };
    if (data.client) { document.title = data.client + (data.titleSuffix || ' — Project Portal'); CHECK_KEY = 'portal-checks:' + data.client; }

    var fb = document.getElementById('fallback'); if (fb) fb.remove();
    var main = document.querySelector('main') || document.body.appendChild(el('main'));
    main.textContent = '';

    // Header
    var head = el('header', 'head');
    var eb = data.header && data.header.eyebrow;
    if (eb !== false) {
      var bits = Array.isArray(eb) ? eb : ['Private'];
      if (!Array.isArray(eb) && data.lastUpdated) bits.push('Updated ' + fmtDate(data.lastUpdated));
      head.appendChild(el('p', 'eyebrow', bits.join(' • ')));
    }
    head.appendChild(el('h1', null, data.client || 'Project Portal'));
    head.appendChild(el('p', 'subtitle', data.subtitle || 'Where your project stands, updated as we go by Hirobius.'));
    main.appendChild(head);

    // Progress line (only kept if task toggles register below)
    var ov = null;
    if (data.progress !== false) {
      ov = el('div', 'overview'); PROGRESS_EL = el('p', 'progress'); PROGRESS_EL.id = 'progress';
      ov.appendChild(PROGRESS_EL); main.appendChild(ov);
    }

    // Top Copy-for-AI (generic mode only)
    if (cfg.mode !== 'payload' && (cfg.placement || []).indexOf('top') > -1) main.appendChild(aiBlock(data, cfg, 'top-ai'));

    // Sections
    var sections = arr(data.sections).length ? data.sections : legacySections(data);
    var nav = [];
    sections.forEach(function (sec) {
      var node;
      if (sec.type === 'assist') node = renderAssist(sec, data, cfg);
      else { var fn = RENDERERS[sec.type]; if (!fn) return; node = fn(sec, ctx); }
      main.appendChild(node);
      if (sec.id && (sec.type === 'assist' || sec.navTitle || sec.title)) nav.push({ id: sec.id, label: sec.navTitle || sec.title || 'Start here' });
      if (sec.type === 'tasks') arr(sec.subgroups).forEach(function (g) { if (g.id && g.title) nav.push({ id: g.id, label: g.title, sub: true }); });
    });

    // Footer
    var footer = el('footer');
    if (cfg.mode !== 'payload' && (cfg.placement || ['footer']).indexOf('footer') > -1) footer.appendChild(aiBlock(data, cfg));
    var email = data.contact && data.contact.email;
    if (email) {
      var fc = el('p', 'foot-contact'); fc.appendChild(document.createTextNode('Questions? '));
      var fa = el('a', null, email); fa.href = 'mailto:' + email; fc.appendChild(fa); footer.appendChild(fc);
    }
    arr(data.footer && data.footer.lines).forEach(function (ln) { var p = el('p'); p.innerHTML = inlineHTML(ln); footer.appendChild(p); });
    footer.appendChild(themeButton());
    main.appendChild(footer);

    // Behaviors
    if (ov && !TASK_NODES.length) { ov.remove(); PROGRESS_EL = null; }
    restoreChecks();
    idLinkify();
    buildTOC(nav);
    if (data.header && data.header.livelyHeading) livelyHeading(head);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();
})();
