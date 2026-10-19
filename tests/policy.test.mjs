import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createEvidence} from '@zofai/evidence-spec';
import {evaluatePolicy,validatePolicy,formatReport} from '../dist/index.js';
const evidence=(extra={})=>createEvidence({tool:{name:'synthetic',version:'1.0.0'},type:'tests',createdAt:'2026-01-01T00:00:00Z',execution:{status:'completed',result:'pass'},tests:[{name:'addition',status:'passed'}],source:{repository:null,commit:'a'.repeat(40)},...extra});
const policy=(...rules)=>({version:'1.0',rules:rules.map((r,i)=>({id:`r${i}`,...r}))});
test('complete passing evidence passes all supported requirements',()=>{
 const report=evaluatePolicy(evidence(),policy({type:'all-tests-pass'},{type:'deny-severity',severity:'high'},{type:'approved-tools',names:['synthetic']},{type:'commit',value:'a'.repeat(40)},{type:'max-age',seconds:60},{type:'required-types',types:['tests']}),{now:'2026-01-01T00:00:30Z'});
 assert.equal(report.result,'pass');assert.match(formatReport(report),/Policy: pass/);
});
test('missing, partial, skipped, zero and insufficient tests are indeterminate',()=>{
 for(const doc of [null,evidence({execution:{status:'partial',result:'unknown'}}),evidence({tests:[]}),evidence({tests:[{name:'skip',status:'skipped'}]})]) assert.equal(evaluatePolicy(doc,policy({type:'all-tests-pass'})).result,'indeterminate');
 assert.equal(evaluatePolicy(evidence(),policy({type:'all-tests-pass',minimum:2})).result,'indeterminate');
});
test('fail dominates missing evidence; detected high finding fails',()=>{
 const failed=evidence({execution:{status:'completed',result:'fail'},tests:[{name:'failure',status:'failed'}]});
 assert.equal(evaluatePolicy(failed,policy({type:'all-tests-pass'},{type:'required-types',types:['coverage']})).result,'fail');
 assert.equal(evaluatePolicy(evidence({findings:[{id:'risk',severity:'high',message:'risk'}]}),policy({type:'deny-severity',severity:'high'})).result,'fail');
 assert.equal(evaluatePolicy(evidence({execution:{status:'missing',result:'unknown'}}),policy({type:'deny-severity',severity:'high'})).result,'indeterminate');
});
test('tool, commit, age and categories reject mismatches and missing attribution',()=>{
 assert.equal(evaluatePolicy(evidence(),policy({type:'approved-tools',names:['other']})).result,'fail');
 assert.equal(evaluatePolicy(evidence(),policy({type:'commit',value:'b'.repeat(40)})).result,'fail');
 assert.equal(evaluatePolicy(evidence({source:{repository:null,commit:null}}),policy({type:'commit',value:'a'.repeat(40)})).result,'indeterminate');
 assert.equal(evaluatePolicy(evidence(),policy({type:'max-age',seconds:1}),{now:'2026-01-01T01:00:00Z'}).result,'fail');
 assert.equal(evaluatePolicy(evidence(),policy({type:'max-age',seconds:1}),{now:'2025-01-01T01:00:00Z'}).result,'indeterminate');
 assert.equal(evaluatePolicy(evidence(),policy({type:'required-types',types:['coverage']})).result,'indeterminate');
 assert.throws(()=>evaluatePolicy(evidence(),policy({type:'max-age',seconds:1}),{now:'bad'}),/INVALID_CLOCK/);
});
test('malformed, unsupported, executable and conflicting policies fail safely',()=>{
 for(const p of [null,{}, {version:'2',rules:[]},policy({type:'eval',code:'process.exit()'}),policy({type:'all-tests-pass',minimum:0}),policy({type:'deny-severity',severity:'fatal'}),policy({type:'approved-tools',names:[]}),policy({type:'commit',value:'secret'}),policy({type:'max-age',seconds:-1}),policy({type:'required-types',types:[]}),policy({type:'all-tests-pass',extra:true}),{version:'1.0',rules:[{id:'x',type:'all-tests-pass'},{id:'x',type:'all-tests-pass'}]}]) assert.throws(()=>validatePolicy(p),/INVALID_POLICY/);
 assert.equal(evaluatePolicy(evidence(),policy({type:'commit',value:'a'.repeat(40)},{type:'commit',value:'b'.repeat(40)})).result,'fail');
 assert.throws(()=>evaluatePolicy({secret:'synthetic-only'},policy({type:'all-tests-pass'})),/INVALID_EVIDENCE/);
});
test('CLI end-to-end statuses, safe paths, malformed input and documentation example',async()=>{
 const root=await mkdtemp(join(tmpdir(),'zof-policy-'));const cli=resolve('dist/cli.js');
 try{
  await writeFile(join(root,'policy.json'),JSON.stringify(policy({type:'all-tests-pass'})));
  for(const [doc,exit] of [[evidence(),0],[evidence({execution:{status:'completed',result:'fail'},tests:[{name:'bad',status:'failed'}]}),1],[evidence({execution:{status:'missing',result:'unknown'},tests:[]}),2]]){
   await writeFile(join(root,'evidence.json'),JSON.stringify(doc));const r=spawnSync(process.execPath,[cli,'policy.json','evidence.json','--json'],{cwd:root,encoding:'utf8'});assert.equal(r.status,exit,r.stderr);assert.ok(JSON.parse(r.stdout).result);
  }
  await writeFile(join(root,'evidence.json'),'secret=synthetic-invalid-json');const bad=spawnSync(process.execPath,[cli,'policy.json','evidence.json'],{cwd:root,encoding:'utf8'});assert.equal(bad.status,2);assert.ok(!bad.stderr.includes('synthetic-invalid'));
  for(const args of [['--help'],['--version']])assert.equal(spawnSync(process.execPath,[cli,...args]).status,0);
  assert.equal(spawnSync(process.execPath,[cli,'../policy.json','evidence.json'],{cwd:root}).status,2);
 }finally{await rm(root,{recursive:true,force:true});}
});
