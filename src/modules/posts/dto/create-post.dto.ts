import { IsNotEmpty, IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PostStatus } from '../entities/post.entity';

export class CreatePostDto {
  @ApiProperty({ example: 'My First Blog Post' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ example: 'This is the content of my first blog post...' })
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiProperty({ example: 'https://example.com/image.jpg', required: false })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiProperty({ 
    enum: PostStatus, 
    example: PostStatus.DRAFT, 
    required: false,
    description: 'Post status - draft or published'
  })
  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus = PostStatus.DRAFT;
}