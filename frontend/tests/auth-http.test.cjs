const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
function client(status=200) {
  const calls=[]; let refreshes=0, ended=0;
  const source=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/services/auth-http.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
  const module={exports:{}};
  vm.runInNewContext(source,{module,exports:module.exports,URL,Request,Headers,
    process:{env:{NEXT_PUBLIC_API_URL:'https://cas-api.chirocity.gov.et/api'}},
    window:{location:{origin:'https://cas.chirocity.gov.et'}},
    fetch:async(...args)=>{calls.push(args);return {status};},
    require:name=>name==='axios'?{}:{accessToken:async()=>{refreshes++;return 'refreshed-memory-token';},endSession:()=>ended++},
  });
  return {http:module.exports,calls,get refreshes(){return refreshes},get ended(){return ended}};
}
test('API requests replace stale caller headers with refreshed tokens and preserve uploads',async()=>{
  const state=client();const body=new FormData();body.append('description','case upload');
  await state.http.authFetch('https://cas-api.chirocity.gov.et/api/cases/',{method:'POST',body,headers:{Authorization:'Bearer stale-token'}});
  assert.equal(state.refreshes,1);assert.equal(state.calls[0][1].headers.get('Authorization'),'Bearer refreshed-memory-token');
  assert.equal(state.calls[0][1].body,body);assert.equal(state.calls[0][1].headers.has('Content-Type'),false);
});
test('public auth settings and external requests never receive a Chiro Auth token',async()=>{
  const state=client();await state.http.authFetch('https://cas-api.chirocity.gov.et/api/auth/config/');await state.http.authFetch('https://unrelated.example/file');
  assert.equal(state.refreshes,0);assert.equal(state.calls[0][1],undefined);assert.equal(state.calls[1][1],undefined);
});
test('401 responses end the browser session; permission denials retain it',async()=>{
  for(const status of [401,403]){const state=client(status);await state.http.authFetch('https://cas-api.chirocity.gov.et/api/cases/');assert.equal(state.ended,status===401?1:0);}
});
