import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import { Customer, CustomerTier, CustomerStatus } from '../../database/entities/customer.entity';
import { Transaction, TransactionType } from '../../database/entities/transaction.entity';
import { Visit } from '../../database/entities/visit.entity';
import { Campaign } from '../../database/entities/campaign.entity';
import { Branch } from '../../database/entities/branch.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Customer) private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Transaction) private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(Visit) private readonly visitRepo: Repository<Visit>,
    @InjectRepository(Campaign) private readonly campaignRepo: Repository<Campaign>,
    @InjectRepository(Branch) private readonly branchRepo: Repository<Branch>,
  ) {}

  async getExecutiveDashboard() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalMembers,
      activeMembers,
      newMembersThisMonth,
      newMembersLastMonth,
      tierDistribution,
      pointsStats,
      revenueStats,
      visitStats,
      topCustomers,
      topBranches,
    ] = await Promise.all([
      this.customerRepo.count(),
      this.customerRepo.count({ where: { status: CustomerStatus.ACTIVE } }),
      this.customerRepo.count({ where: { createdAt: Between(thisMonthStart, now) } }),
      this.customerRepo.count({ where: { createdAt: Between(lastMonthStart, lastMonthEnd) } }),
      this.getTierDistribution(),
      this.getPointsStats(thirtyDaysAgo, now),
      this.getRevenueStats(thirtyDaysAgo, now),
      this.getVisitStats(thirtyDaysAgo, now),
      this.getTopCustomers(10),
      this.getTopBranches(10),
    ]);

    const memberGrowthRate = lastMonthStart > new Date(0) && newMembersLastMonth > 0
      ? ((newMembersThisMonth - newMembersLastMonth) / newMembersLastMonth) * 100
      : 0;

    return {
      overview: {
        totalMembers,
        activeMembers,
        newMembersThisMonth,
        memberGrowthRate: memberGrowthRate.toFixed(1),
        activeRate: totalMembers > 0 ? ((activeMembers / totalMembers) * 100).toFixed(1) : '0',
      },
      tierDistribution,
      points: pointsStats,
      revenue: revenueStats,
      visits: visitStats,
      topCustomers,
      topBranches,
    };
  }

  async getMemberGrowth(period: 'week' | 'month' | 'year' = 'month') {
    const qb = this.customerRepo.createQueryBuilder('c');

    let groupBy: string;
    let dateFormat: string;

    if (period === 'week') {
      groupBy = "DATE_TRUNC('day', c.\"createdAt\")";
      dateFormat = 'YYYY-MM-DD';
    } else if (period === 'month') {
      groupBy = "DATE_TRUNC('week', c.\"createdAt\")";
      dateFormat = 'YYYY-"W"IW';
    } else {
      groupBy = "DATE_TRUNC('month', c.\"createdAt\")";
      dateFormat = 'YYYY-MM';
    }

    const startDate = new Date();
    if (period === 'week') startDate.setDate(startDate.getDate() - 7);
    else if (period === 'month') startDate.setMonth(startDate.getMonth() - 1);
    else startDate.setFullYear(startDate.getFullYear() - 1);

    return qb
      .select(`${groupBy}`, 'period')
      .addSelect('COUNT(*)', 'count')
      .where('c."createdAt" >= :startDate', { startDate })
      .groupBy(`${groupBy}`)
      .orderBy(`${groupBy}`, 'ASC')
      .getRawMany();
  }

  async getPointsActivity(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.transactionRepo
      .createQueryBuilder('t')
      .select("DATE_TRUNC('day', t.\"createdAt\")", 'date')
      .addSelect("SUM(CASE WHEN t.points > 0 THEN t.points ELSE 0 END)", 'earned')
      .addSelect("SUM(CASE WHEN t.points < 0 THEN ABS(t.points) ELSE 0 END)", 'redeemed')
      .where('t."createdAt" >= :startDate', { startDate })
      .groupBy("DATE_TRUNC('day', t.\"createdAt\")")
      .orderBy("DATE_TRUNC('day', t.\"createdAt\")", 'ASC')
      .getRawMany();
  }

  async getRetentionMetrics() {
    const now = new Date();
    const thirtyDays = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDays = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const ninetyDays = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const [active30, active60, active90, dormant] = await Promise.all([
      this.customerRepo.count({ where: { lastVisitAt: MoreThanOrEqual(thirtyDays) } }),
      this.customerRepo.count({ where: { lastVisitAt: MoreThanOrEqual(sixtyDays) } }),
      this.customerRepo.count({ where: { lastVisitAt: MoreThanOrEqual(ninetyDays) } }),
      this.customerRepo.count({ where: { lastVisitAt: Between(new Date(0), ninetyDays) } }),
    ]);

    const total = await this.customerRepo.count();

    return {
      retentionRate30: total > 0 ? ((active30 / total) * 100).toFixed(1) : '0',
      retentionRate60: total > 0 ? ((active60 / total) * 100).toFixed(1) : '0',
      retentionRate90: total > 0 ? ((active90 / total) * 100).toFixed(1) : '0',
      dormantCustomers: dormant,
      activeCustomers30: active30,
      activeCustomers60: active60,
      activeCustomers90: active90,
    };
  }

  async getCampaignPerformance(campaignId?: string) {
    const qb = this.transactionRepo
      .createQueryBuilder('t')
      .leftJoin('t.campaign', 'c')
      .select('c.id', 'campaignId')
      .addSelect('c.name', 'campaignName')
      .addSelect('COUNT(DISTINCT t."customerId")', 'uniqueCustomers')
      .addSelect('COUNT(*)', 'totalTransactions')
      .addSelect('SUM(t.points)', 'totalPointsIssued')
      .where('t."campaignId" IS NOT NULL')
      .groupBy('c.id, c.name');

    if (campaignId) qb.andWhere('c.id = :campaignId', { campaignId });

    return qb.getRawMany();
  }

  async getVisitFrequency() {
    return this.customerRepo
      .createQueryBuilder('c')
      .select('c."totalVisits"', 'visits')
      .addSelect('COUNT(*)', 'customerCount')
      .where('c."totalVisits" > 0')
      .groupBy('c."totalVisits"')
      .orderBy('c."totalVisits"', 'ASC')
      .limit(20)
      .getRawMany();
  }

  async getCustomerLifetimeValue() {
    return this.customerRepo
      .createQueryBuilder('c')
      .select('c.tier', 'tier')
      .addSelect('AVG(c."totalSpend")', 'avgSpend')
      .addSelect('AVG(c."totalVisits")', 'avgVisits')
      .addSelect('AVG(c."totalPointsEarned")', 'avgPointsEarned')
      .addSelect('COUNT(*)', 'count')
      .groupBy('c.tier')
      .getRawMany();
  }

  private async getTierDistribution() {
    return this.customerRepo
      .createQueryBuilder('c')
      .select('c.tier', 'tier')
      .addSelect('COUNT(*)', 'count')
      .addSelect('AVG(c."pointsBalance")', 'avgPoints')
      .groupBy('c.tier')
      .getRawMany();
  }

  private async getPointsStats(from: Date, to: Date) {
    const result = await this.transactionRepo
      .createQueryBuilder('t')
      .select("SUM(CASE WHEN t.points > 0 THEN t.points ELSE 0 END)", 'totalEarned')
      .addSelect("SUM(CASE WHEN t.points < 0 THEN ABS(t.points) ELSE 0 END)", 'totalRedeemed')
      .addSelect('COUNT(DISTINCT t."customerId")', 'activeCustomers')
      .where('t."createdAt" BETWEEN :from AND :to', { from, to })
      .getRawOne();

    const totalOutstanding = await this.customerRepo
      .createQueryBuilder('c')
      .select('SUM(c."pointsBalance")', 'total')
      .getRawOne();

    return {
      ...result,
      totalOutstanding: totalOutstanding?.total || 0,
      redemptionRate: result.totalEarned > 0
        ? ((result.totalRedeemed / result.totalEarned) * 100).toFixed(1)
        : '0',
    };
  }

  private async getRevenueStats(from: Date, to: Date) {
    return this.transactionRepo
      .createQueryBuilder('t')
      .select('SUM(t."spendAmount")', 'totalRevenue')
      .addSelect('AVG(t."spendAmount")', 'avgTransactionValue')
      .addSelect('COUNT(*)', 'totalTransactions')
      .where('t."createdAt" BETWEEN :from AND :to', { from, to })
      .andWhere('t.type = :type', { type: TransactionType.EARN })
      .getRawOne();
  }

  private async getVisitStats(from: Date, to: Date) {
    return this.visitRepo
      .createQueryBuilder('v')
      .select('COUNT(*)', 'totalVisits')
      .addSelect('COUNT(DISTINCT v."customerId")', 'uniqueVisitors')
      .addSelect('COUNT(DISTINCT v."branchId")', 'activeBranches')
      .where('v."createdAt" BETWEEN :from AND :to', { from, to })
      .getRawOne();
  }

  private async getTopCustomers(limit: number) {
    return this.customerRepo
      .createQueryBuilder('c')
      .select(['c.id', 'c.firstName', 'c.lastName', 'c.membershipNumber', 'c.tier', 'c.pointsBalance', 'c.totalSpend', 'c.totalVisits'])
      .orderBy('c.totalSpend', 'DESC')
      .limit(limit)
      .getMany();
  }

  private async getTopBranches(limit: number) {
    return this.visitRepo
      .createQueryBuilder('v')
      .leftJoin('v.branch', 'b')
      .select('b.id', 'branchId')
      .addSelect('b.name', 'branchName')
      .addSelect('COUNT(*)', 'visitCount')
      .addSelect('SUM(v."spendAmount")', 'totalRevenue')
      .addSelect('COUNT(DISTINCT v."customerId")', 'uniqueCustomers')
      .groupBy('b.id, b.name')
      .orderBy('COUNT(*)', 'DESC')
      .limit(limit)
      .getRawMany();
  }
}
