import { IsNotEmpty, IsString, IsInt, IsNumber, IsOptional } from 'class-validator';

export class CreateProfitDto {
  @IsNotEmpty()
  @IsString()
  month: string;

  @IsNotEmpty()
  @IsInt()
  year: number;

  @IsNotEmpty()
  @IsNumber()
  revenue: number;

  @IsNotEmpty()
  @IsNumber()
  stockVariation: number;

  @IsNotEmpty()
  @IsNumber()
  totalSalary: number;

  @IsNotEmpty()
  @IsNumber()
  profit: number;

  @IsOptional()
  @IsString()
  note?: string;
}
