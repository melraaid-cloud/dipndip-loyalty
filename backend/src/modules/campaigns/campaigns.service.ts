import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Campaign, CampaignStatus, CampaignType } from '../../database/entities/campaign.entity';
import { Customer, CustomerTier, CustomerStatus } from '../../database/entities/customer.entity';

@Injectable()
export class CampaignsService {
  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectQueue('notifications') private readonly notificationsQueue: Queue,
  ) {}

  async create(data: Partial<Campaign>, staffId: string): Promise<Campaign> {
    const campaign = this.campaignRepo.create({
      ...data,
      createdByStaffId: staffId,
      status: data.startDate && new Date(data.startDate) > new Date()
        ? CampaignStatus.SCHEDULED
        : CampaignStatus.DRAFT,
    });
    return this.campaignRepo.save(campaign);
  }

  async findAll(filters?: {
    status?: CampaignStatus;
    type?: CampaignType;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 20, status, type } = filters || {};

    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const [data, total] = await this.campaignRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string): Promise<Campaign> {
    const campaign = await this.campaignRepo.findOne({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    return campaign;
  }

  async update(id: string, data: Partial<Campaign>): Promise<Campaign> {
    const campaign = await this.findOne(id);
    if (campaign.status === CampaignStatus.COMPLETED || campaign.status === CampaignStatus.CANCELLED) {
      throw new BadRequestException('Cannot update completed or cancelled campaigns');
    }
    Object.assign(campaign, data);
    return this.campaignRepo.save(campaign);
  }

  async activate(id: string): Promise<Campaign> {
    const campaign = await this.findOne(id);
    campaign.status = CampaignStatus.ACTIVE;
    const saved = await this.campaignRepo.save(campaign);

    if (campaign.sendPushNotification) {
      await this.sendCampaignNotifications(campaign);
    }

    return saved;
  }

  async pause(id: string): Promise<Campaign> {
    const campaign = await this.findOne(id);
    campaign.status = CampaignStatus.PAUSED;
    return this.campaignRepo.save(campaign);
  }

  async cancel(id: string): Promise<Campaign> {
    const campaign = await this.findOne(id);
    campaign.status = CampaignStatus.CANCELLED;
    return this.campaignRepo.save(campaign);
  }

  async getActiveCampaigns(branchId?: string): Promise<Campaign[]> {
    const now = new Date();
    const qb = this.campaignRepo.createQueryBuilder('c')
      .where('c.status = :status', { status: CampaignStatus.ACTIVE })
      .andWhere('(c."startDate" IS NULL OR c."startDate" <= :now)', { now })
      .andWhere('(c."endDate" IS NULL OR c."endDate" >= :now)', { now });

    if (branchId) {
      qb.andWhere(
        '(c."branchIds" IS NULL OR c."branchIds" = \'{}\' OR :branchId = ANY(c."branchIds"))',
        { branchId },
      );
    }

    return qb.getMany();
  }

  async processScheduledCampaigns(): Promise<void> {
    const now = new Date();

    const toActivate = await this.campaignRepo.find({
      where: {
        status: CampaignStatus.SCHEDULED,
        startDate: LessThanOrEqual(now),
      },
    });

    for (const campaign of toActivate) {
      campaign.status = CampaignStatus.ACTIVE;
      await this.campaignRepo.save(campaign);
      if (campaign.sendPushNotification) {
        await this.sendCampaignNotifications(campaign);
      }
    }

    const toComplete = await this.campaignRepo.find({
      where: {
        status: CampaignStatus.ACTIVE,
        endDate: LessThanOrEqual(now),
      },
    });

    for (const campaign of toComplete) {
      campaign.status = CampaignStatus.COMPLETED;
      await this.campaignRepo.save(campaign);
    }
  }

  private async sendCampaignNotifications(campaign: Campaign): Promise<void> {
    const qb = this.customerRepo.createQueryBuilder('c')
      .where('c.status = :status', { status: CustomerStatus.ACTIVE });

    if (campaign.targetAudience !== 'all') {
      if (['bronze', 'silver', 'gold', 'platinum'].includes(campaign.targetAudience)) {
        qb.andWhere('c.tier = :tier', { tier: campaign.targetAudience });
      }
    }

    const customers = await qb.select(['c.id']).getMany();
    const customerIds = customers.map((c) => c.id);

    const batchSize = 100;
    for (let i = 0; i < customerIds.length; i += batchSize) {
      const batch = customerIds.slice(i, i + batchSize);
      await this.notificationsQueue.add(
        'campaign-batch',
        {
          customerIds: batch,
          title: campaign.notificationTitle || campaign.name,
          body: campaign.notificationBody || campaign.description,
          campaignId: campaign.id,
        },
        { delay: i * 100 },
      );
    }
  }
}
