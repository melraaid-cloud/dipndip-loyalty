require('dotenv').config();
const express=require('express');
const bcrypt=require('bcryptjs');
const jwt=require('jsonwebtoken');
const cookieParser=require('cookie-parser');
const helmet=require('helmet');
const compression=require('compression');
const rateLimit=require('express-rate-limit');
const QRCode=require('qrcode');
const path=require('path');
const {DateTime}=require('luxon');

const {
 pool,q,initDb,audit,findMember,todayRedemption,view,registerCustomer,statusOf,
 localNow,localDate,inWindow,TZ,PRICE,DAYS,MORNING_START,MORNING_END
}=require('./db');
const wallet=require('./wallet');

const app=express(),PORT=Number(process.env.PORT||10000);
const JWT_SECRET=process.env.JWT_SECRET||'dev-only-change-me';
const APP_BASE_URL=(process.env.APP_BASE_URL||`http://localhost:${PORT}`).replace(/\/$/,'');
if(process.env.NODE_ENV==='production'&&JWT_SECRET==='dev-only-change-me')throw new Error('JWT_SECRET must be set');

app.set('trust proxy',1);
app.use(helmet({contentSecurityPolicy:{directives:{
 defaultSrc:["'self'"],scriptSrc:["'self'","'unsafe-inline'"],styleSrc:["'self'","'unsafe-inline'"],
 imgSrc:["'self'","data:"],connectSrc:["'self'"],fontSrc:["'self'","data:"],frameAncestors:["'none'"]
}}}));
app.use(compression());
app.use(express.json({limit:'256kb'}));
app.use(express.urlencoded({extended:false}));
app.use(cookieParser());
app.use(rateLimit({windowMs:60000,limit:180,standardHeaders:true,legacyHeaders:false}));
app.use(express.static(path.join(__dirname,'public'),{extensions:['html']}));

const tokenFor=s=>jwt.sign({sub:s.id,email:s.email,role:s.role,name:s.name,branches:s.branch_codes||[]},JWT_SECRET,{expiresIn:'12h'});
function auth(req,res,next){
 const h=req.headers.authorization||'',t=h.startsWith('Bearer ')?h.slice(7):req.cookies.mc_token;
 if(!t)return res.status(401).json({error:'login_required'});
 try{req.user=jwt.verify(t,JWT_SECRET);next()}catch{return res.status(401).json({error:'invalid_session'})}
}
const roles=(...xs)=>(req,res,next)=>xs.includes(req.user.role)?next():res.status(403).json({error:'forbidden'});
function safe(v,n=120){return String(v||'').trim().slice(0,n)}

app.get('/health',async(_req,res)=>{
 try{await q('SELECT 1');res.json({status:'ok',service:'dipndip-morning-club',version:'1.0.0',time:new Date().toISOString()})}
 catch{res.status(503).json({status:'error'})}
});
app.get('/api/public/config',(_req,res)=>{
 const c=wallet.configured();
 res.json({priceLyd:PRICE,membershipDays:DAYS,morningStart:MORNING_START,morningEnd:MORNING_END,timezone:TZ,
  appleWalletConfigured:c.apple,googleWalletConfigured:c.google});
});
app.post('/api/public/register',rateLimit({windowMs:600000,limit:12}),async(req,res)=>{
 try{
  const row=await registerCustomer(req.body),red=await todayRedemption(row.id);
  res.status(201).json({...view(row,red),cardUrl:`${APP_BASE_URL}/card.html?t=${encodeURIComponent(row.qr_token)}`,
   nextStep:statusOf(row)==='pending'?'Pay 99 LYD at a dipndip branch to activate for 30 days.':'Membership already exists.'});
 }catch(e){res.status(e.status||500).json({error:e.message==='invalid_data'?'invalid_data':'registration_failed'})}
});
app.get('/api/public/card/:token',async(req,res)=>{
 const row=await findMember(req.params.token);if(!row)return res.status(404).json({error:'not_found'});
 res.json(view(row,await todayRedemption(row.id)));
});
app.get('/api/public/qr/:token.png',async(req,res)=>{
 const row=await findMember(req.params.token);if(!row)return res.status(404).end();
 const b=await QRCode.toBuffer(`MC:${row.qr_token}`,{type:'png',width:420,margin:2,color:{dark:'#211914',light:'#ffffff'}});
 res.type('png').send(b);
});

app.post('/api/auth/login',rateLimit({windowMs:600000,limit:20}),async(req,res)=>{
 const email=safe(req.body.email,180).toLowerCase(),password=String(req.body.password||'');
 const s=(await q('SELECT * FROM staff WHERE email=$1 AND active=true',[email])).rows[0];
 if(!s||!(await bcrypt.compare(password,s.password_hash)))return res.status(401).json({error:'invalid_credentials'});
 await q('UPDATE staff SET last_login_at=now() WHERE id=$1',[s.id]);
 res.cookie('mc_token',tokenFor(s),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',maxAge:43200000});
 res.json({ok:true,staff:{id:s.id,name:s.name,email:s.email,role:s.role,branchCodes:s.branch_codes}});
});
app.post('/api/auth/logout',(_req,res)=>{res.clearCookie('mc_token');res.json({ok:true})});
app.get('/api/auth/me',auth,(req,res)=>res.json({staff:req.user}));

app.get('/api/staff/membership/:code',auth,async(req,res)=>{
 const row=await findMember(req.params.code);if(!row)return res.status(404).json({error:'not_found'});
 res.json(view(row,await todayRedemption(row.id)));
});

app.post('/api/staff/activate',auth,roles('super_admin','admin','manager','cashier'),async(req,res)=>{
 const row=await findMember(req.body.code);if(!row)return res.status(404).json({error:'not_found'});
 const st=statusOf(row);if(st==='active')return res.status(409).json({error:'already_active',message:'العضوية فعالة؛ استخدم التجديد.'});
 if(st==='suspended')return res.status(409).json({error:'suspended'});
 const branch=safe(req.body.branchCode,60)||'branch',method=safe(req.body.paymentMethod,30)||'cash',receipt=safe(req.body.receiptNumber,80)||null;
 const start=DateTime.now(),end=start.plus({days:DAYS}),c=await pool.connect();
 try{
  await c.query('BEGIN');
  await c.query("UPDATE memberships SET status='active',starts_at=$1,ends_at=$2,activation_branch_code=$3,price_lyd=$4,updated_at=now() WHERE id=$5",
   [start.toJSDate(),end.toJSDate(),branch,PRICE,row.id]);
  await c.query(`INSERT INTO membership_payments(membership_id,type,amount_lyd,payment_method,branch_code,receipt_number,staff_id)
   VALUES($1,'activation',$2,$3,$4,$5,$6)`,[row.id,PRICE,method,branch,receipt,req.user.sub]);
  await c.query('COMMIT');
  await audit(req.user.sub,'activate',row.id,{branch,method,receipt,amount:PRICE});
  const fresh=await findMember(row.qr_token);res.json({ok:true,membership:view(fresh,null)});
 }catch(e){await c.query('ROLLBACK');console.error(e);res.status(500).json({error:'activation_failed'})}finally{c.release()}
});

app.post('/api/staff/renew',auth,roles('super_admin','admin','manager','cashier'),async(req,res)=>{
 const row=await findMember(req.body.code);if(!row)return res.status(404).json({error:'not_found'});
 if(statusOf(row)==='suspended')return res.status(409).json({error:'suspended'});
 const branch=safe(req.body.branchCode,60)||'branch',method=safe(req.body.paymentMethod,30)||'cash',receipt=safe(req.body.receiptNumber,80)||null;
 const now=DateTime.now(),old=row.ends_at?DateTime.fromJSDate(new Date(row.ends_at)):now,base=old>now?old:now,end=base.plus({days:DAYS});
 const c=await pool.connect();
 try{
  await c.query('BEGIN');
  await c.query("UPDATE memberships SET status='active',starts_at=COALESCE(starts_at,$1),ends_at=$2,updated_at=now() WHERE id=$3",
   [now.toJSDate(),end.toJSDate(),row.id]);
  await c.query(`INSERT INTO membership_payments(membership_id,type,amount_lyd,payment_method,branch_code,receipt_number,staff_id)
   VALUES($1,'renewal',$2,$3,$4,$5,$6)`,[row.id,PRICE,method,branch,receipt,req.user.sub]);
  await c.query('COMMIT');await audit(req.user.sub,'renew',row.id,{branch,method,receipt,amount:PRICE});
  const fresh=await findMember(row.qr_token);res.json({ok:true,membership:view(fresh,await todayRedemption(row.id))});
 }catch(e){await c.query('ROLLBACK');console.error(e);res.status(500).json({error:'renewal_failed'})}finally{c.release()}
});

app.post('/api/staff/redeem',auth,roles('super_admin','admin','manager','cashier'),async(req,res)=>{
 const row=await findMember(req.body.code);if(!row)return res.status(404).json({error:'not_found'});
 const st=statusOf(row);if(st!=='active')return res.status(409).json({error:st,message:`Membership is ${st}`});
 const now=localNow();if(!inWindow(now))return res.status(409).json({error:'outside_window',message:`Morning Club يعمل من ${MORNING_START} إلى ${MORNING_END}`,localTime:now.toFormat('HH:mm')});
 const branch=safe(req.body.branchCode,60)||'branch',receipt=safe(req.body.receiptNumber,80)||null,spend=Math.max(0,Number(req.body.spendAmount||0));
 const r=await q(`INSERT INTO redemptions(membership_id,benefit_date,branch_code,staff_id,receipt_number,spend_amount)
 VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(membership_id,benefit_date) DO NOTHING RETURNING *`,
 [row.id,now.toISODate(),branch,req.user.sub,receipt,spend]);
 if(!r.rowCount)return res.status(409).json({error:'already_redeemed',message:'تم استخدام قهوة اليوم بالفعل.',redemption:await todayRedemption(row.id)});
 await audit(req.user.sub,'redeem',row.id,{branch,receipt,spend,benefitDate:now.toISODate()});
 const fresh=await findMember(row.qr_token);res.json({ok:true,message:'تم صرف قهوة اليوم.',membership:view(fresh,r.rows[0])});
});
app.post('/api/staff/suspend',auth,roles('super_admin','admin','manager'),async(req,res)=>{
 const row=await findMember(req.body.code);if(!row)return res.status(404).json({error:'not_found'});
 await q("UPDATE memberships SET status='suspended',updated_at=now() WHERE id=$1",[row.id]);
 await audit(req.user.sub,'suspend',row.id,{reason:safe(req.body.reason,240)});res.json({ok:true});
});

app.get('/api/admin/dashboard',auth,roles('super_admin','admin','manager'),async(_req,res)=>{
 const [m,r,p,a,v,d,b]=await Promise.all([
  q(`SELECT COUNT(*) FILTER(WHERE status='pending')::int pending,
    COUNT(*) FILTER(WHERE status='active' AND ends_at>now())::int active,
    COUNT(*) FILTER(WHERE status='suspended')::int suspended,
    COUNT(*) FILTER(WHERE ends_at IS NOT NULL AND ends_at<=now())::int expired,COUNT(*)::int total FROM memberships`),
  q(`SELECT COUNT(*) FILTER(WHERE benefit_date=$1)::int today,
    COUNT(*) FILTER(WHERE redeemed_at>=now()-interval '30 days')::int last30 FROM redemptions`,[localDate()]),
  q(`SELECT COALESCE(SUM(amount_lyd),0)::numeric revenue,COUNT(*)::int payments FROM membership_payments WHERE paid_at>=now()-interval '30 days'`),
  q(`SELECT COUNT(*) FILTER(WHERE spend_amount>0)::int with_spend,COUNT(*)::int total,
    COALESCE(AVG(NULLIF(spend_amount,0)),0)::numeric avg_spend,COALESCE(SUM(spend_amount),0)::numeric additional_spend
    FROM redemptions WHERE redeemed_at>=now()-interval '30 days'`),
  q(`SELECT COALESCE(COUNT(*)::numeric/NULLIF(COUNT(DISTINCT membership_id),0),0)::numeric avg_visits
    FROM redemptions WHERE redeemed_at>=now()-interval '30 days'`),
  q(`SELECT benefit_date::text day,COUNT(*)::int count FROM redemptions WHERE benefit_date>=CURRENT_DATE-29 GROUP BY benefit_date ORDER BY benefit_date`),
  q(`SELECT branch_code,COUNT(*)::int redemptions,COALESCE(SUM(spend_amount),0)::numeric additional_spend
    FROM redemptions WHERE redeemed_at>=now()-interval '30 days' GROUP BY branch_code ORDER BY redemptions DESC`)
 ]);
 const x=a.rows[0],attach=Number(x.total)?Number((Number(x.with_spend)/Number(x.total)*100).toFixed(1)):0;
 res.json({members:m.rows[0],redemptions:r.rows[0],revenue30d:Number(p.rows[0].revenue),payments30d:p.rows[0].payments,
  foodAttachRate30d:attach,avgAdditionalSpend30d:Number(x.avg_spend),additionalSpend30d:Number(x.additional_spend),
  avgVisitsPerMember30d:Number(v.rows[0].avg_visits).toFixed(2),dailyRedemptions:d.rows,branchPerformance:b.rows,
  rules:{priceLyd:PRICE,days:DAYS,start:MORNING_START,end:MORNING_END,timezone:TZ}});
});
app.get('/api/admin/members',auth,roles('super_admin','admin','manager'),async(req,res)=>{
 const s=safe(req.query.search,120),ps=[];let where='';
 if(s){ps.push(`%${s}%`);where='WHERE c.first_name ILIKE $1 OR c.last_name ILIKE $1 OR c.phone ILIKE $1 OR m.membership_number ILIKE $1'}
 const r=await q(`SELECT m.id,m.membership_number,
   CASE WHEN m.status='active' AND m.ends_at<=now() THEN 'expired' ELSE m.status END status,
   m.starts_at,m.ends_at,m.created_at,c.first_name,c.last_name,c.phone,
   COUNT(rd.id)::int redemptions,COALESCE(SUM(rd.spend_amount),0)::numeric additional_spend,MAX(rd.redeemed_at) last_redemption
   FROM memberships m JOIN customers c ON c.id=m.customer_id LEFT JOIN redemptions rd ON rd.membership_id=m.id
   ${where} GROUP BY m.id,c.id ORDER BY m.created_at DESC LIMIT 500`,ps);
 res.json(r.rows);
});
app.get('/api/admin/export.csv',auth,roles('super_admin','admin','manager'),async(_req,res)=>{
 const r=await q(`SELECT m.membership_number,c.first_name,c.last_name,c.phone,m.status,m.starts_at,m.ends_at,
 COUNT(rd.id) redemptions,COALESCE(SUM(rd.spend_amount),0) additional_spend FROM memberships m
 JOIN customers c ON c.id=m.customer_id LEFT JOIN redemptions rd ON rd.membership_id=m.id
 GROUP BY m.id,c.id ORDER BY m.created_at DESC`);
 const esc=v=>'"'+String(v??'').replaceAll('"','""')+'"';
 const lines=[['membership_number','first_name','last_name','phone','status','starts_at','ends_at','redemptions','additional_spend'].join(',')];
 for(const x of r.rows)lines.push([x.membership_number,x.first_name,x.last_name,x.phone,x.status,x.starts_at,x.ends_at,x.redemptions,x.additional_spend].map(esc).join(','));
 res.type('text/csv').set('Content-Disposition','attachment; filename="morning-club-members.csv"').send(lines.join('\n'));
});

// Staff account management
app.get('/api/admin/staff',auth,roles('super_admin','admin'),async(_req,res)=>{
 const r=await q('SELECT id,name,email,role,branch_codes,active,created_at,last_login_at FROM staff ORDER BY created_at');
 res.json(r.rows);
});
app.post('/api/admin/staff',auth,roles('super_admin','admin'),async(req,res)=>{
 const name=safe(req.body.name,100),email=safe(req.body.email,180).toLowerCase(),password=String(req.body.password||''),
  role=safe(req.body.role,30),branches=Array.isArray(req.body.branchCodes)?req.body.branchCodes.map(x=>safe(x,60)).filter(Boolean):[];
 if(name.length<2||!email.includes('@')||password.length<10||!['admin','manager','cashier'].includes(role))
  return res.status(400).json({error:'invalid_data'});
 try{
  const hash=await bcrypt.hash(password,12);
  const r=await q('INSERT INTO staff(name,email,password_hash,role,branch_codes) VALUES($1,$2,$3,$4,$5) RETURNING id,name,email,role,branch_codes,active',
   [name,email,hash,role,branches]);res.status(201).json(r.rows[0]);
 }catch(e){if(e.code==='23505')return res.status(409).json({error:'email_exists'});throw e}
});
app.patch('/api/admin/staff/:id/active',auth,roles('super_admin','admin'),async(req,res)=>{
 if(req.params.id===req.user.sub&&req.body.active===false)return res.status(400).json({error:'cannot_disable_self'});
 const r=await q('UPDATE staff SET active=$1 WHERE id=$2 RETURNING id,name,email,role,branch_codes,active',[Boolean(req.body.active),req.params.id]);
 if(!r.rowCount)return res.status(404).json({error:'not_found'});res.json(r.rows[0]);
});

wallet.mount(app);
app.get('/',(_req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.get('/card',(_req,res)=>res.sendFile(path.join(__dirname,'public','card.html')));
app.get('/staff',(_req,res)=>res.sendFile(path.join(__dirname,'public','staff.html')));
app.get('/admin',(_req,res)=>res.sendFile(path.join(__dirname,'public','admin.html')));
app.use((err,_req,res,_next)=>{console.error(err);res.status(500).json({error:'server_error'})});

initDb().then(()=>app.listen(PORT,()=>console.log(`dipndip Morning Club live :${PORT} | ${TZ} | ${PRICE} LYD / ${DAYS} days`)))
.catch(e=>{console.error('Startup failed',e);process.exit(1)});
