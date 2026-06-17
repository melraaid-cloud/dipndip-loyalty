import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch, BranchStatus } from '../../database/entities/branch.entity';

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
  ) {}

  async create(data: Partial<Branch>): Promise<Branch> {
    const branch = this.branchRepo.create(data);
    return this.branchRepo.save(branch);
  }

  async findAll(): Promise<Branch[]> {
    return this.branchRepo.find({ order: { name: 'ASC' } });
  }

  async findActive(): Promise<Branch[]> {
    return this.branchRepo.find({
      where: { status: BranchStatus.ACTIVE },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Branch> {
    const branch = await this.branchRepo.findOne({ where: { id } });
    if (!branch) throw new NotFoundException('Branch not found');
    return branch;
  }

  async update(id: string, data: Partial<Branch>): Promise<Branch> {
    const branch = await this.findOne(id);
    Object.assign(branch, data);
    return this.branchRepo.save(branch);
  }

  async updateGeofenceConfig(
    id: string,
    config: { radius: number; message: string; messageAr: string; enabled: boolean },
  ): Promise<Branch> {
    const branch = await this.findOne(id);
    branch.geofenceRadius = config.radius;
    branch.geofenceConfig = config;
    return this.branchRepo.save(branch);
  }

  async findNearby(lat: number, lng: number, radiusKm = 5): Promise<Branch[]> {
    return this.branchRepo
      .createQueryBuilder('branch')
      .where('branch.status = :status', { status: BranchStatus.ACTIVE })
      .andWhere(`
        (6371 * acos(
          cos(radians(:lat)) * cos(radians(branch.latitude)) *
          cos(radians(branch.longitude) - radians(:lng)) +
          sin(radians(:lat)) * sin(radians(branch.latitude))
        )) < :radius
      `, { lat, lng, radius: radiusKm })
      .orderBy(`
        (6371 * acos(
          cos(radians(${lat})) * cos(radians(branch.latitude)) *
          cos(radians(branch.longitude) - radians(${lng})) +
          sin(radians(${lat})) * sin(radians(branch.latitude))
        ))
      `, 'ASC')
      .getMany();
  }

  async seedDefaultBranches(): Promise<void> {
    const count = await this.branchRepo.count();
    if (count > 0) return;

    const branches = [
      {
        name: 'dipndip Ain Zara',
        nameAr: 'ديب إن ديب عين زارة',
        code: 'AZ001',
        address: 'Ain Zara Road, Tripoli',
        addressAr: 'طريق عين زارة، طرابلس',
        city: 'Tripoli',
        latitude: 32.8497,
        longitude: 13.1877,
        geofenceRadius: 200,
        geofenceConfig: {
          radius: 200,
          message: 'You are near dipndip Ain Zara! Come in for a sweet treat 🍫',
          messageAr: 'أنت بالقرب من ديب إن ديب عين زارة! تعال للاستمتاع بحلوياتنا 🍫',
          enabled: true,
        },
        status: BranchStatus.ACTIVE,
      },
      {
        name: 'dipndip Gargaresh',
        nameAr: 'ديب إن ديب قرقارش',
        code: 'GG001',
        address: 'Gargaresh Road, Tripoli',
        addressAr: 'طريق قرقارش، طرابلس',
        city: 'Tripoli',
        latitude: 32.9012,
        longitude: 13.1234,
        geofenceRadius: 200,
        geofenceConfig: {
          radius: 200,
          message: 'You are near dipndip Gargaresh 🍫 You have points waiting!',
          messageAr: 'أنت بالقرب من ديب إن ديب قرقارش 🍫 لديك نقاط في انتظارك!',
          enabled: true,
        },
        status: BranchStatus.ACTIVE,
      },
    ];

    for (const b of branches) {
      await this.branchRepo.save(this.branchRepo.create(b as any));
    }
  }
}
