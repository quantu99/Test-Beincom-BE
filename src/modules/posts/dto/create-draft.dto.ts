import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDraftDto {
  @ApiProperty({ example: 'My Draft Post' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ example: 'This is draft content...' })
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiProperty({ example: 'https://example.com/image.jpg', required: false })
  @IsOptional()
  @IsString()
  image?: string;
}
