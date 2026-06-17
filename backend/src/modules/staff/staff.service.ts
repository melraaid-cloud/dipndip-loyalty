import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Staff, StaffRole, StaffStatus } from '../../database/entities/staff.entity';

@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(Staff)
    private readonly staffRepo: Repository<Staff>,
  ) {}

  async create(data: Partial<Staff> & { password: string }): Promise<Staff> {
    const existing = await this.staffRepo.findOne({ where: { email: data.email } });
    if (existing) throw new ConflictException('Staff member with this email already exists');

    const staff = this.staffRepo.create({
      ...data,
      passwordHash: await bcrypt.hash(data.password, 12),
      status: StaffStatus.ACTIVE,
    });
    return this.staffRepo.save(staff);
  }

  async findAll(): Promise<Staff[]> {
    return this.staffRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Staff> {
    const staff = await this.staffRepo.findOne({ where: { id } });
    if (!staff) throw new NotFoundException('Staff member not found');
    return staff;
  }

  async update(id: string, data: Partial<Staff>): Promise<Staff> {
    const staff = await this.findOne(id);
    Object.assign(staff, data);
    return this.staffRepo.save(staff);
  }

  async resetPassword(id: string, newPassword: string): Promise<void> {
    const staff = await this.findOne(id);
    staff.passwordHash = await bcrypt.hash(newPassword, 12);
    await this.staffRepo.save(staff);
  }

  async deactivate(id: string): Promise<Staff> {
    return this.update(id, { status: StaffStatus.INACTIVE });
  }
}
