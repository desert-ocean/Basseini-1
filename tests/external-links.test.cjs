const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
test('external link checker finds HTML and JS transitions but ignores technical resources and internal links',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'alpool-links-'));
 try{
  fs.writeFileSync(path.join(dir,'index.html'),'<a href="/local">x</a><a href="tel:123">x</a><a href="https://alpool.ru/page">x</a><script src="https://cdn.example/x.js"></script><a href="https://example.org/file.pdf">external</a><script>window.open("https://shop.example/item")</script>');
  fs.writeFileSync(path.join(dir,'ui.js'),'window.location.href = "https://example.net/test";');
  const run=spawnSync(process.execPath,[path.resolve('scripts/external-links.cjs')],{cwd:dir,encoding:'utf8'});
  assert.equal(run.status,1);assert.match(run.stderr,/index\.html.*example\.org/);assert.match(run.stderr,/index\.html.*shop\.example/);assert.match(run.stderr,/ui\.js.*example\.net/);assert.doesNotMatch(run.stderr,/cdn\.example|alpool\.ru/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
