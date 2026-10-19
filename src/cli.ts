#!/usr/bin/env node
import { safeReadJson } from '@zofai/evidence-spec';
import { evaluatePolicy, formatReport } from './index.js';
async function main() {
  const args=process.argv.slice(2);
  if(args.includes('--help') || !args.length) {console.log('Usage: zof-policy-as-code <policy.json> <evidence.json> [--json] [--now <ISO timestamp>]\nPaths are relative to the current directory. Exit: 0 pass, 1 fail, 2 invalid or indeterminate.');return;}
  if(args.length===1&&args[0]==='--version'){console.log('0.1.0');return;}
  const [policyPath,evidencePath,...flags]=args;
  if(!policyPath||!evidencePath) throw new Error('usage');
  let json=false; let now: string|undefined;
  for(let i=0;i<flags.length;i++){if(flags[i]==='--json')json=true;else if(flags[i]==='--now'&&flags[i+1])now=flags[++i];else throw new Error('flags');}
  const [policy,evidence]=await Promise.all([safeReadJson(process.cwd(),policyPath),safeReadJson(process.cwd(),evidencePath)]);
  const report=evaluatePolicy(evidence,policy,{now});
  console.log(json?JSON.stringify(report,null,2):formatReport(report));
  process.exitCode=report.result==='pass'?0:report.result==='fail'?1:2;
}
main().catch(()=>{console.error('POLICY_INPUT_ERROR: check relative paths, policy/evidence schemas and timestamp; use --help.');process.exitCode=2;});
