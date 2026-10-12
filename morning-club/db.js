const { Pool } = require('pg');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { DateTime } = require('luxon');

const TZ = process.env.TIMEZONE || 'Africa/Tripoli';
const PRICE = Number(process.env.MEMBERSHIP_PRICE_LYD || 99);
const DAYS = Number(process.env.MEMBERSHIP_DAYS || 30);
const MORNING_START = process.env.MORNING_START || '08:00';
const MORNING_END = process.env.MORNING_END || '10:00';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
});
const q=(text,params=[])=>pool.query(text,params);
const localNow=()=>DateTime.now().setZone(TZ);
const localDate=()=>localNow().toISODate();
const randomToken=()=>crypto.randomBytes(18).toString('base64url');
const sanitizePhone=v=>String(v||'').replace(/[^\d+]/g,'').trim();

function inWindow(dt=localNow()){
  const [sh,sm]=MORNING_START.split(':').map(Number),[eh,em]=MORNING_END.split(':').map(Number);
  const m=dt.hour*60+dt.minute;
  return m>=sh*60+sm && m<eh*60+em;
}
function statusOf(row){
  if(!row)return'none';
  if(row.status==='suspended')return'suspended';
  if(!row.starts_at||!row.ends_at||row.status==='pending')return'pending';
  return DateTime.fromJSDate(new Date(row.ends_at))<=DateTime.now()?'expired':'active';
}

async function initDb(){
  await q('CREATE EXTENSION IF NOT EXISTS pgcrypto');
  await q(`CREATE TABLE IF NOT EXISTS customers(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name text NOT NULL,last_name text NOT NULL,phone text NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now())`);
  await q(`CREATE TABLE IF NOT EXISTS staff(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text NOT NULL,email text NOT NULL UNIQUE,
    password_hash text NOT NULL,role text NOT NULL CHECK(role IN('super_admin','admin','manager','cashier')),
    branch_codes text[] NOT NULL DEFAULT '{}',active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),last_login_at timestamptz)`);
  await q(`CREATE TABLE IF NOT EXISTS memberships(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    membership_number text NOT NULL UNIQUE,qr_token text NOT NULL UNIQUE,
    status text NOT NULL DEFAULT 'pending' CHECK(status IN('pending','active','suspended','expired')),
    starts_at timestamptz,ends_at timestamptz,price_lyd numeric(10,3) NOT NULL DEFAULT 99,
    activation_branch_code text,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now())`);
  await q(`CREATE UNIQUE INDEX IF NOT EXISTS one_open_membership_per_customer ON memberships(customer_id)
    WHERE status IN('pending','active','suspended')`);
  await q(`CREATE TABLE IF NOT EXISTS membership_payments(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),membership_id uuid NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
    type text NOT NULL CHECK(type IN('activation','renewal')),amount_lyd numeric(10,3) NOT NULL,
    payment_method text NOT NULL DEFAULT 'cash',branch_code text,receipt_number text,
    staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,paid_at timestamptz NOT NULL DEFAULT now())`);
  await q(`CREATE TABLE IF NOT EXISTS redemptions(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),membership_id uuid NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
    benefit_date date NOT NULL,redeemed_at timestamptz NOT NULL DEFAULT now(),branch_code text NOT NULL,
    staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,receipt_number text,
    spend_amount numeric(10,3) NOT NULL DEFAULT 0,UNIQUE(membership_id,benefit_date))`);
  await q(`CREATE TABLE IF NOT EXISTS audit_log(
    id bigserial PRIMARY KEY,staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,action text NOT NULL,
    membership_id uuid REFERENCES memberships(id) ON DELETE SET NULL,payload jsonb,created_at timestamptz NOT NULL DEFAULT now())`);
  await q(`CREATE TABLE IF NOT EXISTS wallet_registrations(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),membership_id uuid NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
    platform text NOT NULL CHECK(platform IN('apple','google')),device_id text,push_token text,serial_number text,
    created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(platform,device_id,serial_number))`);

  const email=String(process.env.ADMIN_EMAIL||'').trim().toLowerCase(),password=String(process.env.ADMIN_PASSWORD||'');
  if(email&&password){
    const r=await q('SELECT id FROM staff WHERE email=$1',[email]);
    if(!r.rowCount){
      const hash=await bcrypt.hash(password,12);
      await q("INSERT INTO staff(name,email,password_hash,role) VALUES($1,$2,$3,'super_admin')",
        [process.env.ADMIN_NAME||'dipndip Admin',email,hash]);
    }
  }
}

async function audit(staffId,action,membershipId,payload={}){
  await q('INSERT INTO audit_log(staff_id,action,membership_id,payload) VALUES($1,$2,$3,$4)',
    [staffId||null,action,membershipId||null,JSON.stringify(payload)]).catch(()=>{});
}
async function findMember(code){
  let c=String(code||'').trim();if(c.startsWith('MC:'))c=c.slice(3);
  const r=await q(`SELECT m.*,c.first_name,c.last_name,c.phone FROM memberships m
    JOIN customers c ON c.id=m.customer_id
    WHERE m.qr_token=$1 OR m.membership_number=$1 OR c.phone=$1 LIMIT 1`,[c]);
  return r.rows[0]||null;
}
async function todayRedemption(id){
  const r=await q('SELECT * FROM redemptions WHERE membership_id=$1 AND benefit_date=$2',[id,localDate()]);
  return r.rows[0]||null;
}
function view(row,red=null){
  const st=statusOf(row),now=localNow(),win=inWindow(now);
  return {
    membershipNumber:row.membership_number,token:row.qr_token,name:`${row.first_name} ${row.last_name}`.trim(),
    phone:row.phone,status:st,startsAt:row.starts_at,endsAt:row.ends_at,priceLyd:Number(row.price_lyd),
    dailyWindow:`${MORNING_START}–${MORNING_END}`,timezone:TZ,today:now.toISODate(),inMorningWindow:win,
    redeemedToday:Boolean(red),redeemedAt:red?.redeemed_at||null,availableToday:st==='active'&&win&&!red,
    qrValue:`MC:${row.qr_token}`,
    rules:{oneSelectedCoffeePerDay:true,everyDay:true,noRollover:true,nonTransferable:true,validityDays:DAYS}
  };
}

async function registerCustomer({firstName,lastName,phone}){
  const clean=sanitizePhone(phone);
  if(String(firstName||'').trim().length<2||String(lastName||'').trim().length<2||clean.length<7)
    throw Object.assign(new Error('invalid_data'),{status:400});
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    let c=(await client.query('SELECT * FROM customers WHERE phone=$1',[clean])).rows[0];
    if(!c)c=(await client.query('INSERT INTO customers(first_name,last_name,phone) VALUES($1,$2,$3) RETURNING *',
      [firstName.trim(),lastName.trim(),clean])).rows[0];
    else await client.query('UPDATE customers SET first_name=$1,last_name=$2 WHERE id=$3',[firstName.trim(),lastName.trim(),c.id]);
    let m=(await client.query(`SELECT * FROM memberships WHERE customer_id=$1 AND status IN('pending','active','suspended')
      ORDER BY created_at DESC LIMIT 1`,[c.id])).rows[0];
    if(!m){
      const num=`MC${DateTime.now().setZone(TZ).toFormat('yyLL')}${crypto.randomInt(100000,999999)}`;
      m=(await client.query('INSERT INTO memberships(customer_id,membership_number,qr_token,price_lyd) VALUES($1,$2,$3,$4) RETURNING *',
        [c.id,num,randomToken(),PRICE])).rows[0];
    }
    await client.query('COMMIT');
    return {...m,first_name:firstName.trim(),last_name:lastName.trim(),phone:clean};
  }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
}

module.exports={pool,q,initDb,audit,findMember,todayRedemption,view,registerCustomer,statusOf,
  localNow,localDate,inWindow,TZ,PRICE,DAYS,MORNING_START,MORNING_END};
