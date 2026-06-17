import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Staff } from '../../database/entities/staff.entity';
import { Customer } from '../../database/entities/customer.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Staff) private readonly staffRepo: Repository<Staff>,
    @InjectRepository(Customer) private readonly customerRepo: Repository<Customer>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('jwt.secret'),
    });
  }

  async validate(payload: { sub: string; email: string; role: string; type: string }) {
    if (payload.type === 'staff') {
      const staff = await this.staffRepo.findOne({ where: { id: payload.sub } });
      if (!staff) throw new UnauthorizedException();
      return { id: staff.id, email: staff.email, role: staff.role, type: 'staff' };
    }

    const customer = await this.customerRepo.findOne({ where: { id: payload.sub } });
    if (!customer) throw new UnauthorizedException();
    return { id: customer.id, email: customer.email, role: 'customer', type: 'customer' };
  }
}
