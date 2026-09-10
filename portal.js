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
    var m = /^(\\d{4})-(\\d{2})-(\\d{2})$/.exec(iso || '');
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
  function chip(state) { var s = normState(state); return el('span', 'chip ' + s, STATES[s]); }
  function itemList(p) {
    var ul = el('ul', 'items');
    itemsOf(p).forEach(function (it) {
      var li = el('li', 'item ' + normState(it.status));
      li.appendChild(el('span', 'label', it.label || ''));
      li.appendChild(chip(it.status));
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
    meta.appendChild(el('span', 'pill', 'Private'));
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
        h.appendChild(el('h3', null, p.title || ''));
        h.appendChild(chip(p.status));
        card.appendChild(h);
        card.appendChild(el('p', 'phase-prog', doneIn(p) + ' of ' + itemsOf(p).length + ' done'));
        card.appendChild(itemList(p));
        phasesEl.appendChild(card);
      });
      statusSec.appendChild(phasesEl);

      if (upcomingPhases.length) {
        statusSec.appendChild(el('h3', 'coming-h', 'Coming up'));
        var up = el('div', 'upcoming');
        upcomingPhases.forEach(function (p) {
          var d = el('details', 'phase-up');
          if (p.id) d.id = p.id;
          var sum = document.createElement('summary');
          sum.appendChild(el('h3', null, p.title || ''));
          sum.appendChild(chip(p.status));
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
        txt.appendChild(el('h3', null, d.title || 'Document'));
        if (d.description) txt.appendChild(el('p', null, d.description));
        card.appendChild(txt);
        var action = el('div', 'doc-action');
        if (d.file && d.file !== PLACEHOLDER) {
          var a = el('a', 'doc-link', 'Open');
          a.href = d.file;
          a.setAttribute('target', '_blank');
          a.setAttribute('rel', 'noopener');
          if (!/^https?:/i.test(d.file)) a.setAttribute('download', '');
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
