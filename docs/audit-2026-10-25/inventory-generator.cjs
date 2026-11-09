const fs=require('fs'),cp=require('child_process'),path=require('path');
const root=process.cwd(),ts=require(path.join(root,'node_modules/typescript'));
const tracked=cp.execFileSync('git',['ls-files','-z']).toString().split('\0').filter(Boolean);
const extra=cp.execFileSync('git',['ls-files','--others','--exclude-standard','-z']).toString().split('\0').filter(Boolean).filter(p=>!p.startsWith('docs/audit-2026-10-25/'));
const result=[];
for(const file of [...new Set([...tracked,...extra])].sort()){
 if(!fs.existsSync(file)){result.push({file,classification:'missing tracked file'});continue;}
 if(!fs.statSync(file).isFile()){result.push({file,classification:'directory or submodule'});continue;}
 const buf=fs.readFileSync(file),r={file,bytes:buf.length,sha256:require('crypto').createHash('sha256').update(buf).digest('hex')};
 if(buf.includes(0)){r.classification='binary asset';result.push(r);continue;}
 const s=buf.toString();r.lines=s.split('\n').length;r.classification=/\.(test|spec)\.[cm]?[jt]sx?$/.test(file)?'test':file.endsWith('.md')?'documentation':/\.[cm]?[jt]sx?$/.test(file)?'code':/lock|codebase-index|lint_|log|postman|response\.json/.test(file)?'generated/reference':'configuration/data/asset';
 if(/\.[cm]?[jt]sx?$/.test(file)){
 const sf=ts.createSourceFile(file,s,ts.ScriptTarget.Latest,true,file.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 r.imports=[];r.functions=[];r.routes=[];r.tests=[];r.effects=[];r.flags=[];
 const line=n=>sf.getLineAndCharacterOfPosition(n.getStart(sf)).line+1;
 function visit(n){
 if(ts.isImportDeclaration(n)&&n.moduleSpecifier)r.imports.push(n.moduleSpecifier.text);
 if(ts.isFunctionDeclaration(n)||ts.isMethodDeclaration(n)||ts.isConstructorDeclaration(n)||ts.isGetAccessorDeclaration(n)||ts.isSetAccessorDeclaration(n)||(ts.isVariableDeclaration(n)&&n.initializer&&(ts.isArrowFunction(n.initializer)||ts.isFunctionExpression(n.initializer)))){
 r.functions.push({name:ts.isConstructorDeclaration(n)?'constructor':n.name?.getText(sf)||'(anonymous)',line:line(n),end:sf.getLineAndCharacterOfPosition(n.end).line+1});}
 if(ts.isCallExpression(n)){
 const name=n.expression.getText(sf);const a=n.arguments[0];
 if(/\.(get|post|put|patch|delete|use|options|all)$/.test(name)&&a&&ts.isStringLiteralLike(a)&&/(router|app)/i.test(name))r.routes.push({method:name.split('.').pop().toUpperCase(),path:a.text,line:line(n),guards:n.arguments.slice(1).filter(x=>ts.isIdentifier(x)).map(x=>x.getText(sf))});
 if(/^(it|test|describe)(\.|$)/.test(name)&&a&&ts.isStringLiteralLike(a))r.tests.push({name:a.text,line:line(n)});
 if(/(?:fetch|axios|exec|spawn|write|readJson|readFile|remove|unlink|sendFile|createReadStream|schedule|setInterval|setTimeout|createQueue|requireAuth|requireAdminKey)/.test(name))r.effects.push({call:name,line:line(n)});
 }
 ts.forEachChild(n,visit);
 }visit(sf);
 for(const [i,l]of s.split('\n').entries())if(/TODO|FIXME|placeholder|mock|stub|not implemented|publishing (now|immediately)|catch\s*\{.*ignore|Math\.random|as any|@ts-ignore/i.test(l))r.flags.push({line:i+1,text:l.trim().slice(0,220)});
 r.diagnostics=sf.parseDiagnostics.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' '));
 }else if(file.endsWith('.md')){r.headings=s.split('\n').flatMap((l,i)=>/^#{1,6} /.test(l)?[{line:i+1,title:l}]:[]);}
 result.push(r);
}
fs.mkdirSync('docs/audit-2026-10-25',{recursive:true});fs.writeFileSync('docs/audit-2026-10-25/FILE_FUNCTION_INVENTORY.json',JSON.stringify({date:'2026-10-25',scope:'Tracked files plus pre-existing untracked source; AST inventory is not a semantic correctness certification.',files:result},null,2));
const summary={files:result.length,classes:{},functions:0,routes:0,tests:0};for(const r of result){summary.classes[r.classification]=(summary.classes[r.classification]||0)+1;summary.functions+=r.functions?.length||0;summary.routes+=r.routes?.length||0;summary.tests+=r.tests?.length||0;}
fs.writeFileSync('/tmp/project-audit-summary.json',JSON.stringify(summary,null,2));console.log(summary);
