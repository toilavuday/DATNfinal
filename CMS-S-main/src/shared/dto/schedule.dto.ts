import {
  IsNotEmpty,
  IsString,
  IsInt,
  IsDateString,
  IsArray,
  ArrayNotEmpty,
  IsIn,
} from 'class-validator';

export class CreateScheduleDto {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsDateString()
  date: string;

  @IsNotEmpty()
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(['Ca 1', 'Ca 2', 'Ca 3'], { each: true })
  shifts: string[];

  @IsInt()
  hoursWorked: number;

  @IsNotEmpty()
  @IsString()
  status: string;
}

export class UpdateScheduleDto {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsDateString()
  date: string;

  @IsNotEmpty()
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(['Ca 1', 'Ca 2', 'Ca 3'], { each: true })
  shifts: string[];

  @IsInt()
  hoursWorked: number;

  @IsNotEmpty()
  @IsString()
  status: string;

  @IsString()
  notes?: string;
}
