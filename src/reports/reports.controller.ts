import { Controller, Get, Post, HttpCode } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('api/v1/reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get()
  report() {
    return {
      'accounts.csv': this.reportsService.getState('accounts'),
      'yearly.csv': this.reportsService.getState('yearly'),
      'fs.csv': this.reportsService.getState('fs'),
    };
  }

  @Post()
  @HttpCode(201)
  generate() {
    this.reportsService.schedule('accounts');
    this.reportsService.schedule('yearly');
    this.reportsService.schedule('fs');
    return { message: 'scheduled' };
  }
}
