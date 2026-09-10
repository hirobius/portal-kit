/* Hirobius Portal Kit — shared renderer for client status portals.
 *
 * A client page needs only: this script, the theme.css stylesheet, and a
 * <script type="application/json" id="portal-data"> block holding its content.
 * This file builds the whole page (header + Project Status + Status Updates +
 * Documents) from that data, so structure and behavior are shared too — edit
 * here, redeploy portal-kit, and every linked page updates on next load.
 *
 * Data shape (see any client page's #portal-data):
 *   { client, lastUpdated, phases:[{id,title,status,items:[{label,status}]}],
 *     updates:[{date,note}], documents:[{title,description,file}] }
 *   status is one of: "done" | "in-progress" | "upcoming".
 */
(function () {
  var STATES = { 'done': 'Done', 'in-progress': 'In progress', 'upcoming': 'Upcoming' };
  var PLACEHOLDER = 'REPLACE_WITH_PROPOSAL_FILE_PATH';

  function normState(s) { return STATES[s] ? s : 'upcoming'; }
  function itemsOf(p) { return Array.isArray(p.items) ? p.items : []; }
  function doneIn(p) { return itemsOf(p).filter(function (i) { return normState(i.status) === 'done'; }).length; }
  function isUpcomingPhase(p) {
    return normState(p.status) === 'upcoming' &&
      itemsOf(p).every(function (i) { return normState(i.status) === 'upcoming'; });
  }
  function fmtDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!m) return iso || '';
    return new Date(+m[1], +m[2] - 1, +m[3])
      .toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // Inline Lucide icon subset (no runtime dependency). Sized to text via .icon.
  var SVGNS = 'http://www.w3.org/2000/svg';
  var ICONS = {
    chevron:  ['m9 18 6-6-6-6'],
    file:     ['M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z', 'M14 2v4a2 2 0 0 0 2 2h4', 'M16 13H8', 'M16 17H8', 'M10 9H8'],
    external: ['M7 7h10v10', 'M7 17 17 7'],
    download: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'm7 10 5 5 5-5', 'M12 15V3']
  };
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

  // Monochrome status checkbox: done = checked, in-progress = indeterminate
  // (dash), upcoming = empty. Reads as a plain checklist; no color coding.
  function checkbox(state) {
    var s = normState(state);
    var box = el('span', 'cbx cbx-' + s);
    box.setAttribute('role', 'img');
    box.setAttribute('aria-label', STATES[s]);
    var svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', '0 0 20 20');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('class', 'cbx-svg');
    var rect = document.createElementNS(SVGNS, 'rect');
    rect.setAttribute('x', '2.5'); rect.setAttribute('y', '2.5');
    rect.setAttribute('width', '15'); rect.setAttribute('height', '15'); rect.setAttribute('rx', '4');
    svg.appendChild(rect);
    var mark = null;
    if (s === 'done') mark = 'M5.5 10.5l3 3 6-6.5';
    else if (s === 'in-progress') mark = 'M6 10h8';
    if (mark) {
      var p = document.createElementNS(SVGNS, 'path');
      p.setAttribute('d', mark); p.setAttribute('class', 'cbx-mark');
      svg.appendChild(p);
    }
    box.appendChild(svg);
    return box;
  }

  // A phase's rollup state from its items: all done = done; some done or any in
  // progress = in-progress (indeterminate); otherwise upcoming.
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
  function secHead(title, countText) {
    var head = el('div', 'sec-head');
    head.appendChild(el('h2', null, title));
    if (countText != null) head.appendChild(el('span', 'count', countText));
    return head;
  }

  function render() {
    var dataEl = document.getElementById('portal-data');
    if (!dataEl) { console.error('portal-kit: no #portal-data block found'); return; }
    var data;
    try { data = JSON.parse(dataEl.textContent); }
    catch (e) { console.error('portal-kit: #portal-data JSON is invalid:', e); return; }

    if (data.client) document.title = data.client + ' — Project Portal';

    var main = document.querySelector('main') || document.body.appendChild(el('main'));
    main.textContent = '';

    // Header
    var head = el('header', 'head');
    head.appendChild(el('h1', null, data.client || 'Project Portal'));
    var meta = el('div', 'head-meta');
    meta.appendChild(el('span', 'tag', 'Private'));
    if (data.lastUpdated) meta.appendChild(el('span', 'meta', 'Last updated ' + fmtDate(data.lastUpdated)));
    head.appendChild(meta);
    head.appendChild(el('p', 'subtitle', data.subtitle || 'Where your project stands, updated as we go by Hirobius.'));
    var prog = el('p', 'progress');
    head.appendChild(prog);
    main.appendChild(head);

    // Project Status — active phases prominent, future phases recessed
    var phases = Array.isArray(data.phases) ? data.phases : [];
    var currentPhases = phases.filter(function (p) { return !isUpcomingPhase(p); });
    var upcomingPhases = phases.filter(isUpcomingPhase);
    var activePhase = currentPhases[currentPhases.length - 1];
    if (activePhase) {
      prog.textContent = 'Active now: ' + (activePhase.title || '') +
        ' · ' + doneIn(activePhase) + ' of ' + itemsOf(activePhase).length + ' steps done';
    } else if (phases.length) {
      prog.textContent = 'Getting started';
    }

    if (phases.length) {
      var statusSec = el('section');
      statusSec.appendChild(secHead('Project Status'));
      var note = el('p', 'sec-note');
      note.innerHTML = "What's happening now is up top. Everything is marked " +
        '<b>Done</b>, <b>In progress</b>, or <b>Upcoming</b>.';
      statusSec.appendChild(note);

      var phasesEl = el('div', 'phases');
      currentPhases.forEach(function (p) {
        var card = el('div', 'phase');
        if (p.id) card.id = p.id;
        var h = el('div', 'phase-head');
        h.appendChild(checkbox(phaseState(p)));
        h.appendChild(el('h3', null, p.title || ''));
        card.appendChild(h);
        card.appendChild(el('p', 'phase-prog', doneIn(p) + ' of ' + itemsOf(p).length + ' done'));
        card.appendChild(itemList(p));
        phasesEl.appendChild(card);
      });
      statusSec.appendChild(phasesEl);

      if (upcomingPhases.length) {
        statusSec.appendChild(el('h3', 'coming-h', 'Coming up'));
        var up = el('div', 'coming-list');
        upcomingPhases.forEach(function (p) {
          var d = el('details', 'phase-up');
          if (p.id) d.id = p.id;
          var sum = document.createElement('summary');
          sum.appendChild(icon('chevron', 'chev'));
          sum.appendChild(checkbox(phaseState(p)));
          sum.appendChild(el('h3', null, p.title || ''));
          sum.appendChild(el('span', 'phase-prog', doneIn(p) + ' of ' + itemsOf(p).length + ' done'));
          d.appendChild(sum);
          d.appendChild(itemList(p));
          up.appendChild(d);
        });
        statusSec.appendChild(up);
      }
      main.appendChild(statusSec);
    }

    // Status Updates — reverse-chronological
    var updates = (Array.isArray(data.updates) ? data.updates.slice() : [])
      .sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });
    var updSec = el('section');
    updSec.appendChild(secHead('Status Updates', updates.length + (updates.length === 1 ? ' entry' : ' entries')));
    updSec.appendChild(el('p', 'sec-note', 'Newest first. Short notes from Hirobius as the project moves.'));
    var feed = el('ul', 'feed');
    if (!updates.length) {
      feed.appendChild(el('li', 'empty', 'No updates yet.'));
    } else {
      updates.forEach(function (u) {
        var li = el('li', 'entry');
        var t = el('time', null, fmtDate(u.date));
        if (u.date) t.setAttribute('datetime', u.date);
        li.appendChild(t);
        li.appendChild(el('p', null, u.note || ''));
        feed.appendChild(li);
      });
    }
    updSec.appendChild(feed);
    main.appendChild(updSec);

    // Documents
    var docs = Array.isArray(data.documents) ? data.documents : [];
    var docSec = el('section');
    docSec.appendChild(secHead('Documents'));
    docSec.appendChild(el('p', 'sec-note', 'Shared documents for this project.'));
    var docsEl = el('div', 'docs');
    if (!docs.length) {
      docsEl.appendChild(el('p', 'empty', 'No documents yet.'));
    } else {
      docs.forEach(function (d) {
        var card = el('div', 'doc');
        var txt = el('div', 'txt');
        var dh = el('h3');
        dh.appendChild(icon('file', 'doc-ico'));
        dh.appendChild(document.createTextNode(d.title || 'Document'));
        txt.appendChild(dh);
        if (d.description) txt.appendChild(el('p', null, d.description));
        card.appendChild(txt);
        var action = el('div', 'doc-action');
        if (d.file && d.file !== PLACEHOLDER) {
          var isUrl = /^https?:/i.test(d.file);
          var a = el('a', 'doc-link');
          a.href = d.file;
          a.setAttribute('target', '_blank');
          a.setAttribute('rel', 'noopener');
          if (!isUrl) a.setAttribute('download', '');
          a.appendChild(document.createTextNode('Open'));
          a.appendChild(icon(isUrl ? 'external' : 'download'));
          action.appendChild(a);
        } else {
          action.appendChild(el('span', 'doc-pending', 'Awaiting file'));
        }
        card.appendChild(action);
        docsEl.appendChild(card);
      });
    }
    docSec.appendChild(docsEl);
    main.appendChild(docSec);

    // Footer
    var footer = el('footer');
    footer.appendChild(el('p', null,
      (data.client || 'This portal') + ' · Private project portal maintained by Hirobius. Do not share the link or password.'));
    main.appendChild(footer);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
