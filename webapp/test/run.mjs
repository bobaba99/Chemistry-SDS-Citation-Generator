// Node test harness for parser.js. Run: node webapp/test/run.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseSDS, formatACS, formatRIS } from '../parser.js';

const here = dirname(fileURLToPath(import.meta.url));
const fix = (name) => readFileSync(join(here, 'fixtures', name + '.txt'), 'utf8');

let pass = 0, fail = 0;
function check(label, got, want) {
  const ok = got === want;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}: ${JSON.stringify(got)}` +
    (ok ? '' : `  (expected ${JSON.stringify(want)})`));
  ok ? pass++ : fail++;
}

// Expected key fields for the seven real sample SDS PDFs.
const expected = {
  'bromoethane-sds': { name: 'Bromoethane', cas: '74-96-4', number: '239607', version: '6.0', dateDisplay: 'October 24, 2019', supplierName: 'Sigma-Aldrich', support: 'full' },
  'mercury-ii-acetate-msds': { name: 'Mercury(II) acetate', cas: '1600-27-7', number: '176109', version: '6.0', dateDisplay: 'May 9, 2019', supplierName: 'Sigma-Aldrich', support: 'full' },
  'sodium-hydroxide-sds': { name: 'Sodium hydroxide', cas: '1310-73-2', number: 'S8045', version: '6.2', dateDisplay: 'January 9, 2020', supplierName: 'Sigma-Aldrich', support: 'full' },
  'mercury-ii-acetate-sds': { name: 'Mercury(II) acetate', cas: '1600-27-7', number: 'A12478', version: '2', dateDisplay: 'February 14, 2020', supplierName: 'Alfa Aesar (Thermo Fisher Scientific)', support: 'full' },
  'methanol-sds': { name: 'Methanol', cas: '67-56-1', number: 'L13255', version: '2', dateDisplay: 'February 14, 2020', supplierName: 'Alfa Aesar (Thermo Fisher Scientific)', support: 'full' },
  'pyridine-hydrobromide-perbromide-sds': { name: 'Pyridine hydrobromide perbromide, tech. 90%', cas: '39416-48-3', number: 'A15684', version: '2', dateDisplay: 'February 19, 2020', supplierName: 'Alfa Aesar (Thermo Fisher Scientific)', support: 'full' },
  'sodium-hydrogen-carbonate-sds': { name: 'Sodium hydrogen carbonate', cas: '144-55-8', number: '14707', version: '2', dateDisplay: 'February 14, 2020', supplierName: 'Alfa Aesar (Thermo Fisher Scientific)', support: 'full' },
};

console.log('=== Real sample SDS fixtures ===');
for (const [slug, want] of Object.entries(expected)) {
  console.log('\n' + slug);
  const rec = parseSDS(fix(slug));
  for (const k of Object.keys(want)) check(k, rec[k], want[k]);
  console.log('  ACS: ' + formatACS(rec, '2026-06-16'));
  console.log('  URL: ' + rec.url);
}

// Spot-check URL formats and RIS validity on one of each supplier family.
console.log('\n=== Generated artefacts ===');
const sig = parseSDS(fix('bromoethane-sds'));
check('Sigma URL', sig.url, 'https://www.sigmaaldrich.com/US/en/sds/sial/239607');
const sigald = parseSDS(fix('sodium-hydroxide-sds'));
check('SIGALD URL', sigald.url, 'https://www.sigmaaldrich.com/US/en/sds/sigald/s8045');
const th = parseSDS(fix('methanol-sds'));
check('Thermo URL', th.url, 'https://www.fishersci.com/store/msds?partNumber=L13255&productDescription=&countryCode=US&language=en');
const ris = formatRIS(sig, '2026-06-16');
check('RIS starts TY RPRT', ris.startsWith('TY  - RPRT\r\n'), true);
check('RIS ends ER', ris.trimEnd().endsWith('ER  -'), true);
check('RIS has DA', ris.includes('DA  - 2019/10/24'), true);

// Other suppliers: must be recognised OR cleanly flagged, never crash.
console.log('\n=== Other-supplier behaviour ===');
const others = {
  'TCI': 'SAFETY DATA SHEET\nProduct Name: Benzaldehyde\nProduct Number: B0013\nCAS RN: 100-52-7\nManufacturer Tokyo Chemical Industry Co., Ltd.\nRevision Date 03/15/2021\n',
  'Honeywell': 'SAFETY DATA SHEET\nProduct name: Acetonitrile\nProduct number: 34851\nCAS-No.: 75-05-8\nManufacturer Honeywell\nVersion 1.5\nRevision Date 2020-08-11\n',
  'Oakwood': 'SAFETY DATA SHEET\nProduct Name 4-Bromotoluene\nProduct Number 003478\nCAS Number 106-38-7\nManufacturer Oakwood Products Inc\nRevision Date: 01/20/2022\n',
  'Merck EU': 'SAFETY DATA SHEET\n1.1 Product identifiers\nProduct name : Toluene\nProduct Number : 1.08325\nCAS-No. : 108-88-3\nVersion 12.3\nRevision Date 15.03.2021\nCompany : Merck KGaA  64271 Darmstadt  GERMANY\n',
  'Unknown': 'SAFETY DATA SHEET\nProduct name: Mystery compound\nCAS-No.: 50-00-0\nRevision Date 2021-01-01\n',
};
for (const [label, text] of Object.entries(others)) {
  const rec = parseSDS(text);
  console.log(`\n${label}: supplier=${JSON.stringify(rec.supplierName)} support=${rec.support} name=${JSON.stringify(rec.name)} cas=${JSON.stringify(rec.cas)} date=${JSON.stringify(rec.dateDisplay)}`);
  console.log('  ACS: ' + formatACS(rec, '2026-06-16'));
}

console.log(`\n=== ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
