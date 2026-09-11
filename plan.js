/* Hirobius Portal Kit — renderer for a "Plan & Resources" page.
 *
 * A plan page needs only: this script, theme.css, a JSON metadata block
 * (id="plan-data"), and one <script type="text/markdown" id="..."> block per
 * accordion body and per document. This file builds the header + nav, the
 * accordion sections, the document cards (which open a full-screen reader that
 * renders the markdown), and an optional contact block.
 *
 * plan-data shape:
 *   { client, lastUpdated, subtitle,
 *     nav: [{label, href, current}],
 *     intro: "one-line page intro",
 *     accordions: [{title, bodyId}],
 *     docs: [{title, desc, bodyId}],
 *     contact: {name, note, phones:[{label,value}], email} }
 */
(function () {
  var SVGNS = 'http://www.w3.org/2000/svg';
  var ICONS = {
    chevron: ['m9 18 6-6-6-6'],
    file: ['M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z', 'M14 2v4a2 2 0 0 0 2 2h4', 'M16 13H8', 'M16 17H8', 'M10 9H8'],
    close: ['M18 6 6 18', 'm6 6 12 12']
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
  function mdSource(id) {
    var n = document.getElementById(id);
    return n ? n.textContent : '';
  }

  /* --- Minimal, safe Markdown -> HTML (subset: headings, bold, italic, code,
     links, unordered/ordered lists, tables, hr, paragraphs). Content is escaped
     before any formatting so it can't inject markup. --- */
  function mdToHtml(src) {
    function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    function inline(s) {
      s = esc(s);
      s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
      s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener">$1</a>');
      s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      s = s.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
      return s;
    }
    var lines = src.replace(/\r/g, '').replace(/^\n+|\n+$/g, '').split('\n');
    var out = [], i = 0;
    function isTableSep(s) { return /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(s) && s.indexOf('-') > -1; }
    function cells(row) {
      return row.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(function (c) { return inline(c.trim()); });
    }
    while (i < lines.length) {
      var line = lines[i];
      if (/^\s*$/.test(line)) { i++; continue; }
      var h = /^(#{1,6})\s+(.*)$/.exec(line);
      if (h) { var lv = h[1].length; out.push('<h' + lv + '>' + inline(h[2]) + '</h' + lv + '>'); i++; continue; }
      if (/^---+\s*$/.test(line)) { out.push('<hr>'); i++; continue; }
      // table: current line has a pipe and the next line is a separator row
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
      // paragraph: gather until blank / block start
      var para = [line]; i++;
      while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^(#{1,6}\s|[-*]\s|\d+\.\s|---+\s*$)/.test(lines[i]) &&
             !(lines[i].indexOf('|') > -1 && i + 1 < lines.length && isTableSep(lines[i + 1]))) {
        para.push(lines[i]); i++;
      }
      out.push('<p>' + inline(para.join(' ')) + '</p>');
    }
    return out.join('\n');
  }

  /* --- Full-screen document reader --- */
  var overlay = null;
  function closeReader() { if (overlay) { overlay.remove(); overlay = null; document.body.style.overflow = ''; } }
  function openReader(title, bodyId) {
    closeReader();
    overlay = el('div', 'reader-overlay');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', title);
    var bar = el('div', 'reader-bar');
    bar.appendChild(el('div', 'reader-title', title));
    var close = el('button', 'reader-close');
    close.setAttribute('aria-label', 'Close');
    close.appendChild(icon('close'));
    close.addEventListener('click', closeReader);
    bar.appendChild(close);
    var body = el('div', 'reader-body');
    var article = el('article', 'md');
    article.innerHTML = mdToHtml(mdSource(bodyId));
    body.appendChild(article);
    overlay.appendChild(bar);
    overlay.appendChild(body);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeReader(); });
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    close.focus();
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeReader(); });

  function render() {
    var dataEl = document.getElementById('plan-data');
    if (!dataEl) { console.error('plan-kit: no #plan-data'); return; }
    var data;
    try { data = JSON.parse(dataEl.textContent); }
    catch (e) { console.error('plan-kit: #plan-data JSON invalid:', e); return; }

    if (data.client) document.title = data.client + ' — Your Plan & Resources';
    var main = document.querySelector('main') || document.body.appendChild(el('main'));
    main.textContent = '';

    // Header + nav
    var head = el('header', 'head');
    head.appendChild(el('h1', null, data.client || 'Your Plan & Resources'));
    var meta = el('div', 'head-meta');
    meta.appendChild(el('span', 'tag', 'Private'));
    if (data.lastUpdated) meta.appendChild(el('span', 'meta', 'Last updated ' + fmtDate(data.lastUpdated)));
    head.appendChild(meta);
    if (data.subtitle) head.appendChild(el('p', 'subtitle', data.subtitle));
    main.appendChild(head);
    if (Array.isArray(data.nav) && data.nav.length) main.appendChild(buildNav(data.nav));

    // Accordions
    if (Array.isArray(data.accordions) && data.accordions.length) {
      var accSec = el('section');
      accSec.appendChild(secHead('How We Work Together'));
      data.accordions.forEach(function (a) {
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
    if (Array.isArray(data.docs) && data.docs.length) {
      var docSec = el('section');
      docSec.appendChild(secHead('Documents'));
      docSec.appendChild(el('p', 'sec-note', 'Tap a document to read it here. Everything below is yours to keep.'));
      var wrap = el('div', 'docs');
      data.docs.forEach(function (dc) {
        var card = el('button', 'doc doc-open');
        card.type = 'button';
        var txt = el('div', 'txt');
        var h = el('h3');
        h.appendChild(icon('file', 'doc-ico'));
        h.appendChild(document.createTextNode(dc.title || 'Document'));
        txt.appendChild(h);
        if (dc.desc) txt.appendChild(el('p', null, dc.desc));
        card.appendChild(txt);
        card.appendChild(el('span', 'doc-link', 'Read'));
        card.addEventListener('click', function () { openReader(dc.title || 'Document', dc.bodyId); });
        wrap.appendChild(card);
      });
      docSec.appendChild(wrap);
      main.appendChild(docSec);
    }

    // Contact
    if (data.contact) {
      var c = data.contact;
      var cSec = el('section');
      cSec.appendChild(secHead('Contact'));
      var box = el('div', 'contact');
      if (c.name) box.appendChild(el('p', 'contact-name', c.name));
      if (c.note) box.appendChild(el('p', 'contact-note', c.note));
      var list = el('ul', 'contact-list');
      (c.phones || []).forEach(function (ph) {
        var li = el('li');
        li.appendChild(el('span', 'k', ph.label || 'Phone'));
        li.appendChild(el('span', 'v', ph.value || ''));
        list.appendChild(li);
      });
      if (c.email) {
        var li2 = el('li');
        li2.appendChild(el('span', 'k', 'Email'));
        var a = el('a', 'v', c.email); a.href = 'mailto:' + c.email;
        li2.appendChild(a);
        list.appendChild(li2);
      }
      box.appendChild(list);
      cSec.appendChild(box);
      main.appendChild(cSec);
    }

    var footer = el('footer');
    footer.appendChild(el('p', null,
      (data.client || 'This portal') + ' · Private project portal maintained by Hirobius. Do not share the link or password.'));
    main.appendChild(footer);
  }

  function buildNav(items) {
    var nav = el('nav', 'portal-nav');
    items.forEach(function (it) {
      var a = el('a', 'nav-link' + (it.current ? ' current' : ''), it.label || '');
      if (it.href) a.href = it.href;
      if (it.current) a.setAttribute('aria-current', 'page');
      nav.appendChild(a);
    });
    return nav;
  }
  function secHead(title) { var h = el('div', 'sec-head'); h.appendChild(el('h2', null, title)); return h; }
  function fmtDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!m) return iso || '';
    return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();
})();
