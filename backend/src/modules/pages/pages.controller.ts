import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { readFileSync } from 'fs';
import { join } from 'path';

function loadHtml(name: string): string {
  try {
    return readFileSync(join(__dirname, '..', '..', '..', 'public', name, 'index.html'), 'utf8');
  } catch {
    return `<!DOCTYPE html><html><body style="background:#0d0805;color:#c8860a;font-family:sans-serif;text-align:center;padding:60px">
      <h1>🍫 dipndip</h1><p>Page not found: ${name}</p></body></html>`;
  }
}

@Controller()
export class PagesController {
  private readonly joinHtml   = loadHtml('join');
  private readonly cardHtml   = loadHtml('card');
  private readonly adminHtml  = loadHtml('admin');

  @Get('join')
  @Public()
  join(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(this.joinHtml);
  }

  @Get('card/:id')
  @Public()
  card(@Param('id') _id: string, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(this.cardHtml);
  }

  @Get('admin')
  @Public()
  admin(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(this.adminHtml);
  }

  @Get('admin/*')
  @Public()
  adminWildcard(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(this.adminHtml);
  }
}
