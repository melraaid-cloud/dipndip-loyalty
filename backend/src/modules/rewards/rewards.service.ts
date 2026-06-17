import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reward, RewardStatus } from '../../database/entities/reward.entity';

@Injectable()
export class RewardsService {
  constructor(
    @InjectRepository(Reward)
    private readonly rewardRepo: Repository<Reward>,
  ) {}

  async create(data: Partial<Reward>): Promise<Reward> {
    const reward = this.rewardRepo.create(data);
    return this.rewardRepo.save(reward);
  }

  async findAll(): Promise<Reward[]> {
    return this.rewardRepo.find({ order: { sortOrder: 'ASC', createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Reward> {
    const reward = await this.rewardRepo.findOne({ where: { id } });
    if (!reward) throw new NotFoundException('Reward not found');
    return reward;
  }

  async update(id: string, data: Partial<Reward>): Promise<Reward> {
    const reward = await this.findOne(id);
    Object.assign(reward, data);
    return this.rewardRepo.save(reward);
  }

  async seedDefaultRewards(): Promise<void> {
    const count = await this.rewardRepo.count();
    if (count > 0) return;

    const rewards = [
      { name: 'Free Coffee', nameAr: 'قهوة مجانية', type: 'free_item' as any, pointsCost: 100, freeItemName: 'Any Coffee', sortOrder: 1, status: RewardStatus.ACTIVE, isActive: true, isFeatured: true },
      { name: 'Free Dessert', nameAr: 'حلوى مجانية', type: 'free_item' as any, pointsCost: 250, freeItemName: 'Any Dessert', sortOrder: 2, status: RewardStatus.ACTIVE, isActive: true, isFeatured: true },
      { name: 'Free Signature Item', nameAr: 'طبق مميز مجاني', type: 'free_item' as any, pointsCost: 500, freeItemName: 'Any Signature Item', sortOrder: 3, status: RewardStatus.ACTIVE, isActive: true, isFeatured: false },
      { name: '10% Discount', nameAr: 'خصم 10%', type: 'percentage_discount' as any, pointsCost: 150, discountPercentage: 10, sortOrder: 4, status: RewardStatus.ACTIVE, isActive: true, isFeatured: false },
    ];

    for (const r of rewards) {
      await this.rewardRepo.save(this.rewardRepo.create(r));
    }
  }
}
