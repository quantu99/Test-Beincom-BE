import {
  Controller,
  Get,
  Query,
  ValidationPipe,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { SearchService } from './search.service';
import { SearchQueryDto, SearchSuggestionDto } from './dto/search-query.dto';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ 
    summary: 'Full search with pagination and filtering',
    description: 'Search for users and posts with advanced filtering and pagination options'
  })
  @ApiResponse({
    status: 200,
    description: 'Search results returned successfully',
    schema: {
      type: 'object',
      properties: {
        results: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              type: { type: 'string', enum: ['user', 'post'] },
              title: { type: 'string' },
              excerpt: { type: 'string' },
              avatar: { type: 'string' },
              image: { type: 'string' },
              author: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  avatar: { type: 'string' }
                }
              },
              createdAt: { type: 'string', format: 'date-time' },
              likes: { type: 'number' },
              views: { type: 'number' }
            }
          }
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' },
        query: { type: 'string' }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid search parameters'
  })
  async search(@Query(ValidationPipe) query: SearchQueryDto) {
    try {
      return await this.searchService.search(query);
    } catch (error) {
      throw new HttpException(
        'Search failed: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('suggestions')
  @ApiOperation({ 
    summary: 'Get search suggestions',
    description: 'Get autocomplete suggestions for search queries'
  })
  @ApiResponse({
    status: 200,
    description: 'Suggestions returned successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { type: 'string', enum: ['user', 'post'] },
          title: { type: 'string' },
          avatar: { type: 'string' }
        }
      }
    }
  })
  async getSuggestions(@Query('q') query: string) {
    if (!query || query.trim().length === 0) {
      return [];
    }
    
    try {
      return await this.searchService.getSuggestions(query.trim());
    } catch (error) {
      throw new HttpException(
        'Failed to get suggestions: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('quick')
  @ApiOperation({ 
    summary: 'Quick search for dropdown',
    description: 'Fast search for dropdown suggestions with limited results'
  })
  @ApiQuery({ 
    name: 'q', 
    required: true, 
    description: 'Search query',
    example: 'john'
  })
  @ApiQuery({ 
    name: 'limit', 
    required: false, 
    type: Number, 
    description: 'Maximum results',
    example: 5
  })
  @ApiResponse({
    status: 200,
    description: 'Quick search results returned successfully'
  })
  async quickSearch(
    @Query('q') query: string,
    @Query('limit') limit: string = '5',
  ) {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const limitNum = Math.min(parseInt(limit) || 5, 20); // Max 20 results
    
    try {
      return await this.searchService.quickSearch(query.trim(), limitNum);
    } catch (error) {
      throw new HttpException(
        'Quick search failed: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}