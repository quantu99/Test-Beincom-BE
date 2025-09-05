import { PartialType } from '@nestjs/swagger';
import { CreateDraftDto } from './create-draft.dto';

export class UpdateDraftDto extends PartialType(CreateDraftDto) {}

// publish-draft.dto.ts
import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PublishDraftDto {
  @ApiProperty({ example: 'Updated title before publishing', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    example: 'Updated content before publishing',
    required: false,
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({
    example: 'https://example.com/new-image.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  image?: string;
}
