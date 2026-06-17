import {
  Injectable, UnauthorizedException, BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { Staff, StaffRole, StaffStatus } from '../../database/entities/staff.entity';
import { Customer, CustomerStatus } from '../../database/entities/customer.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Staff) private readonly staffRepo: Repository<Staff>,
    @InjectRepository(Customer) private readonly customerRepo: Repository<Customer>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateStaff(email: string, password: string): Promise<Staff | null> {
    const staff = await this.staffRepo.findOne({ where: { email } });
    if (!staff || staff.status !== StaffStatus.ACTIVE) return null;
    const valid = await bcrypt.compare(password, staff.passwordHash);
    return valid ? staff : null;
  }

  async staffLogin(email: string, password: string) {
    const staff = await this.validateStaff(email, password);
    if (!staff) throw new UnauthorizedException('Invalid credentials');

    staff.lastLoginAt = new Date();
    await this.staffRepo.save(staff);

    const payload = { sub: staff.id, email: staff.email, role: staff.role, type: 'staff' };
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('jwt.secret'),
      expiresIn: this.configService.get('jwt.expiresIn'),
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('jwt.refreshSecret'),
      expiresIn: this.configService.get('jwt.refreshExpiresIn'),
    });

    staff.refreshToken = await bcrypt.hash(refreshToken, 8);
    await this.staffRepo.save(staff);

    return {
      accessToken,
      refreshToken,
      staff: {
        id: staff.id,
        firstName: staff.firstName,
        lastName: staff.lastName,
        email: staff.email,
        role: staff.role,
        branchIds: staff.branchIds,
      },
    };
  }

  async customerLogin(identifier: string, password: string) {
    const customer = await this.customerRepo.findOne({
      where: [{ email: identifier }, { phone: identifier }],
    });

    if (!customer || !customer.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (customer.status !== CustomerStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not active');
    }

    const valid = await bcrypt.compare(password, customer.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const payload = { sub: customer.id, email: customer.email, type: 'customer' };
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('jwt.secret'),
      expiresIn: this.configService.get('jwt.expiresIn'),
    });

    return {
      accessToken,
      customer: {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        membershipNumber: customer.membershipNumber,
        tier: customer.tier,
        pointsBalance: customer.pointsBalance,
      },
    };
  }

  async refreshToken(token: string) {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('jwt.refreshSecret'),
      });

      const staff = await this.staffRepo.findOne({ where: { id: payload.sub } });
      if (!staff || !staff.refreshToken) throw new UnauthorizedException();

      const valid = await bcrypt.compare(token, staff.refreshToken);
      if (!valid) throw new UnauthorizedException();

      const newPayload = { sub: staff.id, email: staff.email, role: staff.role, type: 'staff' };
      const accessToken = this.jwtService.sign(newPayload, {
        secret: this.configService.get('jwt.secret'),
        expiresIn: this.configService.get('jwt.expiresIn'),
      });

      return { accessToken };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async createSuperAdmin(email: string, password: string, firstName: string, lastName: string, setupKey?: string): Promise<Staff> {
    const expectedKey = process.env.SETUP_KEY || 'dipndip-setup-2024';
    if (setupKey !== expectedKey) throw new BadRequestException('Invalid setup key');

    const existing = await this.staffRepo.findOne({ where: { email } });
    if (existing) throw new BadRequestException('Admin already exists');

    const staff = this.staffRepo.create({
      email,
      firstName,
      lastName,
      passwordHash: await bcrypt.hash(password, 12),
      role: StaffRole.SUPER_ADMIN,
      status: StaffStatus.ACTIVE,
    });

    return this.staffRepo.save(staff);
  }

  async changePassword(staffId: string, currentPassword: string, newPassword: string): Promise<void> {
    const staff = await this.staffRepo.findOne({ where: { id: staffId } });
    if (!staff) throw new UnauthorizedException();

    const valid = await bcrypt.compare(currentPassword, staff.passwordHash);
    if (!valid) throw new BadRequestException('Current password is incorrect');

    staff.passwordHash = await bcrypt.hash(newPassword, 12);
    await this.staffRepo.save(staff);
  }
}
