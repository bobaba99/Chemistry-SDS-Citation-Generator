// Browser glue: PDF text extraction (pdf.js) + parser.js + editable UI + exports.
import * as pdfjsLib from 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.7.76/build/pdf.min.mjs';
import { parseSDS, formatACS, formatRIS, parseDate, todayISO, SUPPLIERS } from './parser.js';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.7.76/build/pdf.worker.min.mjs';

const REPO = 'bobaba99/Chemistry-SDS-Citation-Generator';

const $ = (sel) => document.querySelector(sel);
const records = [];                 // editable citation records, in add order
let nextId = 1;

/* --------------------------------------------------------------- PDF -> text */

// Reconstruct text from pdf.js glyph items. pdf.js positions each fragment
// individually, so we group items into rows by y and only insert a space when
// the horizontal gap is wide enough to be a real space (a plain join inserts
// spurious spaces, e.g. "74 - 96 - 4"). parser.js is line-oriented.
async function firstPageText(arrayBuffer) {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  const content = await page.getTextContent();
  const rows = [];
  for (const it of content.items) {
    if (it.str === undefined) continue;
    const x = it.transform[4], y = it.transform[5];
    let row = rows.find((r) => Math.abs(r.y - y) <= 3);
    if (!row) { row = { y, parts: [] }; rows.push(row); }
    row.parts.push({ x, w: it.width || 0, s: it.str, h: Math.abs(it.transform[3]) || 10 });
  }
  rows.sort((a, b) => b.y - a.y);
  return rows.map((r) => {
    r.parts.sort((a, b) => a.x - b.x);
    let out = '', prevEnd = null, prevH = 10;
    for (const p of r.parts) {
      if (prevEnd !== null && (p.x - prevEnd) > prevH * 0.25 && !/\s$/.test(out) && !/^\s/.test(p.s)) {
        out += ' ';
      }
      out += p.s; prevEnd = p.x + p.w; prevH = p.h;
    }
    return out.replace(/\s+/g, ' ').trim();
  }).join('\n');
}

async function addFromBuffer(buf, sourceLabel) {
  const text = await firstPageText(buf);
  const rec = parseSDS(text);
  rec._id = nextId++;
  rec._source = sourceLabel || '';
  records.push(rec);
  render();
}

/* ----------------------------------------------------------------- handlers */

function setStatus(msg, isError) {
  const el = $('#status');
  el.textContent = msg || '';
  el.classList.toggle('error', !!isError);
}

async function handleFiles(fileList) {
  const files = [...fileList].filter((f) => /\.pdf$/i.test(f.name) || f.type === 'application/pdf');
  if (!files.length) { setStatus('Please choose PDF files.', true); return; }
  setStatus(`Reading ${files.length} file(s)…`);
  for (const f of files) {
    try {
      await addFromBuffer(await f.arrayBuffer(), f.name);
    } catch (e) {
      setStatus(`Could not read ${f.name}: ${e.message}`, true);
    }
  }
  setStatus(`Done. ${records.length} citation(s) ready.`);
}

async function handleLink(url) {
  setStatus('Fetching link…');
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const buf = await resp.arrayBuffer();
    await addFromBuffer(buf, url);
    setStatus(`Done. ${records.length} citation(s) ready.`);
  } catch (e) {
    setStatus(
      `Couldn't fetch that link directly — most suppliers block cross-site downloads (${e.message}). ` +
      `Download the PDF and drop it above instead.`, true);
  }
}

/* -------------------------------------------------------------------- render */

function escapeHtml(s) {
  return (s || '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function acsPreviewHtml(rec) {
  const full = formatACS(rec);
  const rest = rec.name && full.startsWith(rec.name) ? full.slice(rec.name.length) : full;
  return `<span class="pname">${escapeHtml(rec.name)}</span>${escapeHtml(rest)}`;
}

const FIELD_DEFS = [
  ['name', 'Chemical name', true],
  ['cas', 'CAS RN', false],
  ['number', 'Catalogue / product no.', false],
  ['version', 'Revision', false],
  ['dateDisplay', 'Date (e.g. October 24, 2019)', false],
  ['supplierName', 'Supplier', false],
  ['place', 'Location (City, ST)', false],
  ['url', 'SDS URL', true],
];

function render() {
  const results = $('#results');
  results.hidden = records.length === 0;
  $('#count').textContent = records.length ? `(${records.length})` : '';

  const cards = $('#cards');
  cards.innerHTML = '';
  records.forEach((rec, idx) => {
    const li = document.createElement('li');
    li.className = 'card';
    const support = rec.support || 'unsupported';
    li.innerHTML = `
      <div class="card-head">
        <span class="card-num">${idx + 1}</span>
        <span class="title">${escapeHtml(rec.name || '(unnamed)')}</span>
        <span class="badge ${support}">${support}</span>
      </div>
      <div class="preview" data-preview></div>
      <div class="fields">
        ${FIELD_DEFS.map(([key, label, wide]) => `
          <label class="${wide ? 'wide' : ''}">${label}
            <input type="text" data-field="${key}" value="${escapeHtml(rec[key] || '')}">
          </label>`).join('')}
      </div>
      ${rec.warnings && rec.warnings.length ? `
        <div class="warnings">⚠️ Check these:
          <ul>${rec.warnings.map((w) => `<li>${escapeHtml(w)}</li>`).join('')}</ul>
        </div>` : ''}
      <div class="card-actions">
        <button type="button" class="small" data-copy>Copy this citation</button>
        <button type="button" class="small ghost" data-remove>Remove</button>
      </div>`;

    li.querySelector('[data-preview]').innerHTML = acsPreviewHtml(rec);

    li.querySelectorAll('input[data-field]').forEach((input) => {
      input.addEventListener('input', () => {
        const key = input.dataset.field;
        rec[key] = input.value;
        if (key === 'dateDisplay') {
          const d = parseDate(input.value);
          if (d) { rec.dateISO = d.iso; rec.year = d.year; }
        }
        li.querySelector('[data-preview]').innerHTML = acsPreviewHtml(rec);
        if (key === 'name') li.querySelector('.title').textContent = rec.name || '(unnamed)';
      });
    });
    li.querySelector('[data-copy]').addEventListener('click', () => copyText(formatACS(rec)));
    li.querySelector('[data-remove]').addEventListener('click', () => {
      const i = records.indexOf(rec);
      if (i >= 0) records.splice(i, 1);
      render();
    });

    cards.appendChild(li);
  });
}

/* ------------------------------------------------------------------ exports */

const byName = (a, b) => (a.name || '').localeCompare(b.name || '');

function copyText(text) {
  navigator.clipboard?.writeText(text).then(
    () => setStatus('Copied to clipboard.'),
    () => setStatus('Copy failed — select and copy manually.', true));
}

function acsList() {
  return records.slice().sort(byName)
    .map((r, i) => `${i + 1}. ${formatACS(r)}`).join('\n');
}

function download(filename, text, mime) {
  const blob = new Blob([text], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

function risFile() {
  return records.slice().sort(byName).map((r) => formatRIS(r)).join('\r\n');
}

// Word-compatible HTML (.doc) with italic chemical names and a numbered list.
function wordFile() {
  const items = records.slice().sort(byName).map((r) => {
    const full = formatACS(r);
    const rest = r.name && full.startsWith(r.name) ? full.slice(r.name.length) : full;
    return `<p style="margin:0 0 8pt"><i>${escapeHtml(r.name)}</i>${escapeHtml(rest)}</p>`;
  }).join('\n');
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" ` +
    `xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8">` +
    `<title>SDS Citations</title></head><body>${items}</body></html>`;
}

/* ----------------------------------------------------------- coverage panel */

function renderCoverage() {
  const groups = { full: [], beta: [] };
  for (const s of SUPPLIERS) (groups[s.support] || (groups[s.support] = [])).push(s.name);
  $('#coverageLists').innerHTML = `
    <div>
      <h3>✅ Full (verified)</h3>
      <ul>${groups.full.map((n) => `<li>${escapeHtml(n)}</li>`).join('')}</ul>
    </div>
    <div>
      <h3>🧪 Beta (parsed, verify)</h3>
      <ul>${groups.beta.map((n) => `<li>${escapeHtml(n)}</li>`).join('')}</ul>
    </div>`;

  const title = encodeURIComponent('Supplier request: <supplier name>');
  const body = encodeURIComponent(
    'Supplier name:\n' +
    'Link to an example SDS PDF (or attach one):\n' +
    'Anything that looked wrong in the generated citation:\n');
  $('#requestSupplier').href =
    `https://github.com/${REPO}/issues/new?title=${title}&body=${body}&labels=supplier-request`;
}

/* --------------------------------------------------------------------- wire */

function init() {
  const dz = $('#dropzone');
  const fileInput = $('#fileInput');
  dz.addEventListener('click', () => fileInput.click());
  dz.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
  });
  fileInput.addEventListener('change', () => handleFiles(fileInput.files));
  ['dragenter', 'dragover'].forEach((ev) =>
    dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach((ev) =>
    dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('drag'); }));
  dz.addEventListener('drop', (e) => handleFiles(e.dataTransfer.files));

  $('#linkForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const url = $('#linkInput').value.trim();
    if (url) handleLink(url);
  });

  $('#copyAcs').addEventListener('click', () => copyText(acsList()));
  $('#downloadRis').addEventListener('click', () =>
    download('sds-citations.ris', risFile(), 'application/x-research-info-systems'));
  $('#downloadDoc').addEventListener('click', () =>
    download('sds-citations.doc', wordFile(), 'application/msword'));
  $('#clearAll').addEventListener('click', () => { records.length = 0; render(); setStatus(''); });

  renderCoverage();
}

init();
