import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import * as JSZip from 'jszip';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharp = require('sharp');
import { WalletPass, WalletPassType, WalletPassStatus } from '../../database/entities/wallet-pass.entity';
import { Customer, CustomerTier } from '../../database/entities/customer.entity';

// Tier theme config
const TIER_THEMES: Record<CustomerTier, { bg: string; text: string; label: string; hex: string }> = {
  [CustomerTier.BRONZE]:   { bg: 'rgb(205,127,50)',  text: 'rgb(255,255,255)', label: 'rgb(255,228,181)', hex: '#CD7F32' },
  [CustomerTier.SILVER]:   { bg: 'rgb(180,180,180)', text: 'rgb(26,26,26)',    label: 'rgb(105,105,105)', hex: '#B4B4B4' },
  [CustomerTier.GOLD]:     { bg: 'rgb(255,215,0)',   text: 'rgb(26,26,26)',    label: 'rgb(139,105,20)',  hex: '#FFD700' },
  [CustomerTier.PLATINUM]: { bg: 'rgb(26,26,46)',    text: 'rgb(229,201,126)', label: 'rgb(201,180,114)', hex: '#1A1A2E' },
};

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);
  private readonly isDemoMode: boolean;

  constructor(
    @InjectRepository(WalletPass)
    private readonly passRepo: Repository<WalletPass>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    private readonly configService: ConfigService,
  ) {
    // Demo mode when no Apple cert path is configured
    this.isDemoMode = !this.configService.get<string>('APPLE_CERT_PATH');
    if (this.isDemoMode) {
      this.logger.warn('Wallet running in DEMO mode — passes are structurally valid but not signed by Apple');
    }
  }

  // ─── Apple Wallet ──────────────────────────────────────────────────────────

  async generateApplePass(customerId: string): Promise<Buffer> {
    const customer = await this.findCustomer(customerId);
    const passData = this.buildApplePassJson(customer);

    let pass = await this.passRepo.findOne({ where: { customerId, type: WalletPassType.APPLE } });

    if (!pass) {
      pass = this.passRepo.create({
        customerId,
        type: WalletPassType.APPLE,
        status: WalletPassStatus.ACTIVE,
        serialNumber: uuidv4(),
        passTypeIdentifier: this.configService.get('APPLE_PASS_TYPE_ID') || 'pass.ly.dipndip.loyalty.demo',
        authenticationToken: crypto.randomBytes(20).toString('hex'),
        passData,
      });
    } else {
      pass.passData = passData;
      pass.updateCount += 1;
    }

    await this.passRepo.save(pass);
    return this.buildPkpassBundle(pass, customer);
  }

  async registerAppleDevice(
    deviceLibraryIdentifier: string,
    pushToken: string,
    passTypeIdentifier: string,
    serialNumber: string,
  ): Promise<void> {
    const pass = await this.passRepo.findOne({ where: { serialNumber } });
    if (!pass) throw new NotFoundException('Pass not found');
    pass.deviceLibraryIdentifier = deviceLibraryIdentifier;
    pass.pushToken = pushToken;
    await this.passRepo.save(pass);
    this.logger.log(`Device registered: ${deviceLibraryIdentifier} → pass ${serialNumber}`);
  }

  async updatePass(customerId: string): Promise<void> {
    const customer = await this.findCustomer(customerId);
    const passes = await this.passRepo.find({ where: { customerId, status: WalletPassStatus.ACTIVE } });

    for (const pass of passes) {
      try {
        if (pass.type === WalletPassType.APPLE && pass.pushToken) {
          this.logger.log(`[Apple] Push update → device ${pass.deviceLibraryIdentifier}`);
          // APNs push would go here with real credentials
        } else if (pass.type === WalletPassType.GOOGLE) {
          this.logger.log(`[Google] Updating pass object ${pass.googlePassObjectId}`);
          // Google Wallet API update would go here
        }
        pass.lastPushedAt = new Date();
        pass.passData = pass.type === WalletPassType.APPLE
          ? this.buildApplePassJson(customer)
          : this.buildGooglePassObject(customer, pass.googlePassObjectId!);
        pass.updateCount += 1;
        await this.passRepo.save(pass);
      } catch (err) {
        this.logger.error(`Failed to update ${pass.type} pass for customer ${customerId}`, err);
      }
    }
  }

  // ─── Google Wallet ─────────────────────────────────────────────────────────

  async generateGooglePassUrl(customerId: string): Promise<string> {
    const customer = await this.findCustomer(customerId);
    const issuerId = this.configService.get('GOOGLE_ISSUER_ID') || 'demo_issuer';
    const classId   = this.configService.get('GOOGLE_CLASS_ID') || `${issuerId}.dipndip_loyalty`;
    const objectId  = `${issuerId}.${customer.membershipNumber}`;

    const passObject = this.buildGooglePassObject(customer, objectId);

    let pass = await this.passRepo.findOne({ where: { customerId, type: WalletPassType.GOOGLE } });

    // Build save URL
    const saveUrl = this.buildGoogleSaveUrl(passObject, classId, issuerId);

    if (!pass) {
      pass = this.passRepo.create({
        customerId,
        type: WalletPassType.GOOGLE,
        status: WalletPassStatus.ACTIVE,
        googlePassObjectId: objectId,
        googlePassUrl: saveUrl,
        passData: passObject,
      });
    } else {
      pass.googlePassUrl = saveUrl;
      pass.passData = passObject;
      pass.updateCount += 1;
    }

    await this.passRepo.save(pass);
    return saveUrl;
  }

  async getPassesForCustomer(customerId: string): Promise<WalletPass[]> {
    return this.passRepo.find({ where: { customerId } });
  }

  // ─── Private: Apple pass JSON ──────────────────────────────────────────────

  private buildApplePassJson(customer: Customer) {
    const theme = TIER_THEMES[customer.tier] ?? TIER_THEMES[CustomerTier.BRONZE];
    const passTypeId = this.configService.get('APPLE_PASS_TYPE_ID') || 'pass.ly.dipndip.loyalty.demo';
    const teamId     = this.configService.get('APPLE_TEAM_ID') || 'DEMOXXXXX';

    return {
      formatVersion: 1,
      passTypeIdentifier: passTypeId,
      serialNumber: uuidv4(),
      teamIdentifier: teamId,
      organizationName: 'dipndip Libya',
      description: `dipndip Loyalty Card — ${customer.tier.toUpperCase()}`,
      logoText: 'dipndip 🍫',
      foregroundColor: theme.text,
      backgroundColor: theme.bg,
      labelColor: theme.label,
      storeCard: {
        headerFields: [
          { key: 'tier', label: 'TIER', value: customer.tier.toUpperCase() },
        ],
        primaryFields: [
          { key: 'points', label: 'POINTS BALANCE', value: customer.pointsBalance.toString() },
        ],
        secondaryFields: [
          { key: 'name',       label: 'MEMBER',   value: customer.fullName },
          { key: 'membership', label: 'CARD NO.', value: customer.membershipNumber },
        ],
        auxiliaryFields: [
          { key: 'visits',    label: 'VISITS',       value: customer.totalVisits.toString() },
          { key: 'spend',     label: 'TOTAL SPEND',  value: `${Number(customer.totalSpend).toFixed(3)} LYD` },
          {
            key: 'lastVisit',
            label: 'LAST VISIT',
            value: customer.lastVisitAt
              ? new Date(customer.lastVisitAt).toLocaleDateString('en-LY')
              : 'First visit soon!',
          },
        ],
        backFields: [
          { key: 'member_since', label: 'Member Since', value: new Date(customer.createdAt).toLocaleDateString('en-LY') },
          { key: 'birthday',     label: 'Birthday',     value: customer.birthday ? new Date(customer.birthday).toLocaleDateString('en-LY') : 'Not set' },
          { key: 'how_to_earn',  label: 'How to Earn',  value: '1 LYD = 1 Point. Show your QR code at checkout.' },
          { key: 'tiers',        label: 'Tier Levels',  value: 'Bronze 0–499 | Silver 500–1,499 | Gold 1,500–3,999 | Platinum 4,000+' },
          { key: 'contact',      label: 'Contact',      value: 'loyalty@dipndip.ly | +218 91 XXX XXXX' },
          ...(this.isDemoMode ? [{ key: 'demo_notice', label: '⚠️ Demo Pass', value: 'This pass is unsigned. Provide Apple credentials for production.' }] : []),
        ],
      },
      barcode: {
        message: customer.membershipNumber,
        format: 'PKBarcodeFormatQR',
        messageEncoding: 'iso-8859-1',
        altText: customer.membershipNumber,
      },
      webServiceURL: `${this.configService.get('APP_URL') || 'http://localhost:3000/api/v1'}/wallet/apple`,
      authenticationToken: crypto.randomBytes(20).toString('hex'),
    };
  }

  // ─── Private: Build .pkpass ZIP bundle ────────────────────────────────────

  private async buildPkpassBundle(pass: WalletPass, customer: Customer): Promise<Buffer> {
    const zip = new JSZip();
    const theme = TIER_THEMES[customer.tier] ?? TIER_THEMES[CustomerTier.BRONZE];

    const passJson = Buffer.from(JSON.stringify(pass.passData, null, 2));
    const iconPng  = await this.generateColoredPng(29,  29,  theme.hex);
    const icon2Png = await this.generateColoredPng(58,  58,  theme.hex);
    const logoPng  = await this.generateColoredPng(160, 50,  theme.hex);
    const logo2Png = await this.generateColoredPng(320, 100, theme.hex);
    const stripPng = await this.generateColoredPng(375, 98,  theme.hex);

    const files: Record<string, Buffer> = {
      'pass.json':    passJson,
      'icon.png':     iconPng,
      'icon@2x.png':  icon2Png,
      'logo.png':     logoPng,
      'logo@2x.png':  logo2Png,
      'strip.png':    stripPng,
      'strip@2x.png': stripPng,
    };

    // Build SHA-1 manifest
    const manifest: Record<string, string> = {};
    for (const [name, buf] of Object.entries(files)) {
      manifest[name] = crypto.createHash('sha1').update(buf).digest('hex');
      zip.file(name, buf);
    }

    const manifestBuf = Buffer.from(JSON.stringify(manifest));
    manifest['manifest.json'] = crypto.createHash('sha1').update(manifestBuf).digest('hex');
    zip.file('manifest.json', manifestBuf);

    // Signature: placeholder in demo mode (256 zero bytes)
    // In production replace with real PKCS#7 signed data
    zip.file('signature', Buffer.alloc(256, 0));

    return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });
  }

  // ─── Private: Google Wallet pass object & JWT ──────────────────────────────

  private buildGooglePassObject(customer: Customer, objectId: string) {
    const theme = TIER_THEMES[customer.tier] ?? TIER_THEMES[CustomerTier.BRONZE];
    const issuerId = this.configService.get('GOOGLE_ISSUER_ID') || 'demo_issuer';
    const classId  = this.configService.get('GOOGLE_CLASS_ID') || `${issuerId}.dipndip_loyalty`;

    return {
      id: objectId,
      classId,
      state: 'ACTIVE',
      accountId: customer.membershipNumber,
      accountName: customer.fullName,
      loyaltyPoints: {
        balance: { string: customer.pointsBalance.toString() },
        label: 'Points',
      },
      secondaryLoyaltyPoints: {
        balance: { string: customer.tier.toUpperCase() },
        label: 'Tier',
      },
      barcode: {
        type: 'QR_CODE',
        value: customer.membershipNumber,
        alternateText: customer.membershipNumber,
      },
      textModulesData: [
        { header: 'Total Visits',  body: customer.totalVisits.toString() },
        { header: 'Total Spend',   body: `${Number(customer.totalSpend).toFixed(3)} LYD` },
        { header: 'Member Since',  body: new Date(customer.createdAt).toLocaleDateString('en-LY') },
      ],
      hexBackgroundColor: theme.hex,
      heroImage: {
        sourceUri: { uri: 'https://via.placeholder.com/1032x336/7B2C2C/FFFFFF?text=dipndip+Loyalty' },
        contentDescription: { defaultValue: { language: 'en-US', value: 'dipndip Loyalty Card' } },
      },
    };
  }

  private buildGoogleSaveUrl(passObject: any, classId: string, issuerId: string): string {
    const serviceAccountEmail = this.configService.get<string>('GOOGLE_SERVICE_ACCOUNT_EMAIL') || 'demo@demo.iam.gserviceaccount.com';
    const signingKey = this.configService.get<string>('GOOGLE_SIGNING_KEY') || 'demo_secret_key_for_testing_only';

    const payload = {
      iss: serviceAccountEmail,
      aud: 'google',
      typ: 'savetowallet',
      iat: Math.floor(Date.now() / 1000),
      payload: {
        loyaltyObjects: [passObject],
      },
    };

    // In production this should be RS256 with a real service account private key.
    // Demo uses HS256 — Google will reject it but the URL structure is correct.
    const token = jwt.sign(payload, signingKey, { algorithm: 'HS256' });
    return `https://pay.google.com/gp/v/save/${token}`;
  }

  // ─── Private: Generate minimal colored PNG ─────────────────────────────────

  private async generateColoredPng(width: number, height: number, hexColor: string): Promise<Buffer> {
    // Parse hex color
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);

    // Build raw RGBA pixel data
    const channels = 4;
    const pixels = Buffer.alloc(width * height * channels);
    for (let i = 0; i < width * height; i++) {
      pixels[i * 4]     = r;
      pixels[i * 4 + 1] = g;
      pixels[i * 4 + 2] = b;
      pixels[i * 4 + 3] = 255;
    }

    return sharp(pixels, { raw: { width, height, channels } }).png().toBuffer();
  }

  // ─── Private: Helpers ──────────────────────────────────────────────────────

  private async findCustomer(customerId: string): Promise<Customer> {
    const customer = await this.customerRepo.findOne({ where: { id: customerId } });
    if (!customer) throw new NotFoundException(`Customer ${customerId} not found`);
    return customer;
  }
}
