import { IsOptional, IsString, IsEnum, IsNumber, Min, IsNotEmpty } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class SearchQueryDto {
  @ApiProperty({ 
    description: 'Search query string',
    example: 'javascript tutorial'
  })
  @IsString()
  @IsNotEmpty()
  q: string;

  @ApiProperty({ 
    description: 'Type of search result',
    enum: ['all', 'user', 'post'],
    required: false,
    default: 'all'
  })
  @IsOptional()
  @IsEnum(['all', 'user', 'post'])
  type?: 'all' | 'user' | 'post' = 'all';

  @ApiProperty({ 
    description: 'Page number',
    minimum: 1,
    required: false,
    default: 1
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ 
    description: 'Results per page',
    minimum: 1,
    maximum: 50,
    required: false,
    default: 10
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @ApiProperty({ 
    description: 'Sort by field',
    enum: ['relevance', 'date', 'likes'],
    required: false,
    default: 'relevance'
  })
  @IsOptional()
  @IsEnum(['relevance', 'date', 'likes'])
  sortBy?: 'relevance' | 'date' | 'likes' = 'relevance';

  @ApiProperty({ 
    description: 'Sort order',
    enum: ['ASC', 'DESC'],
    required: false,
    default: 'DESC'
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export class SearchSuggestionDto {
  @ApiProperty({ 
    description: 'Search query string',
    example: 'john'
  })
  @IsString()
  @IsNotEmpty()
  q: string;

  @ApiProperty({ 
    description: 'Limit suggestions',
    minimum: 1,
    maximum: 20,
    required: false,
    default: 5
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 5;
}