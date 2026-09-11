/* Hirobius Portal Kit — single-page client portal renderer.
 *
 * A client page needs only: this script, theme.css, a JSON metadata block
 * (id="portal-data"), and one <script type="text/markdown" id="..."> block per
 * accordion body and per document. This file builds the whole page:
 *   header → Project Status → Status Updates → How We Work Together (accordions)
 *   → Documents (open in a reader) → Contact → footer + theme switcher.
 *
 * portal-data shape:
 *   { client, lastUpdated, subtitle,
 *     phases:  [{id, title, status, items:[{label, status, desc}]}],
 *     updates: [{date, note}],
 *     accordions: [{title, bodyId}],
 *     docs:    [{title, desc, bodyId}],
 *     contact: {name, note, email} }
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
    check:    ['M20 6 9 17l-5-5']
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
  function secHead(title, countText) {
    var head = el('div', 'sec-head');
    head.appendChild(el('h2', null, title));
    if (countText != null) head.appendChild(el('span', 'count', countText));
    return head;
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
     lists, tables, hr, paragraphs). Escaped before formatting. --- */
  function mdToHtml(src) {
    function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    function inline(s) {
      s = esc(s);
      s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
      // In-portal cross-reference: [text](#doc-id) opens that document's reader.
      s = s.replace(/\[([^\]]+)\]\(#([a-z0-9-]+)\)/gi, '<a href="#$2" class="xref" data-ref="$2">$1</a>');
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
      // Collapsible section: "::: Title" (closed) or ":::+ Title" (open) … "::: "
      var dm = /^:::(\+)?\s+(.+?)\s*$/.exec(line);
      if (dm) {
        i++; var inner = [];
        while (i < lines.length && !/^:::\s*$/.test(lines[i])) { inner.push(lines[i]); i++; }
        if (i < lines.length) i++; // consume closing :::
        out.push('<details class="md-acc"' + (dm[1] ? ' open' : '') + '><summary>' + inline(dm[2]) +
          '</summary><div class="md-acc-body">' + mdToHtml(inner.join('\n')) + '</div></details>');
        continue;
      }
      var h = /^(#{1,6})\s+(.*)$/.exec(line);
      if (h) { var lv = h[1].length; out.push('<h' + lv + '>' + inline(h[2]) + '</h' + lv + '>'); i++; continue; }
      if (/^---+\s*$/.test(line)) { out.push('<hr>'); i++; continue; }
      // Callout: consecutive lines starting with ">"
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

  // Cross-reference links ([text](#doc-id)) open the referenced document's reader.
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
  applyTheme(readTheme()); // apply saved preference ASAP

  /* --- "Copy for AI": compile the entire portal (every section + the full text
     of every document) into one structured Markdown blob and copy it, so the
     client can paste it into any AI assistant. --- */
  function textForAI(data) {
    var name = data.client || 'Client';
    var L = ['# ' + name + ' — Client Portal (complete contents)', ''];
    L.push('_The full text of ' + name + "'s private project portal, maintained by Hirobius" +
      (data.lastUpdated ? ', last updated ' + fmtDate(data.lastUpdated) : '') +
      '. Exported so it can be pasted into any AI assistant for questions or summaries._');
    if (data.subtitle) { L.push(''); L.push(data.subtitle); }

    var phases = Array.isArray(data.phases) ? data.phases : [];
    if (phases.length) {
      L.push('', '---', '', '## Project Status');
      phases.forEach(function (p) {
        L.push('', '### ' + (p.title || '') + ' (' + doneIn(p) + '/' + itemsOf(p).length + ' done)');
        itemsOf(p).forEach(function (it) {
          var s = normState(it.status);
          var mark = s === 'done' ? '[x]' : (s === 'in-progress' ? '[~]' : '[ ]');
          L.push('- ' + mark + ' ' + (it.label || '') + (it.desc ? ' — ' + it.desc : ''));
        });
      });
    }
    var updates = Array.isArray(data.updates) ? data.updates.slice() : [];
    if (updates.length) {
      updates.sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });
      L.push('', '---', '', '## Status Updates');
      updates.forEach(function (u) { L.push('- ' + (u.date ? fmtDate(u.date) + ': ' : '') + (u.note || '')); });
    }
    var accs = Array.isArray(data.accordions) ? data.accordions : [];
    if (accs.length) {
      L.push('', '---', '', '## How We Work Together');
      accs.forEach(function (a) { L.push('', '### ' + (a.title || ''), '', mdSource(a.bodyId).trim()); });
    }
    var docs = Array.isArray(data.docs) ? data.docs : [];
    if (docs.length) {
      L.push('', '---', '', '# Documents');
      docs.forEach(function (dc) { L.push('', '---', '', mdSource(dc.bodyId).trim()); });
    }
    if (data.contact && data.contact.email) {
      L.push('', '---', '', '## Contact', '', (data.contact.name ? data.contact.name + ' — ' : '') + data.contact.email);
    }
    return L.join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
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
  function aiButton(data) {
    var btn = el('button', 'ai-copy'); btn.type = 'button';
    var LABEL = 'Copy everything for AI';
    function paint(iconName, text) {
      btn.textContent = ''; btn.appendChild(icon(iconName)); btn.appendChild(el('span', null, text));
    }
    function flash(text) { paint('check', text); setTimeout(function () { paint('copy', LABEL); }, 2200); }
    paint('copy', LABEL);
    btn.addEventListener('click', function () {
      var text = textForAI(data);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { flash('Copied — now paste into any AI'); },
          function () { flash(legacyCopy(text) ? 'Copied — now paste into any AI' : 'Press Ctrl/⌘+C to copy'); });
      } else {
        flash(legacyCopy(text) ? 'Copied — now paste into any AI' : 'Press Ctrl/⌘+C to copy');
      }
    });
    return btn;
  }

  function render() {
    var dataEl = document.getElementById('portal-data');
    if (!dataEl) { console.error('portal-kit: no #portal-data'); return; }
    var data;
    try { data = JSON.parse(dataEl.textContent); }
    catch (e) { console.error('portal-kit: #portal-data JSON invalid:', e); return; }

    if (data.client) document.title = data.client + ' — Project Portal';
    var main = document.querySelector('main') || document.body.appendChild(el('main'));
    main.textContent = '';

    // Header — eyebrow (metadata joined by • ) · heading · subheading. Nothing else.
    var head = el('header', 'head');
    var bits = ['Private'];
    if (data.lastUpdated) bits.push('Updated ' + fmtDate(data.lastUpdated));
    head.appendChild(el('p', 'eyebrow', bits.join(' • ')));
    head.appendChild(el('h1', null, data.client || 'Project Portal'));
    head.appendChild(el('p', 'subtitle', data.subtitle || 'Where your project stands, updated as we go by Hirobius.'));
    main.appendChild(head);

    // Project Status — only the phases in the data (uncommitted phases are simply
    // not included). Each renders as a full card.
    var phases = Array.isArray(data.phases) ? data.phases : [];
    if (phases.length) {
      var statusSec = el('section');
      statusSec.appendChild(secHead('Project Status'));
      var wrap = el('div', 'phases');
      phases.forEach(function (p) {
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
      statusSec.appendChild(wrap);
      main.appendChild(statusSec);
    }

    // Status Updates
    var updates = (Array.isArray(data.updates) ? data.updates.slice() : []).sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });
    if (updates.length) {
      var updSec = el('section');
      updSec.appendChild(secHead('Status Updates', updates.length + (updates.length === 1 ? ' entry' : ' entries')));
      updSec.appendChild(el('p', 'sec-note', 'Newest first. Short notes from Hirobius as the project moves.'));
      var feed = el('ul', 'feed');
      updates.forEach(function (u) {
        var li = el('li', 'entry');
        var t = el('time', null, fmtDate(u.date));
        if (u.date) t.setAttribute('datetime', u.date);
        li.appendChild(t);
        li.appendChild(el('p', null, u.note || ''));
        feed.appendChild(li);
      });
      updSec.appendChild(feed);
      main.appendChild(updSec);
    }

    // How We Work Together (accordions)
    var accs = Array.isArray(data.accordions) ? data.accordions : [];
    if (accs.length) {
      var accSec = el('section');
      accSec.appendChild(secHead('How We Work Together'));
      accs.forEach(function (a) {
        var d = el('details', 'acc');
        var sum = document.createElement('summary');
        sum.appendChild(icon('chevron', 'chev'));
        sum.appendChild(el('h3', null, a.title || ''));
        d.appendChild(sum);
        var body = el('div', 'acc-body md');
        body.innerHTML = mdToHtml(mdSource(a.bodyId));
        d.appendChild(body);
        accSec.appendChild(d);
      });
      main.appendChild(accSec);
    }

    // Documents
    var docs = Array.isArray(data.docs) ? data.docs : [];
    if (docs.length) {
      var docSec = el('section');
      docSec.appendChild(secHead('Documents'));
      docSec.appendChild(el('p', 'sec-note', 'Tap a document to read it here. Everything below is yours to keep.'));
      var dwrap = el('div', 'docs');
      docs.forEach(function (dc) {
        if (dc.bodyId) REF_TITLES[dc.bodyId] = dc.title || 'Document'; // enable [text](#id) links
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
      docSec.appendChild(dwrap);
      main.appendChild(docSec);
    }

    // Footer — Copy-for-AI, email, theme switcher.
    var footer = el('footer');

    var aiWrap = el('div', 'foot-ai');
    aiWrap.appendChild(aiButton(data));
    aiWrap.appendChild(el('p', 'foot-ai-note',
      'Copies this whole portal as text. Paste it into ChatGPT, Claude, or any AI assistant and ask it anything about the plan.'));
    footer.appendChild(aiWrap);

    var email = data.contact && data.contact.email;
    if (email) {
      var fc = el('p', 'foot-contact');
      fc.appendChild(document.createTextNode('Questions? '));
      var fa = el('a', null, email); fa.href = 'mailto:' + email; fc.appendChild(fa);
      footer.appendChild(fc);
    }
    footer.appendChild(themeButton());
    main.appendChild(footer);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();
})();
