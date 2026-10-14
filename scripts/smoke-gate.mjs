import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { strict as assert } from "node:assert";
const port = 32321;
const server = spawn(process.execPath,["node_modules/next/dist/bin/next","start","--hostname","127.0.0.1","--port",String(port)],{
  env:{...process.env,ELARVENTIS_MVP_ENABLED:"disabled"},stdio:"ignore"
});
try {
  let ready=false;
  for(let i=0;i<30;i++) {
    if(server.exitCode!==null) throw new Error("Server stopped");
    try { const r=await fetch(`http://127.0.0.1:${port}/`,{redirect:"manual"}); if(r.ok) { ready=true; assert.match(await r.text(),/Elarventis/); break; } } catch { /* Startup */ }
    await delay(300);
  }
  assert.ok(ready,"Homepage did not become ready");
  for(const path of ["/app","/kirjaudu","/auth/callback"]) {
    const r=await fetch(`http://127.0.0.1:${port}${path}`,{redirect:"manual"});
    assert.equal(r.status,307,`${path} must stay closed`);
    assert.equal(new URL(r.headers.get("location")).pathname,"/");
  }
  for(const path of ["/api/workspace/audits","/api/workspace/invoices/process","/api/auth"]) {
    const r=await fetch(`http://127.0.0.1:${port}${path}`,{method:"POST",redirect:"manual"});
    assert.equal(r.status,503,`${path} must stay closed`);
  }
  console.log("Public homepage 200; workspace/auth routes closed (307/503)");
} finally { server.kill("SIGTERM"); }
