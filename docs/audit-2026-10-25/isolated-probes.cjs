process.env.TS_NODE_TRANSPILE_ONLY='true';require(process.cwd()+'/node_modules/ts-node/register');
const fs=require('fs'),os=require('os'),path=require('path');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'creator-audit-'));
const root=process.cwd();const load=p=>require(path.join(root,p));
(async()=>{
const output={isolatedDataDir:dir,network:'No network requests; no notification dispatch performed',probes:[]};
const {SystemEnginesRouter}=load('src/server/routers/systemengines.ts');
const router=new SystemEnginesRouter({dataDirPath:dir}).router;
for(const url of ['/assets','/compliance/logs']){
 const response=await new Promise((resolve,reject)=>{
 const req={method:'GET',url,headers:{},query:{},get:()=>undefined};
 const res={statusCode:200,setHeader(){},getHeader(){},status(n){this.statusCode=n;return this},json(body){resolve({status:this.statusCode,body})},send(body){resolve({status:this.statusCode,body})},end(){resolve({status:this.statusCode})}};
 router.handle(req,res,err=>err?reject(err):resolve({fallthrough:true}));
 });output.probes.push({name:'unauthenticated system endpoint '+url,result:response});
}
const {ShortCreator}=load('src/short-creator/ShortCreator.ts');
const creator=new ShortCreator({dataDirPath:dir,videosDirPath:path.join(dir,'videos'),aiLlmUrl:'http://unused.invalid',aiLlmModel:'unused'}, {},{}, {},{}, {},{});
creator.processQueue=async()=>{};
const scenes=[{text:'Isolated audit sample',language:'en',searchTerms:['sample']}];
const a=creator.addToQueue(scenes,{},'short',undefined,'workspace-A');const b=creator.addToQueue(scenes,{},'short',undefined,'workspace-B');
output.probes.push({name:'in-flight render dedupe tenant isolation',sameVideoId:a===b,queueOwners:creator.queue.map(x=>x.tenantId)});
const {JobEventStore}=load('src/db/JobEventStore.ts');const aStore=new JobEventStore(dir),bStore=new JobEventStore(dir);
aStore.listForTenant('A');bStore.listForTenant('B');
aStore.append({tenantId:'A',jobId:'a',type:'queued',idempotencyKey:'a:queued',payload:{}});
bStore.append({tenantId:'B',jobId:'b',type:'queued',idempotencyKey:'b:queued',payload:{}});
const eventReader=new JobEventStore(dir);
output.probes.push({name:'independent cached event stores overwrite persisted events',AEvents:eventReader.listForTenant('A').length,BEvents:eventReader.listForTenant('B').length});
const {WebhookNotificationEngine}=load('src/services/WebhookNotificationEngine.ts');const hooks=new WebhookNotificationEngine(dir);
const hook=hooks.addWebhook({tenantId:'A',name:'audit',channel:'custom',enabled:true,events:['video.ready'],customUrl:'https://example.invalid'});
hooks.updateWebhook('A',hook.id,{tenantId:'B'});
output.probes.push({name:'webhook update changes immutable owner',AVisible:hooks.getWebhooks('A').length,BVisible:hooks.getWebhooks('B').length});
const {AuthEngine}=load('src/services/AuthEngine.ts');const auth=new AuthEngine(dir);
const reg=auth.registerTenant('Audit','audit@example.invalid','enterprise');
output.probes.push({name:'registration accepts caller enterprise plan and returns apiKeyHash',plan:reg.tenant.plan,hashPresent:Object.hasOwn(reg.tenant,'apiKeyHash'),hashValue:'not emitted'});
const {BrandingRouter}=load('src/server/routers/branding.ts');
const brand=new BrandingRouter({dataDirPath:dir}).router;
const cross=await new Promise((resolve,reject)=>{
 const req={method:'POST',url:'/workspace-B/reset',headers:{},query:{},auth:{tenantId:'workspace-A'},get:()=>undefined};
 const res={statusCode:200,setHeader(){},getHeader(){},status(n){this.statusCode=n;return this},json(body){resolve({status:this.statusCode,returnedOwner:body.branding?.tenantId})}};
 brand.handle(req,res,e=>e?reject(e):resolve({fallthrough:true}));
});output.probes.push({name:'workspace A resets workspace B branding',result:cross});
const {APIRouter}=load('src/server/routers/rest.ts');
const fakeCreator={listAllVideos:()=>[{id:'workspace-B-video',status:'ready'}],deleteVideo:id=>output.probes.push({name:'video deletion delegated without owner',id})};
const api=new APIRouter({dataDirPath:dir,aiLlmUrl:'http://unused.invalid',aiLlmModel:'unused'},fakeCreator).router;
for(const [method,url] of [['GET','/short-videos'],['DELETE','/short-video/workspace-B-video']]){
 const response=await new Promise((resolve,reject)=>{const req={method,url,headers:{},query:{},auth:{tenantId:'workspace-A'},get:()=>undefined};const res={statusCode:200,setHeader(){},getHeader(){},status(n){this.statusCode=n;return this},json(body){resolve({status:this.statusCode,body})}};api.handle(req,res,e=>e?reject(e):resolve({fallthrough:true}));});
 output.probes.push({name:method+' '+url+' as workspace A with fake video adapter',result:response});
}
fs.writeFileSync(path.join(root,'docs/audit-2026-10-25/ISOLATED_PROBES.json'),JSON.stringify(output,null,2));console.log(JSON.stringify(output,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
