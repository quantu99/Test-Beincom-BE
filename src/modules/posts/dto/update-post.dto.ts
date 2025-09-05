import { PartialType } from '@nestjs/swagger';
import { CreatePostDto } from './create-post.dto';

export class UpdatePostDto extends PartialType(CreatePostDto) {}

import { IsOptional, IsString, IsNumber, IsIn, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PostStatus } from '../entities/post.entity';

export class PostsQueryDto {
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

  @ApiProperty({ example: 'createdAt', required: false })
  @IsOptional()
  @IsIn(['createdAt', 'title', 'views', 'likes', 'comments', 'publishedAt'])
  sortBy?: string = 'createdAt';

  @ApiProperty({ example: 'DESC', required: false })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: string = 'DESC';

  @ApiProperty({
    enum: PostStatus,
    required: false,
    description: 'Filter by post status',
  })
  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;
}
