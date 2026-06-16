/*
 * SDS citation parser — pure logic, no DOM or network access.
 *
 * Strategy (addresses the "brittleness" and "coverage" problems):
 *   1. Field extraction is GENERIC. It keys off the labels mandated by the
 *      GHS "Section 1: Identification" block (product name, CAS number,
 *      catalogue/product number, revision date) which every compliant SDS
 *      shares, rather than one regex set per supplier layout.
 *   2. Supplier-specific knowledge (canonical name, location, SDS URL,
 *      support level) lives in a small registry. Adding a supplier is
 *      usually a one-line registry entry, not a new parser.
 *
 * Exposed as an ES module (browser <script type="module"> and Node alike).
 */

/* ------------------------------------------------------------------ helpers */

function cleanup(s) {
  return (s || '').replace(/\s+/g, ' ').trim();
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8,
  sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
  january: 1, february: 2, march: 3, april: 4, june: 6, july: 7,
  august: 8, september: 9, october: 10, november: 11, december: 12,
};
const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function mkDate(y, mo, d) {
  if (!y || !mo || !d || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return {
    display: `${MONTH_NAMES[mo]} ${d}, ${y}`,
    iso: `${y}/${String(mo).padStart(2, '0')}/${String(d).padStart(2, '0')}`,
    year: String(y),
  };
}

// Parse the many date shapes that suppliers use on SDS documents.
function parseAnyDate(raw) {
  raw = (raw || '').trim();
  let m;
  // DD-Month-YYYY / DD Month YYYY  (Thermo Fisher, many EU)
  if ((m = raw.match(/(\d{1,2})[\-\s]([A-Za-z]{3,})[\-\s,]*(\d{4})/))) {
    const mo = MONTHS[m[2].toLowerCase()];
    if (mo) return mkDate(+m[3], mo, +m[1]);
  }
  // Month DD, YYYY
  if ((m = raw.match(/([A-Za-z]{3,})\s+(\d{1,2}),?\s+(\d{4})/))) {
    const mo = MONTHS[m[1].toLowerCase()];
    if (mo) return mkDate(+m[3], mo, +m[2]);
  }
  // YYYY-MM-DD  (ISO; Honeywell and others)
  if ((m = raw.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/))) {
    return mkDate(+m[1], +m[2], +m[3]);
  }
  // DD.MM.YYYY  (Sigma-Aldrich, EU dot format)
  if ((m = raw.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/))) {
    return mkDate(+m[3], +m[2], +m[1]);
  }
  // MM/DD/YYYY (US) with DD/MM disambiguation
  if ((m = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/))) {
    let a = +m[1], b = +m[2], y = +m[3];
    if (y < 100) y += 2000;
    return (a > 12 && b <= 12) ? mkDate(y, b, a) : mkDate(y, a, b);
  }
  // DD-MM-YYYY (numeric hyphen, assume day first / EU)
  if ((m = raw.match(/(\d{1,2})-(\d{1,2})-(\d{4})/))) {
    let a = +m[1], b = +m[2];
    return (a > 12 && b <= 12) ? mkDate(+m[3], b, a) : mkDate(+m[3], b, a);
  }
  return null;
}

/* -------------------------------------------------------------- field parse */

// Labels that mark the value as belonging to a *different* field. Used to
// avoid grabbing the wrong text when a value sits on the line after its label.
const NEXT_LABEL = /^(Product\s*(Number|code)|Brand|CAS|Index|REACH|Recommended|Identified|Relevant|Synonyms|Cat\b|Formula|Molecular|Company|Supplier|1\.\d|SECTION)/i;

function extractName(text) {
  const labels = [
    /Product\s*name\s*[:\-]?\s*(.*)$/i,    // Sigma-Aldrich, Thermo Fisher
    /Trade\s*name\s*[:\-]?\s*(.*)$/i,
    /Material\s*name\s*[:\-]?\s*(.*)$/i,
    /Product\s*identifier\s*[:]\s*(.*)$/i,
  ];
  const lines = text.split('\n');
  for (const re of labels) {
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(re);
      if (!m) continue;
      // Inline value (possibly with a merged following label).
      let v = cleanup(m[1].split(/\s{2,}(?:Product|Brand|CAS|REACH|Index|Recommended|Synonyms|Cat\b)/i)[0]);
      if (v) return v;
      // Otherwise the value sits on the next non-empty, non-label line.
      for (let j = i + 1; j < lines.length && j <= i + 2; j++) {
        const cand = cleanup(lines[j]);
        if (!cand) continue;
        if (NEXT_LABEL.test(cand)) break;
        return cand;
      }
    }
  }
  return '';
}

function extractCAS(text) {
  let m = text.match(/CAS(?:[\s\-]*(?:No|Number|RN|#))?\.?\s*[:.]?\s*(\d{2,7}-\d{2}-\d)/i);
  if (m) return m[1];
  m = text.match(/\b(\d{2,7}-\d{2}-\d)\b/);   // fall back to first CAS-shaped token
  return m ? m[1] : '';
}

function extractNumber(text) {
  const token = '([A-Za-z0-9][A-Za-z0-9.\\-/]*)';
  const labels = [
    new RegExp('Product\\s*Number\\s*[:.]?\\s*' + token, 'i'),
    new RegExp('Cat(?:alog(?:ue)?)?\\s*(?:No|Number|#)\\.?\\s*[:.]?\\s*' + token, 'i'),
    new RegExp('Material\\s*Number\\s*[:.]?\\s*' + token, 'i'),
    new RegExp('Product\\s*[Cc]ode\\s*[:.]?\\s*' + token, 'i'),
    new RegExp('Article\\s*(?:No|Number)\\.?\\s*[:.]?\\s*' + token, 'i'),
    new RegExp('\\bREF\\s*[:.]?\\s*' + token),
    new RegExp('\\bSKU\\s*[:.]?\\s*' + token, 'i'),
  ];
  for (const re of labels) {
    const m = text.match(re);
    if (m) return m[1];
  }
  return '';
}

function extractVersion(text) {
  const num = '([0-9]+(?:\\.[0-9]+)?)';
  const labels = [
    new RegExp('Revision\\s*Number\\.?\\s*[:.]?\\s*' + num, 'i'),
    new RegExp('\\bVersion\\s*[:.]?\\s*' + num, 'i'),
    new RegExp('SDS\\s*(?:Version|Number)\\s*[:.]?\\s*' + num, 'i'),
  ];
  for (const re of labels) {
    const m = text.match(re);
    if (m) return m[1];
  }
  return '';
}

function extractDate(text) {
  const label = /(?:Revision Date|Date of revision|Revised(?:\s*on)?|Reissue[d]? Date|Version Date|Issuing Date|Issue Date|Date of issue|Date of preparation|Preparation Date)\s*[:.]?\s*([0-9A-Za-z][0-9A-Za-z.,\-/ ]{5,40})/ig;
  let m;
  while ((m = label.exec(text))) {
    const d = parseAnyDate(m[1]);
    if (d) return d;
  }
  return null;
}

function extractSupplierName(text) {
  const m = text.match(/(?:Company|Supplier|Manufacturer|Distributor)\s*[:]?\s*([A-Z][A-Za-z0-9 .,&'\-]{2,60})/);
  return m ? cleanup(m[1]) : '';
}

/* ------------------------------------------------------------ supplier data */

function sigmaBrand(text) {
  const t = text.toUpperCase().replace(/\s*-\s*/g, '-');
  if (t.includes('SIGALD')) return 'sigald';
  if (t.includes('SUPELCO')) return 'supelco';
  if (t.includes('SIGMA-ALDRICH') || t.includes('SIAL')) return 'sial';
  if (t.includes('ALDRICH')) return 'aldrich';
  if (t.includes('SIGMA')) return 'sigma';
  return 'sial';
}

// Ordered most-specific first. `support`: 'full' = verified against a real SDS
// in this repo; 'beta' = generic parser + registry entry, not yet verified
// against a real PDF for that vendor.
export const SUPPLIERS = [
  {
    id: 'sigma-aldrich', name: 'Sigma-Aldrich', publisher: 'Sigma-Aldrich',
    place: 'St. Louis, MO', support: 'full',
    markers: ['MILLIPORESIGMA', 'SIGMA-ALDRICH', 'SIGMA -ALDRICH', 'SIGALD', 'SUPELCO', 'ALDRICH', 'SIAL'],
    url: (r, text) => `https://www.sigmaaldrich.com/US/en/sds/${sigmaBrand(text)}/${(r.number || '').toLowerCase()}`,
  },
  {
    id: 'acros', name: 'Acros Organics (Thermo Fisher Scientific)', publisher: 'Thermo Fisher Scientific',
    place: 'Fair Lawn, NJ', support: 'beta', markers: ['ACROS ORGANICS', 'ACROS'],
    url: null,
  },
  {
    id: 'thermo-alfa', name: 'Alfa Aesar (Thermo Fisher Scientific)', publisher: 'Thermo Fisher Scientific',
    place: 'Ward Hill, MA', support: 'full',
    markers: ['ALFA AESAR', 'THERMO FISHER', 'THERMOFISHER', 'FISHER SCIENTIFIC'],
    url: (r) => `https://www.fishersci.com/store/msds?partNumber=${encodeURIComponent(r.number || '')}&productDescription=&countryCode=US&language=en`,
  },
  {
    id: 'tci', name: 'TCI (Tokyo Chemical Industry)', publisher: 'TCI America',
    place: 'Portland, OR', support: 'beta', markers: ['TOKYO CHEMICAL INDUSTRY', 'TCI AMERICA', 'TCI CHEMICALS'],
    url: (r) => r.number ? `https://www.tcichemicals.com/US/en/p/${encodeURIComponent(r.number)}` : '',
  },
  {
    id: 'vwr', name: 'VWR (Avantor)', publisher: 'VWR International',
    place: 'Radnor, PA', support: 'beta', markers: ['VWR', 'AVANTOR'], url: null,
  },
  {
    id: 'honeywell', name: 'Honeywell (Fluka / Riedel-de Haën)', publisher: 'Honeywell International',
    place: 'Charlotte, NC', support: 'beta', markers: ['HONEYWELL', 'FLUKA', 'RIEDEL-DE'], url: null,
  },
  {
    id: 'oakwood', name: 'Oakwood Chemical', publisher: 'Oakwood Products',
    place: 'Estill, SC', support: 'beta', markers: ['OAKWOOD'], url: null,
  },
  {
    id: 'strem', name: 'Strem Chemicals', publisher: 'Strem Chemicals',
    place: 'Newburyport, MA', support: 'beta', markers: ['STREM'], url: null,
  },
  {
    id: 'spectrum', name: 'Spectrum Chemical', publisher: 'Spectrum Chemical',
    place: 'New Brunswick, NJ', support: 'beta', markers: ['SPECTRUM CHEMICAL'], url: null,
  },
  {
    id: 'merck', name: 'Merck (EMD Millipore)', publisher: 'Merck KGaA',
    place: 'Darmstadt, Germany', support: 'beta', markers: ['EMD MILLIPORE', 'MERCK KGAA', 'MERCK'], url: null,
  },
];

export function detectSupplier(text) {
  const t = text.toUpperCase();
  for (const s of SUPPLIERS) {
    if (s.markers.some((mk) => t.includes(mk))) return s;
  }
  return null;
}

// Re-parse a user-edited date string back into {display, iso, year}.
export function parseDate(raw) {
  return parseAnyDate(raw);
}

/* ----------------------------------------------------------------- assemble */

export function parseSDS(text) {
  text = text || '';
  const warnings = [];
  const name = extractName(text);
  const cas = extractCAS(text);
  const number = extractNumber(text);
  const version = extractVersion(text);
  const date = extractDate(text);

  if (!name) warnings.push('Could not find the product name.');
  if (!cas) warnings.push('Could not find a CAS number.');
  if (!number) warnings.push('Could not find a catalogue/product number.');
  if (!date) warnings.push('Could not find a revision date.');

  const record = {
    name, cas, number, version,
    dateDisplay: date ? date.display : '',
    dateISO: date ? date.iso : '',
    year: date ? date.year : '',
    supplierId: '', supplierName: '', publisher: '', place: '',
    support: 'unsupported', url: '', warnings,
  };

  const supplier = detectSupplier(text);
  if (supplier) {
    record.supplierId = supplier.id;
    record.supplierName = supplier.name;
    record.publisher = supplier.publisher;
    record.place = supplier.place;
    record.support = supplier.support;
    try { record.url = supplier.url ? supplier.url({ number }, text) : ''; } catch (e) { record.url = ''; }
    if (!record.url) warnings.push(`Supplier recognised (${supplier.name}); add the SDS URL manually.`);
  } else {
    record.supplierName = extractSupplierName(text);
    record.publisher = record.supplierName;
    warnings.push('Supplier not recognised — please fill in supplier, location and URL.');
  }
  return record;
}

/* ----------------------------------------------------------------- emitters */

// ACS reference. Returns the full string; the chemical name is always the
// leading substring so the UI can italicise it with `s.slice(name.length)`.
export function formatACS(record, accessed) {
  accessed = accessed || todayISO();
  const a = record.name + (record.cas ? ` (CAS RN: ${record.cas})` : '');
  const b = [record.number, record.version ? `Rev. ${record.version}` : '']
    .filter(Boolean).join(', ');
  let c = '';
  if (record.supplierName) {
    c = record.supplierName + ':';
    const loc = [record.place, record.dateDisplay].filter(Boolean).join(', ');
    if (loc) c += ' ' + loc + '.';
  }
  const groups = [a, b, c].filter(Boolean);
  let s = groups.join('; ');
  if (record.url) s += ' ' + record.url;
  s += ` (accessed ${accessed}).`;
  return s;
}

export function formatRIS(record, accessed) {
  accessed = accessed || todayISO();
  const fields = [['TY', 'RPRT'], ['TI', `${record.name}: Safety Data Sheet`]];
  if (record.publisher) { fields.push(['AU', record.publisher]); fields.push(['PB', record.publisher]); }
  if (record.place) fields.push(['CY', record.place]);
  if (record.year) fields.push(['PY', record.year]);
  if (record.dateISO) fields.push(['DA', record.dateISO]);
  if (record.version) fields.push(['ET', `Rev. ${record.version}`]);
  if (record.number) fields.push(['M1', record.number]);
  if (record.url) fields.push(['UR', record.url]);
  if (record.cas) {
    fields.push(['KW', `CAS RN ${record.cas}`]);
    fields.push(['N1', `CAS Registry Number: ${record.cas}. Accessed ${accessed}.`]);
  }
  fields.push(['ER', '']);
  return fields.map(([t, v]) => `${t}  - ${v}`).join('\r\n') + '\r\n';
}
