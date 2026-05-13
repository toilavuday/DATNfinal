import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import {
  CreateScheduleDto,
  UpdateScheduleDto,
} from '../../shared/dto/schedule.dto';

@Controller('schedule')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}


  @Get()
  findAll(@Query('userId') userId?: string, @Query('month') month?: string) {
    return this.scheduleService.findAll(userId, month);
  }


  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.scheduleService.findOne(id);
  }

  @Post()
  create(@Body() createScheduleDto: CreateScheduleDto) {
    return this.scheduleService.create(createScheduleDto);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateScheduleDto: UpdateScheduleDto,
  ) {
    return this.scheduleService.update(id, updateScheduleDto);
  }


  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.scheduleService.remove(id);
  }
}
