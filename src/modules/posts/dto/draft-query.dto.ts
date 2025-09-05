import { IsOptional, IsString, IsNumber, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class DraftsQueryDto {
  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiProperty({ example: 10, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 10;

  @ApiProperty({ example: 'javascript', required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ example: 'updatedAt', required: false })
  @IsOptional()
  @IsIn(['createdAt', 'updatedAt', 'title'])
  sortBy?: string = 'updatedAt';

  @ApiProperty({ example: 'DESC', required: false })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: string = 'DESC';
}
