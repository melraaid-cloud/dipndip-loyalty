import { Controller, Get, Header, Res } from '@nestjs/common';
import { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { readFileSync } from 'fs';
import { join } from 'path';

@Controller('register')
export class RegisterController {
  private readonly html: string;

  constructor() {
    try {
      this.html = readFileSync(join(__dirname, '..', '..', '..', 'public', 'register', 'index.html'), 'utf8');
    } catch {
      this.html = '<h1>Registration page not found</h1>';
    }
  }

  @Get()
  @Public()
  @Header('Content-Type', 'text/html; charset=utf-8')
  getRegisterPage(@Res() res: Response) {
    res.send(this.html);
  }
}
