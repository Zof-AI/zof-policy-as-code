import { validateEvidence, redact, type Evidence } from '@zofai/evidence-spec';

export type Decision = 'pass' | 'fail' | 'indeterminate';
export type Rule =
  | { id: string; type: 'all-tests-pass'; minimum?: number }
  | { id: string; type: 'deny-severity'; severity: 'info'|'low'|'medium'|'high'|'critical' }
  | { id: string; type: 'approved-tools'; names: string[] }
  | { id: string; type: 'commit'; value: string }
  | { id: string; type: 'max-age'; seconds: number }
  | { id: string; type: 'required-types'; types: string[] };
export interface Policy { version: '1.0'; rules: Rule[] }
export interface PolicyReport { version: '1.0'; result: Decision; decisions: { id: string; result: Decision; reason: string }[] }
const severities = ['info','low','medium','high','critical'];
const record = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const str = (x: unknown): x is string => typeof x === 'string' && x.length > 0 && x.length <= 256;
const list = (x: unknown): x is string[] => Array.isArray(x) && x.length > 0 && x.length <= 100 && x.every(str);
function invalid(): never { throw new Error('INVALID_POLICY: policy does not match the supported version 1.0 rule contract'); }

/** Strict, deterministic data-only policy validation. Never evaluates code. */
export function validatePolicy(input: unknown): Policy {
  if (!record(input) || Object.keys(input).some(k=>!['version','rules'].includes(k)) || input.version !== '1.0' || !Array.isArray(input.rules) || !input.rules.length || input.rules.length > 100) invalid();
  const ids = new Set<string>();
  for (const item of input.rules) {
    if (!record(item) || !str(item.id) || !/^[A-Za-z0-9_.-]+$/.test(item.id) || ids.has(item.id)) invalid();
    ids.add(item.id);
    let allowed = ['id','type'];
    switch(item.type) {
      case 'all-tests-pass':
        allowed.push('minimum');
        if (item.minimum !== undefined && (!Number.isSafeInteger(item.minimum) || Number(item.minimum) < 1 || Number(item.minimum)>100000)) invalid();
        break;
      case 'deny-severity': allowed.push('severity'); if (!severities.includes(String(item.severity))) invalid(); break;
      case 'approved-tools': allowed.push('names'); if (!list(item.names)) invalid(); break;
      case 'commit': allowed.push('value'); if (!str(item.value) || !/^[a-fA-F0-9]{7,64}$/.test(item.value)) invalid(); break;
      case 'max-age': allowed.push('seconds'); if (!Number.isSafeInteger(item.seconds) || Number(item.seconds)<1 || Number(item.seconds)>31536000) invalid(); break;
      case 'required-types': allowed.push('types'); if (!list(item.types)) invalid(); break;
      default: invalid();
    }
    if (Object.keys(item).some(k=>!allowed.includes(k))) invalid();
  }
  return structuredClone(input) as unknown as Policy;
}

/** Explicit clock makes age rules reproducible. Invalid evidence fails closed. */
export function evaluatePolicy(input: unknown, policyInput: unknown, options: { now?: string } = {}): PolicyReport {
  const policy = validatePolicy(policyInput);
  const documents: Evidence[] = input == null ? [] : Array.isArray(input) ? input : [input];
  if (documents.length > 100 || documents.some(e=>!validateEvidence(e).valid)) throw new Error('INVALID_EVIDENCE: supply valid evidence documents');
  const now = Date.parse(options.now ?? new Date().toISOString());
  if (!Number.isFinite(now)) throw new Error('INVALID_CLOCK: supply an ISO timestamp');
  const incomplete = !documents.length || documents.some(e=>e.execution.status !== 'completed' || e.execution.result === 'unknown');
  const decisions = policy.rules.map(rule => {
    let result: Decision = 'pass'; let reason = 'Requirement satisfied';
    if (!documents.length) return {id:rule.id, result:'indeterminate' as Decision, reason:'No evidence supplied'};
    switch (rule.type) {
      case 'all-tests-pass': {
        const tests=documents.flatMap(e=>e.tests);
        if (tests.some(t=>t.status==='failed'||t.status==='error') || documents.some(e=>e.execution.result==='fail')) { result='fail'; reason='A reported test or execution failed'; }
        else if (incomplete || tests.length<(rule.minimum??1) || tests.some(t=>t.status==='skipped')) { result='indeterminate'; reason='Complete passing test evidence is missing'; }
        break;
      }
      case 'deny-severity':
        if(documents.some(e=>e.findings.some(f=>severities.indexOf(f.severity)>=severities.indexOf(rule.severity)))) { result='fail'; reason='A finding meets the prohibited severity threshold'; }
        else if(incomplete) {result='indeterminate'; reason='Verification was incomplete';}
        break;
      case 'approved-tools':
        if(documents.some(e=>!rule.names.includes(e.tool.name))) {result='fail';reason='An evidence producer is not approved';}
        break;
      case 'commit':
        if(documents.some(e=>e.source.commit===null)) {result='indeterminate';reason='Commit attribution is missing';}
        else if(documents.some(e=>e.source.commit?.toLowerCase()!==rule.value.toLowerCase())) {result='fail';reason='Evidence commit does not match the required commit';}
        break;
      case 'max-age': {
        const ages=documents.map(e=>(now-Date.parse(e.createdAt))/1000);
        if(ages.some(age=>age<0)) {result='indeterminate';reason='Evidence timestamp is in the future';}
        else if(ages.some(age=>age>rule.seconds)) {result='fail';reason='Evidence has expired';}
        break;
      }
      case 'required-types': {
        const types = new Set(documents.filter(e=>e.execution.status==='completed'&&e.execution.result!=='unknown').map(e=>e.type));
        if(rule.types.some(type=>!types.has(type))) {result='indeterminate';reason='A required completed verification category is missing';}
        break;
      }
    }
    if (result === 'pass' && incomplete) {result='indeterminate';reason='Rule metadata matches but verification is incomplete';}
    return {id:rule.id,result,reason};
  });
  const result: Decision = decisions.some(d=>d.result==='fail') ? 'fail' : decisions.some(d=>d.result==='indeterminate') ? 'indeterminate' : 'pass';
  return redact({version:'1.0',result,decisions});
}
export function formatReport(report: PolicyReport): string {
  return [`Policy: ${report.result}`,...report.decisions.map(d=>`${d.result.toUpperCase()} ${d.id}: ${d.reason}`)].join('\n');
}
