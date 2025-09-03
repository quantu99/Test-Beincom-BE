import { PartialType } from '@nestjs/swagger';
import { CreatePostDto } from './create-post.dto';

export class UpdatePostDto extends PartialType(CreatePostDto) {}

// src/modules/posts/dto/posts-query.dto.ts
import { IsOptional, IsString, IsNumber, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

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
  @IsIn(['createdAt', 'title', 'views', 'likes', 'comments'])
  sortBy?: string = 'createdAt';

  @ApiProperty({ example: 'DESC', required: false })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: string = 'DESC';
}