const crypto=require('crypto');
const jwt=require('jsonwebtoken');
const sharp=require('sharp');
const {PKPass}=require('passkit-generator');
const {DateTime}=require('luxon');
const {q,findMember,todayRedemption,view,localNow,TZ,MORNING_START,MORNING_END}=require('./db');

const APP_BASE_URL=(process.env.APP_BASE_URL||'').replace(/\/$/,'');
const JWT_SECRET=process.env.JWT_SECRET||'dev-only-change-me';
const appleAuthToken=id=>crypto.createHmac('sha256',JWT_SECRET).update(String(id)).digest('hex');

function configured(){
 return {
  apple:Boolean(process.env.APPLE_PASS_TYPE_ID&&process.env.APPLE_TEAM_ID&&process.env.APPLE_SIGNER_CERT_BASE64&&process.env.APPLE_SIGNER_KEY_BASE64&&process.env.APPLE_WWDR_CERT_BASE64),
  google:Boolean(process.env.GOOGLE_WALLET_ISSUER_ID&&process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL&&process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_BASE64)
 };
}
async function brandPng(w,h){
 const fs=Math.max(14,Math.round(h*.42));
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
 <rect width="100%" height="100%" rx="8" fill="#211914"/>
 <text x="50%" y="53%" dominant-baseline="middle" text-anchor="middle" font-family="Arial,sans-serif"
 font-size="${fs}" font-weight="700" letter-spacing="-1" fill="#F4EEE7">dipndip</text></svg>`;
 return sharp(Buffer.from(svg)).png().toBuffer();
}
function certs(){
 if(!configured().apple)return null;
 return {
  wwdr:Buffer.from(process.env.APPLE_WWDR_CERT_BASE64,'base64'),
  signerCert:Buffer.from(process.env.APPLE_SIGNER_CERT_BASE64,'base64'),
  signerKey:Buffer.from(process.env.APPLE_SIGNER_KEY_BASE64,'base64'),
  signerKeyPassphrase:process.env.APPLE_SIGNER_KEY_PASSPHRASE||undefined
 };
}
function locations(){
 try{return JSON.parse(process.env.BRANCH_LOCATIONS_JSON||'[]')
  .filter(x=>Number.isFinite(Number(x.lat))&&Number.isFinite(Number(x.lng))).slice(0,10)
  .map(x=>({latitude:Number(x.lat),longitude:Number(x.lng),relevantText:'Morning Club · 8–10 AM'}));}
 catch{return[]}
}
async function applePass(row){
 const c=certs();if(!c)throw new Error('APPLE_WALLET_NOT_CONFIGURED');
 const v=view(row,await todayRedemption(row.id)),now=localNow();
 const next=now.hour<8?now.set({hour:8,minute:0,second:0,millisecond:0}):now.plus({days:1}).set({hour:8,minute:0,second:0,millisecond:0});
 const passJson={
  formatVersion:1,passTypeIdentifier:process.env.APPLE_PASS_TYPE_ID,serialNumber:`mc-${row.id}`,
  teamIdentifier:process.env.APPLE_TEAM_ID,organizationName:'dipndip Libya',description:'dipndip Morning Club',
  logoText:'dipndip',foregroundColor:'rgb(244,238,231)',backgroundColor:'rgb(33,25,20)',labelColor:'rgb(194,166,142)',
  relevantDate:next.toUTC().toISO(),locations:locations(),
  webServiceURL:`${APP_BASE_URL}/wallet/apple`,authenticationToken:appleAuthToken(row.id),
  generic:{
   primaryFields:[{key:'club',label:'MEMBERSHIP',value:'Morning Club'}],
   secondaryFields:[{key:'member',label:'MEMBER',value:v.name},
    {key:'today',label:'TODAY',value:v.redeemedToday?'USED ✓':(v.status==='active'?'AVAILABLE':v.status.toUpperCase())}],
   auxiliaryFields:[{key:'time',label:'DAILY',value:`${MORNING_START}–${MORNING_END}`},
    {key:'valid',label:'VALID UNTIL',value:v.endsAt?DateTime.fromJSDate(new Date(v.endsAt)).setZone(TZ).toFormat('dd LLL yyyy'):'Pending activation'}],
   backFields:[{key:'included',label:'Included',value:'One selected coffee per day.'},
    {key:'rollover',label:'No rollover',value:'Unused daily benefit expires at 10:00 AM.'},
    {key:'personal',label:'Personal membership',value:'Membership is non-transferable.'},
    {key:'number',label:'Membership No.',value:v.membershipNumber}]
  },
  barcode:{message:`MC:${row.qr_token}`,format:'PKBarcodeFormatQR',messageEncoding:'iso-8859-1',altText:v.membershipNumber}
 };
 const p=new PKPass({
  'pass.json':Buffer.from(JSON.stringify(passJson)),
  'icon.png':await brandPng(29,29),'icon@2x.png':await brandPng(58,58),
  'logo.png':await brandPng(160,50),'logo@2x.png':await brandPng(320,100)
 },c);
 return p.getAsBuffer();
}
function googleUrl(row,v){
 if(!configured().google)throw new Error('GOOGLE_WALLET_NOT_CONFIGURED');
 const issuer=process.env.GOOGLE_WALLET_ISSUER_ID,suffix=process.env.GOOGLE_WALLET_CLASS_SUFFIX||'morning_club';
 const classId=`${issuer}.${suffix}`,objectId=`${issuer}.mc_${row.id.replaceAll('-','')}`;
 const genericClass={id:classId,issuerName:'dipndip Libya',reviewStatus:'UNDER_REVIEW'};
 const genericObject={
  id:objectId,classId,state:'ACTIVE',hexBackgroundColor:'#211914',
  cardTitle:{defaultValue:{language:'en-US',value:'dipndip'}},
  header:{defaultValue:{language:'en-US',value:'Morning Club'}},
  subheader:{defaultValue:{language:'en-US',value:v.name}},
  barcode:{type:'QR_CODE',value:`MC:${row.qr_token}`,alternateText:v.membershipNumber},
  textModulesData:[
   {id:'today',header:'TODAY',body:v.redeemedToday?'USED ✓':(v.status==='active'?'AVAILABLE':v.status.toUpperCase())},
   {id:'time',header:'DAILY',body:`${MORNING_START}–${MORNING_END}`},
   {id:'valid',header:'VALID UNTIL',body:v.endsAt?DateTime.fromJSDate(new Date(v.endsAt)).setZone(TZ).toFormat('dd LLL yyyy'):'Pending activation'},
   {id:'rules',header:'MEMBERSHIP RULE',body:'One selected coffee per day. No rollover. Personal membership.'}]
 };
 const key=Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_BASE64,'base64').toString('utf8');
 const token=jwt.sign({iss:process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,aud:'google',typ:'savetowallet',
  iat:Math.floor(Date.now()/1000),origins:[new URL(APP_BASE_URL).host],
  payload:{genericClasses:[genericClass],genericObjects:[genericObject]}},key,{algorithm:'RS256'});
 return `https://pay.google.com/gp/v/save/${token}`;
}
function idFromSerial(s){return String(s||'').startsWith('mc-')?String(s).slice(3):null}
function authorized(req,id){return req.headers.authorization===`ApplePass ${appleAuthToken(id)}`}
async function latestTag(id){
 const r=await q(`SELECT GREATEST(COALESCE(EXTRACT(EPOCH FROM m.updated_at),0),
 COALESCE((SELECT MAX(EXTRACT(EPOCH FROM redeemed_at)) FROM redemptions WHERE membership_id=m.id),0))::bigint tag
 FROM memberships m WHERE m.id=$1`,[id]);
 return String(r.rows[0]?.tag||0);
}

function mount(app){
 app.get('/wallet/apple/:token.pkpass',async(req,res)=>{
  const row=await findMember(req.params.token);if(!row)return res.status(404).end();
  try{res.type('application/vnd.apple.pkpass').set('Content-Disposition','attachment; filename="dipndip-morning-club.pkpass"').send(await applePass(row))}
  catch(e){console.error(e);res.status(503).json({error:'apple_wallet_not_configured'})}
 });
 app.get('/wallet/google/:token',async(req,res)=>{
  const row=await findMember(req.params.token);if(!row)return res.status(404).json({error:'not_found'});
  try{res.json({url:googleUrl(row,view(row,await todayRedemption(row.id)))})}
  catch(e){console.error(e);res.status(503).json({error:'google_wallet_not_configured'})}
 });
 app.post('/wallet/apple/v1/devices/:device/registrations/:passType/:serial',async(req,res)=>{
  const id=idFromSerial(req.params.serial);if(!id||!req.body.pushToken)return res.status(400).end();
  if(!authorized(req,id))return res.status(401).end();
  const m=(await q('SELECT id FROM memberships WHERE id=$1',[id])).rows[0];if(!m)return res.status(404).end();
  const before=await q("SELECT id FROM wallet_registrations WHERE platform='apple' AND device_id=$1 AND serial_number=$2",[req.params.device,req.params.serial]);
  await q(`INSERT INTO wallet_registrations(membership_id,platform,device_id,push_token,serial_number)
   VALUES($1,'apple',$2,$3,$4) ON CONFLICT(platform,device_id,serial_number)
   DO UPDATE SET push_token=EXCLUDED.push_token,updated_at=now()`,[id,req.params.device,req.body.pushToken,req.params.serial]);
  res.status(before.rowCount?200:201).end();
 });
 app.delete('/wallet/apple/v1/devices/:device/registrations/:passType/:serial',async(req,res)=>{
  const id=idFromSerial(req.params.serial);if(!id||!authorized(req,id))return res.status(401).end();
  await q("DELETE FROM wallet_registrations WHERE platform='apple' AND device_id=$1 AND serial_number=$2",[req.params.device,req.params.serial]);
  res.status(200).end();
 });
 app.get('/wallet/apple/v1/devices/:device/registrations/:passType',async(req,res)=>{
  const rows=await q("SELECT serial_number,membership_id FROM wallet_registrations WHERE platform='apple' AND device_id=$1",[req.params.device]);
  const since=Number(req.query.passesUpdatedSince||0),serialNumbers=[];let newest=since;
  for(const x of rows.rows){const tag=Number(await latestTag(x.membership_id));if(tag>since)serialNumbers.push(x.serial_number);if(tag>newest)newest=tag}
  if(!serialNumbers.length)return res.status(204).end();
  res.json({serialNumbers,lastUpdated:String(newest)});
 });
 app.get('/wallet/apple/v1/passes/:passType/:serial',async(req,res)=>{
  const id=idFromSerial(req.params.serial);if(!id||!authorized(req,id))return res.status(401).end();
  const row=(await q(`SELECT m.*,c.first_name,c.last_name,c.phone FROM memberships m JOIN customers c ON c.id=m.customer_id WHERE m.id=$1`,[id])).rows[0];
  if(!row)return res.status(404).end();
  try{const buf=await applePass(row),tag=await latestTag(id);res.set('Last-Modified',new Date(Number(tag)*1000).toUTCString()).type('application/vnd.apple.pkpass').send(buf)}
  catch(e){console.error(e);res.status(503).end()}
 });
 app.post('/wallet/apple/v1/log',(req,res)=>{if(req.body?.logs)console.warn('Apple Wallet:',req.body.logs);res.status(200).end()});
}
module.exports={mount,configured};
