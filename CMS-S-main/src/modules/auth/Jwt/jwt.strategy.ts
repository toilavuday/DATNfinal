import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { JwtPayload } from './jwt-payload.interface';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: 'your_jwt_secret',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.authService.validateUser(payload.email);
    if (!user) {
      throw new UnauthorizedException('Người dùng không tồn tại');
    }
    return user;
  }
}
