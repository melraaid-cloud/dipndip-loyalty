export default () => ({
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT, 10) || 3000,
    name: process.env.APP_NAME || 'dipndip-loyalty',
    url: process.env.APP_URL || 'http://localhost:3000',
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    username: process.env.DB_USERNAME || 'dipndip',
    password: process.env.DB_PASSWORD || 'password',
    name: process.env.DB_NAME || 'dipndip_loyalty',
    ssl: process.env.DB_SSL === 'true',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    tls: process.env.REDIS_TLS === 'true',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'refresh-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  apple: {
    passTypeIdentifier: process.env.APPLE_PASS_TYPE_IDENTIFIER,
    teamIdentifier: process.env.APPLE_TEAM_IDENTIFIER,
    certPath: process.env.APPLE_CERT_PATH,
    certPassword: process.env.APPLE_CERT_PASSWORD,
    wwdrPath: process.env.APPLE_WWDR_PATH,
    pushKeyId: process.env.APPLE_PUSH_KEY_ID,
    pushKeyPath: process.env.APPLE_PUSH_KEY_PATH,
  },
  google: {
    credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    walletIssuerId: process.env.GOOGLE_WALLET_ISSUER_ID,
    walletClassPrefix: process.env.GOOGLE_WALLET_CLASS_PREFIX || 'dipndip.loyalty',
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    clientId: process.env.FIREBASE_CLIENT_ID,
  },
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY,
    fromEmail: process.env.SENDGRID_FROM_EMAIL || 'noreply@dipndip.ly',
    fromName: process.env.SENDGRID_FROM_NAME || 'dipndip Libya',
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    fromNumber: process.env.TWILIO_FROM_NUMBER,
  },
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'eu-west-1',
    s3Bucket: process.env.AWS_S3_BUCKET || 'dipndip-loyalty-assets',
  },
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL, 10) || 60,
    limit: parseInt(process.env.THROTTLE_LIMIT, 10) || 100,
  },
  encryption: {
    key: process.env.ENCRYPTION_KEY || 'dev-encryption-key-32-chars-here',
  },
  loyalty: {
    defaultPointsPerLyd: parseInt(process.env.DEFAULT_POINTS_PER_LYD, 10) || 1,
    tiers: {
      bronze: { min: 0, max: 499 },
      silver: { min: 500, max: 1499 },
      gold: { min: 1500, max: 3999 },
      platinum: { min: 4000, max: Infinity },
    },
  },
});
