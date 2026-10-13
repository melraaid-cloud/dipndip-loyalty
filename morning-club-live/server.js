require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const QRCode = require('qrcode');
const crypto = require('crypto');
const path = require('path');
const { DateTime } = require('luxon');

const app = express();
const PORT = Number(process.env.PORT || 10000);
const TZ = process.env.TIMEZONE || 'Africa/Tripoli';
const PRICE = Number(process.env.MEMBERSHIP_PRICE_LYD || 99);
const DAYS = Number(process.env.MEMBERSHIP_DAYS || 30);
const MORNING_START = process.env.MORNING_START || '08:00';
const MORNING_END = process.env.MORNING_END || '10:00';
let JWT_SECRET = process.env.JWT_SECRET || null;
const APP_BASE_URL = String(process.env.APP_BASE_URL || '').replace(/\/$/, '');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
  max: 10
});

app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"]
    }
  }
}));
app.use(compression());
app.use(express.json({ limit: '128kb' }));
app.use(cookieParser());
app.use(rateLimit({ windowMs: 60000, limit: 180, standardHeaders: true, legacyHeaders: false }));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

function db(text, params) { return pool.query(text, params || []); }
function nowLocal() { return DateTime.now().setZone(TZ); }
function todayLocal() { return nowLocal().toISODate(); }
function minOf(v) { var p=String(v).split(':').map(Number); return p[0]*60+p[1]; }
function inWindow(dt) {
  var n = dt.hour*60 + dt.minute;
  return n >= minOf(MORNING_START) && n < minOf(MORNING_END);
}
function cleanPhone(v) { return String(v || '').replace(/[^\d+]/g,'').trim(); }
function randomToken() { return crypto.randomBytes(18).toString('base64url'); }
function statusOf(m) {
  if (!m) return 'none';
  if (m.status === 'suspended') return 'suspended';
  if (!m.starts_at || !m.ends_at || m.status === 'pending') return 'pending';
  if (DateTime.fromJSDate(new Date(m.ends_at)) <= DateTime.now()) return 'expired';
  return 'active';
}

async function initDb() {
  await db("CREATE EXTENSION IF NOT EXISTS pgcrypto");
  await db("CREATE TABLE IF NOT EXISTS customers (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), first_name text NOT NULL, last_name text NOT NULL, phone text NOT NULL UNIQUE, created_at timestamptz NOT NULL DEFAULT now())");
  await db("CREATE TABLE IF NOT EXISTS staff (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, email text NOT NULL UNIQUE, password_hash text NOT NULL, role text NOT NULL CHECK (role IN ('super_admin','admin','manager','cashier')), branch_codes text[] NOT NULL DEFAULT '{}', active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), last_login_at timestamptz)");
  await db("CREATE TABLE IF NOT EXISTS memberships (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE, membership_number text NOT NULL UNIQUE, qr_token text NOT NULL UNIQUE, status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','suspended','expired')), starts_at timestamptz, ends_at timestamptz, price_lyd numeric(10,3) NOT NULL DEFAULT 99, activation_branch_code text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())");
  await db("CREATE UNIQUE INDEX IF NOT EXISTS one_open_membership_per_customer ON memberships(customer_id) WHERE status IN ('pending','active','suspended')");
  await db("CREATE TABLE IF NOT EXISTS membership_payments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), membership_id uuid NOT NULL REFERENCES memberships(id) ON DELETE CASCADE, type text NOT NULL CHECK (type IN ('activation','renewal')), amount_lyd numeric(10,3) NOT NULL, payment_method text NOT NULL DEFAULT 'cash', branch_code text, receipt_number text, staff_id uuid REFERENCES staff(id) ON DELETE SET NULL, paid_at timestamptz NOT NULL DEFAULT now())");
  await db("CREATE TABLE IF NOT EXISTS redemptions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), membership_id uuid NOT NULL REFERENCES memberships(id) ON DELETE CASCADE, benefit_date date NOT NULL, redeemed_at timestamptz NOT NULL DEFAULT now(), branch_code text NOT NULL, staff_id uuid REFERENCES staff(id) ON DELETE SET NULL, receipt_number text, spend_amount numeric(10,3) NOT NULL DEFAULT 0, UNIQUE(membership_id, benefit_date))");
  await db("CREATE TABLE IF NOT EXISTS audit_log (id bigserial PRIMARY KEY, staff_id uuid REFERENCES staff(id) ON DELETE SET NULL, action text NOT NULL, membership_id uuid REFERENCES memberships(id) ON DELETE SET NULL, payload jsonb, created_at timestamptz NOT NULL DEFAULT now())");
  await db("CREATE TABLE IF NOT EXISTS app_config (key text PRIMARY KEY, value text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())");

  if (!JWT_SECRET) {
    var secretRow = (await db("SELECT value FROM app_config WHERE key='jwt_secret'")).rows[0];
    if (!secretRow) {
      var generatedSecret = randomToken() + randomToken();
      await db("INSERT INTO app_config(key,value) VALUES('jwt_secret',$1)", [generatedSecret]);
      JWT_SECRET = generatedSecret;
    } else {
      JWT_SECRET = secretRow.value;
    }
  }

  var email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  var password = String(process.env.ADMIN_PASSWORD || '');
  if (email && password) {
    var existing = await db("SELECT id FROM staff WHERE email=$1",[email]);
    if (!existing.rowCount) {
      var hash = await bcrypt.hash(password,12);
      await db("INSERT INTO staff(name,email,password_hash,role) VALUES($1,$2,$3,'super_admin')",[process.env.ADMIN_NAME || 'dipndip Admin',email,hash]);
      console.log('Seeded admin ' + email);
    }
  }
}

async function findMember(code) {
  var c = String(code || '').trim();
  if (c.indexOf('MC:') === 0) c = c.slice(3);
  var r = await db("SELECT m.*,c.first_name,c.last_name,c.phone FROM memberships m JOIN customers c ON c.id=m.customer_id WHERE m.qr_token=$1 OR m.membership_number=$1 LIMIT 1",[c]);
  return r.rows[0] || null;
}
async function redemptionToday(id) {
  var r = await db("SELECT * FROM redemptions WHERE membership_id=$1 AND benefit_date=$2",[id,todayLocal()]);
  return r.rows[0] || null;
}
function view(m, red) {
  var s = statusOf(m);
  var nw = nowLocal();
  return {
    membershipNumber:m.membership_number,
    token:m.qr_token,
    name:(m.first_name+' '+m.last_name).trim(),
    phone:m.phone,
    status:s,
    startsAt:m.starts_at,
    endsAt:m.ends_at,
    priceLyd:Number(m.price_lyd),
    dailyWindow:MORNING_START+'–'+MORNING_END,
    today:nw.toISODate(),
    localTime:nw.toFormat('HH:mm'),
    inMorningWindow:inWindow(nw),
    redeemedToday:Boolean(red),
    redeemedAt:red ? red.redeemed_at : null,
    availableToday:s==='active' && inWindow(nw) && !red,
    qrValue:'MC:'+m.qr_token,
    rules:{oneSelectedCoffeePerDay:true,everyDay:true,noRollover:true,nonTransferable:true,validityDays:DAYS}
  };
}
function signStaff(s) {
  return jwt.sign({sub:s.id,email:s.email,role:s.role,name:s.name,branches:s.branch_codes || []},JWT_SECRET,{expiresIn:'12h'});
}
function auth(req,res,next) {
  var h=req.headers.authorization || '';
  var token=h.indexOf('Bearer ')===0 ? h.slice(7) : req.cookies.mc_token;
  if(!token) return res.status(401).json({error:'login_required'});
  try { req.user=jwt.verify(token,JWT_SECRET); next(); }
  catch(e){ res.status(401).json({error:'invalid_session'}); }
}
function allow() {
  var roles=Array.from(arguments);
  return function(req,res,next){ roles.indexOf(req.user.role)>=0 ? next() : res.status(403).json({error:'forbidden'}); };
}
async function audit(staffId,action,memberId,payload) {
  try { await db("INSERT INTO audit_log(staff_id,action,membership_id,payload) VALUES($1,$2,$3,$4)",[staffId||null,action,memberId||null,JSON.stringify(payload||{})]); } catch(e){}
}

app.get('/health',async function(req,res){
  try { await db('SELECT 1'); res.json({status:'ok',service:'dipndip-morning-club',time:new Date().toISOString()}); }
  catch(e){ res.status(503).json({status:'error'}); }
});
app.get('/api/config',function(req,res){
  res.json({priceLyd:PRICE,days:DAYS,start:MORNING_START,end:MORNING_END,timezone:TZ,appleWallet:false,googleWallet:false});
});

app.post('/api/register',rateLimit({windowMs:600000,limit:15}),async function(req,res){
  var first=String(req.body.firstName||'').trim();
  var last=String(req.body.lastName||'').trim();
  var phone=cleanPhone(req.body.phone);
  if(first.length<2||last.length<2||phone.length<7) return res.status(400).json({error:'invalid_data'});
  try {
    await db('BEGIN');
    var c=(await db("SELECT * FROM customers WHERE phone=$1",[phone])).rows[0];
    if(!c) c=(await db("INSERT INTO customers(first_name,last_name,phone) VALUES($1,$2,$3) RETURNING *",[first,last,phone])).rows[0];
    else await db("UPDATE customers SET first_name=$1,last_name=$2 WHERE id=$3",[first,last,c.id]);

    var m=(await db("SELECT * FROM memberships WHERE customer_id=$1 AND status IN ('pending','active','suspended') ORDER BY created_at DESC LIMIT 1",[c.id])).rows[0];
    if(!m){
      var num='MC'+nowLocal().toFormat('yyLL')+crypto.randomInt(100000,999999);
      m=(await db("INSERT INTO memberships(customer_id,membership_number,qr_token,price_lyd) VALUES($1,$2,$3,$4) RETURNING *",[c.id,num,randomToken(),PRICE])).rows[0];
    }
    await db('COMMIT');
    m.first_name=first;m.last_name=last;m.phone=phone;
    res.status(201).json(Object.assign(view(m,await redemptionToday(m.id)),{
      cardUrl:(APP_BASE_URL||'')+'/card?t='+encodeURIComponent(m.qr_token),
      nextStep:statusOf(m)==='pending'?'Pay '+PRICE+' LYD at dipndip to activate for '+DAYS+' days.':'Membership already exists.'
    }));
  } catch(e) {
    await db('ROLLBACK').catch(function(){});
    console.error(e);res.status(500).json({error:'registration_failed'});
  }
});

app.get('/api/member/:token',async function(req,res){
  var m=await findMember(req.params.token);
  if(!m) return res.status(404).json({error:'not_found'});
  res.json(view(m,await redemptionToday(m.id)));
});
app.get('/api/qr/:token.png',async function(req,res){
  var m=await findMember(req.params.token);
  if(!m) return res.status(404).end();
  try {
    var b=await QRCode.toBuffer('MC:'+m.qr_token,{type:'png',width:420,margin:2,color:{dark:'#211914',light:'#ffffff'}});
    res.type('png').send(b);
  } catch(e){res.status(500).end();}
});

app.get('/api/setup/status',async function(req,res){
  var r=await db("SELECT COUNT(*)::int count FROM staff");
  res.json({configured:Number(r.rows[0].count)>0});
});

app.post('/api/setup',rateLimit({windowMs:600000,limit:10}),async function(req,res){
  var count=Number((await db("SELECT COUNT(*)::int count FROM staff")).rows[0].count);
  if(count>0) return res.status(409).json({error:'already_configured'});
  var name=String(req.body.name||'').trim();
  var email=String(req.body.email||'').trim().toLowerCase();
  var password=String(req.body.password||'');
  if(name.length<2 || email.indexOf('@')<1 || password.length<10) return res.status(400).json({error:'invalid_setup_data'});
  var hash=await bcrypt.hash(password,12);
  await db("INSERT INTO staff(name,email,password_hash,role) VALUES($1,$2,$3,'super_admin')",[name,email,hash]);
  res.status(201).json({ok:true});
});

app.post('/api/auth/login',rateLimit({windowMs:600000,limit:20}),async function(req,res){
  var email=String(req.body.email||'').trim().toLowerCase();
  var password=String(req.body.password||'');
  var s=(await db("SELECT * FROM staff WHERE email=$1 AND active=true",[email])).rows[0];
  if(!s || !(await bcrypt.compare(password,s.password_hash))) return res.status(401).json({error:'invalid_credentials'});
  await db("UPDATE staff SET last_login_at=now() WHERE id=$1",[s.id]);
  var token=signStaff(s);
  res.cookie('mc_token',token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',maxAge:43200000});
  res.json({ok:true,staff:{id:s.id,name:s.name,email:s.email,role:s.role,branchCodes:s.branch_codes}});
});
app.post('/api/auth/logout',function(req,res){res.clearCookie('mc_token');res.json({ok:true});});
app.get('/api/auth/me',auth,function(req,res){res.json({staff:req.user});});

app.get('/api/staff/find/:code',auth,async function(req,res){
  var m=await findMember(req.params.code);
  if(!m) return res.status(404).json({error:'not_found'});
  res.json(view(m,await redemptionToday(m.id)));
});

app.post('/api/staff/activate',auth,allow('super_admin','admin','manager','cashier'),async function(req,res){
  var m=await findMember(req.body.code);
  if(!m) return res.status(404).json({error:'not_found'});
  if(statusOf(m)==='active') return res.status(409).json({error:'already_active'});
  if(statusOf(m)==='suspended') return res.status(409).json({error:'suspended'});
  var branch=String(req.body.branchCode||'branch').trim();
  var method=String(req.body.paymentMethod||'cash').trim();
  var receipt=String(req.body.receiptNumber||'').trim()||null;
  var start=DateTime.now(), end=start.plus({days:DAYS});
  try {
    await db('BEGIN');
    await db("UPDATE memberships SET status='active',starts_at=$1,ends_at=$2,activation_branch_code=$3,price_lyd=$4,updated_at=now() WHERE id=$5",[start.toJSDate(),end.toJSDate(),branch,PRICE,m.id]);
    await db("INSERT INTO membership_payments(membership_id,type,amount_lyd,payment_method,branch_code,receipt_number,staff_id) VALUES($1,'activation',$2,$3,$4,$5,$6)",[m.id,PRICE,method,branch,receipt,req.user.sub]);
    await db('COMMIT');
    await audit(req.user.sub,'activate',m.id,{branchCode:branch,paymentMethod:method,receiptNumber:receipt,amount:PRICE});
    var fresh=await findMember(m.qr_token);
    res.json({ok:true,membership:view(fresh,null)});
  } catch(e){await db('ROLLBACK').catch(function(){});console.error(e);res.status(500).json({error:'activation_failed'});}
});

app.post('/api/staff/renew',auth,allow('super_admin','admin','manager','cashier'),async function(req,res){
  var m=await findMember(req.body.code);
  if(!m) return res.status(404).json({error:'not_found'});
  if(statusOf(m)==='suspended') return res.status(409).json({error:'suspended'});
  var branch=String(req.body.branchCode||'branch').trim();
  var method=String(req.body.paymentMethod||'cash').trim();
  var receipt=String(req.body.receiptNumber||'').trim()||null;
  var n=DateTime.now();
  var oldEnd=m.ends_at?DateTime.fromJSDate(new Date(m.ends_at)):n;
  var base=oldEnd>n?oldEnd:n;
  var newEnd=base.plus({days:DAYS});
  try {
    await db('BEGIN');
    await db("UPDATE memberships SET status='active',starts_at=COALESCE(starts_at,$1),ends_at=$2,updated_at=now() WHERE id=$3",[n.toJSDate(),newEnd.toJSDate(),m.id]);
    await db("INSERT INTO membership_payments(membership_id,type,amount_lyd,payment_method,branch_code,receipt_number,staff_id) VALUES($1,'renewal',$2,$3,$4,$5,$6)",[m.id,PRICE,method,branch,receipt,req.user.sub]);
    await db('COMMIT');
    await audit(req.user.sub,'renew',m.id,{branchCode:branch,paymentMethod:method,receiptNumber:receipt,amount:PRICE});
    var fresh=await findMember(m.qr_token);
    res.json({ok:true,membership:view(fresh,await redemptionToday(m.id))});
  } catch(e){await db('ROLLBACK').catch(function(){});res.status(500).json({error:'renewal_failed'});}
});

app.post('/api/staff/redeem',auth,allow('super_admin','admin','manager','cashier'),async function(req,res){
  var m=await findMember(req.body.code);
  if(!m) return res.status(404).json({error:'not_found'});
  var st=statusOf(m);
  if(st!=='active') return res.status(409).json({error:st,message:'Membership is '+st});
  var n=nowLocal();
  if(!inWindow(n)) return res.status(409).json({error:'outside_window',message:'Morning Club is available '+MORNING_START+'–'+MORNING_END,localTime:n.toFormat('HH:mm')});
  var branch=String(req.body.branchCode||'branch').trim();
  var receipt=String(req.body.receiptNumber||'').trim()||null;
  var spend=Math.max(0,Number(req.body.spendAmount||0));
  var ins=await db("INSERT INTO redemptions(membership_id,benefit_date,branch_code,staff_id,receipt_number,spend_amount) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(membership_id,benefit_date) DO NOTHING RETURNING *",[m.id,n.toISODate(),branch,req.user.sub,receipt,spend]);
  if(!ins.rowCount) return res.status(409).json({error:'already_redeemed',message:"Today's coffee has already been used.",redemption:await redemptionToday(m.id)});
  await audit(req.user.sub,'redeem',m.id,{branchCode:branch,receiptNumber:receipt,spendAmount:spend});
  var fresh=await findMember(m.qr_token);
  res.json({ok:true,message:'Coffee redeemed successfully.',membership:view(fresh,ins.rows[0])});
});

app.post('/api/staff/suspend',auth,allow('super_admin','admin','manager'),async function(req,res){
  var m=await findMember(req.body.code);
  if(!m) return res.status(404).json({error:'not_found'});
  await db("UPDATE memberships SET status='suspended',updated_at=now() WHERE id=$1",[m.id]);
  await audit(req.user.sub,'suspend',m.id,{reason:String(req.body.reason||'')});
  res.json({ok:true});
});

app.get('/api/admin/dashboard',auth,allow('super_admin','admin','manager'),async function(req,res){
  var all=await Promise.all([
    db("SELECT COUNT(*) FILTER (WHERE status='pending')::int pending,COUNT(*) FILTER (WHERE status='active' AND ends_at>now())::int active,COUNT(*) FILTER (WHERE status='suspended')::int suspended,COUNT(*) FILTER (WHERE ends_at IS NOT NULL AND ends_at<=now())::int expired,COUNT(*)::int total FROM memberships"),
    db("SELECT COUNT(*) FILTER (WHERE benefit_date=$1)::int today,COUNT(*) FILTER (WHERE redeemed_at>=now()-interval '30 days')::int last30 FROM redemptions",[todayLocal()]),
    db("SELECT COALESCE(SUM(amount_lyd),0)::numeric revenue,COUNT(*)::int payments FROM membership_payments WHERE paid_at>=now()-interval '30 days'"),
    db("SELECT COUNT(*) FILTER (WHERE spend_amount>0)::int with_spend,COUNT(*)::int total,COALESCE(AVG(NULLIF(spend_amount,0)),0)::numeric avg_spend,COALESCE(SUM(spend_amount),0)::numeric additional_spend FROM redemptions WHERE redeemed_at>=now()-interval '30 days'"),
    db("SELECT benefit_date::text day,COUNT(*)::int count FROM redemptions WHERE benefit_date>=CURRENT_DATE-29 GROUP BY benefit_date ORDER BY benefit_date"),
    db("SELECT branch_code,COUNT(*)::int redemptions,COALESCE(SUM(spend_amount),0)::numeric additional_spend FROM redemptions WHERE redeemed_at>=now()-interval '30 days' GROUP BY branch_code ORDER BY redemptions DESC")
  ]);
  var a=all[3].rows[0], attach=Number(a.total)?Number((Number(a.with_spend)/Number(a.total)*100).toFixed(1)):0;
  res.json({members:all[0].rows[0],redemptions:all[1].rows[0],revenue30d:Number(all[2].rows[0].revenue),payments30d:all[2].rows[0].payments,foodAttachRate30d:attach,avgAdditionalSpend30d:Number(a.avg_spend),additionalSpend30d:Number(a.additional_spend),dailyRedemptions:all[4].rows,branchPerformance:all[5].rows,rules:{priceLyd:PRICE,days:DAYS,start:MORNING_START,end:MORNING_END,timezone:TZ}});
});

app.get('/api/admin/members',auth,allow('super_admin','admin','manager'),async function(req,res){
  var search=String(req.query.search||'').trim(), params=[], where='';
  if(search){params.push('%'+search+'%');where="WHERE c.first_name ILIKE $1 OR c.last_name ILIKE $1 OR c.phone ILIKE $1 OR m.membership_number ILIKE $1";}
  var r=await db("SELECT m.id,m.membership_number,m.status,m.starts_at,m.ends_at,m.created_at,c.first_name,c.last_name,c.phone,COUNT(rd.id)::int redemptions,COALESCE(SUM(rd.spend_amount),0)::numeric additional_spend,MAX(rd.redeemed_at) last_redemption FROM memberships m JOIN customers c ON c.id=m.customer_id LEFT JOIN redemptions rd ON rd.membership_id=m.id "+where+" GROUP BY m.id,c.id ORDER BY m.created_at DESC LIMIT 500",params);
  res.json(r.rows);
});

app.get('/api/admin/export.csv',auth,allow('super_admin','admin','manager'),async function(req,res){
  var r=await db("SELECT m.membership_number,c.first_name,c.last_name,c.phone,m.status,m.starts_at,m.ends_at,COUNT(rd.id) redemptions,COALESCE(SUM(rd.spend_amount),0) additional_spend FROM memberships m JOIN customers c ON c.id=m.customer_id LEFT JOIN redemptions rd ON rd.membership_id=m.id GROUP BY m.id,c.id ORDER BY m.created_at DESC");
  function esc(v){return '"'+String(v==null?'':v).replace(/"/g,'""')+'"';}
  var lines=['membership_number,first_name,last_name,phone,status,starts_at,ends_at,redemptions,additional_spend'];
  r.rows.forEach(function(x){lines.push([x.membership_number,x.first_name,x.last_name,x.phone,x.status,x.starts_at,x.ends_at,x.redemptions,x.additional_spend].map(esc).join(','));});
  res.type('text/csv').set('Content-Disposition','attachment; filename="morning-club-members.csv"').send(lines.join('\n'));
});

app.get('/wallet/apple/:token.pkpass',async function(req,res){
  var m=await findMember(req.params.token);
  if(!m) return res.status(404).end();
  res.status(503).json({error:'apple_wallet_pending_credentials',message:'PassKit credentials are not configured yet.'});
});
app.get('/wallet/google/:token',async function(req,res){
  var m=await findMember(req.params.token);
  if(!m) return res.status(404).end();
  res.status(503).json({error:'google_wallet_pending_credentials',message:'Google Wallet issuer credentials are not configured yet.'});
});

app.get('/',function(req,res){res.sendFile(path.join(__dirname,'public','index.html'));});
app.get('/card',function(req,res){res.sendFile(path.join(__dirname,'public','card.html'));});
app.get('/staff',function(req,res){res.sendFile(path.join(__dirname,'public','staff.html'));});
app.get('/admin',function(req,res){res.sendFile(path.join(__dirname,'public','admin.html'));});

app.use(function(err,req,res,next){console.error(err);res.status(500).json({error:'server_error'});});

initDb().then(function(){
  app.listen(PORT,function(){console.log('dipndip Morning Club live on :'+PORT+' | '+TZ+' | '+PRICE+' LYD / '+DAYS+' days');});
}).catch(function(e){console.error('Startup failed',e);process.exit(1);});
