// Optional, best-effort name validation via the free PubChem PUG-REST API.
// Runs in the browser; PubChem returns permissive CORS headers. All calls are
// opt-in and fail soft — if the service is unreachable the app keeps working.

const PUG = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug';

// Given a CAS Registry Number, return { cid, name, iupac } from PubChem, or
// null if nothing matches. Throws only on network/HTTP errors (handled by UI).
export async function lookupByCAS(cas) {
  cas = (cas || '').trim();
  if (!/^\d{2,7}-\d{2}-\d$/.test(cas)) return null;

  const cidResp = await fetch(`${PUG}/compound/xref/RN/${encodeURIComponent(cas)}/cids/JSON`);
  if (cidResp.status === 404) return null;
  if (!cidResp.ok) throw new Error('PubChem HTTP ' + cidResp.status);
  const cid = (await cidResp.json())?.IdentifierList?.CID?.[0];
  if (!cid) return null;

  const propResp = await fetch(`${PUG}/compound/cid/${cid}/property/Title,IUPACName/JSON`);
  if (!propResp.ok) throw new Error('PubChem HTTP ' + propResp.status);
  const p = (await propResp.json())?.PropertyTable?.Properties?.[0] || {};
  return { cid, name: p.Title || '', iupac: p.IUPACName || '' };
}

// Parse a PubChem property response (split out so it can be unit-tested
// without a network call).
export function readPropertyResponse(json) {
  const p = json?.PropertyTable?.Properties?.[0] || {};
  return { cid: p.CID, name: p.Title || '', iupac: p.IUPACName || '' };
}
