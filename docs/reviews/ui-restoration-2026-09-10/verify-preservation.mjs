import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import ts from 'typescript';
import assert from 'node:assert/strict';
const printer=ts.createPrinter({removeComments:true});
const report={baseline:'401ff322726c3ceab9b05db776b2b076e63bbaf5',checks:[]};
function initializer(source,name) {
  const tree=ts.createSourceFile('candidate.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let result;
  function walk(node){if(ts.isVariableDeclaration(node)&&node.name.getText(tree)===name&&node.initializer) result=printer.printNode(ts.EmitHint.Unspecified,node.initializer,tree);ts.forEachChild(node,walk);}walk(tree);assert(result,'Missing '+name);return result;
}
for(const [file,names] of [
  ['admin/fees-page.tsx',['payment','fees','detail']],
  ['admin/mobile-calling-page.tsx',['mutation','cities','campaigns','leads','templates']],
  ['admin/procurement-page.tsx',['mutation','stocks','requests','orders']],
  ['admin/certificates-page.tsx',['people','preview']],
  ['student/mobile-student-profile-view.tsx',['self','context','parks','directory']],
]) {
  const source='src/components/modules/'+file;
  const before=execFileSync('git',['show',report.baseline+':'+source],{encoding:'utf8'});
  const after=fs.readFileSync(source,'utf8');
  for(const name of names) {
    const old=initializer(before,name),current=initializer(after,name);
    const normalized=file==='admin/procurement-page.tsx'&&name==='mutation'?current.replace('setRequestOpen(false); ',''):current;
    assert.equal(normalized,old,source+' '+name+' changed');
    report.checks.push({file:source,expression:name,passed:true,exception:file==='admin/procurement-page.tsx'&&name==='mutation'?'Close request sheet after acknowledged success only':null});
  }
}
const changed=execFileSync('git',['diff','--name-only','--','src','prisma'],{encoding:'utf8'}).trim().split('\n');
assert(changed.every(file=>file.startsWith('src/components/modules/')),'Non-UI application changes detected');
report.changedApplicationFiles=changed;report.passed=true;
fs.writeFileSync('docs/reviews/ui-restoration-2026-09-10/preservation-results.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({passed:report.passed,unchangedQueryAndMutationExpressions:report.checks.length,changedExistingApplicationFiles:changed.length}));
