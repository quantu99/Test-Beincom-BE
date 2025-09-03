import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { PostsQueryDto, UpdatePostDto } from './dto/update-post.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new post' })
  create(@Body() createPostDto: CreatePostDto, @Request() req) {
    return this.postsService.create(createPostDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all posts with pagination and search' })
  findAll(@Query() query: PostsQueryDto) {
    return this.postsService.findAll(query);
  }

  @Get('popular')
  @ApiOperation({ summary: 'Get popular posts' })
  getPopular(@Query('limit') limit?: number) {
    return this.postsService.getPopularPosts(limit);
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get recent posts' })
  getRecent(@Query('limit') limit?: number) {
    return this.postsService.getRecentPosts(limit);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get post by id' })
  findOne(@Param('id') id: string) {
    return this.postsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update post' })
  update(@Param('id') id: string, @Body() updatePostDto: UpdatePostDto) {
    return this.postsService.update(id, updatePostDto);
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Like a post' })
  likePost(@Param('id') id: string) {
    return this.postsService.likePost(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete post' })
  remove(@Param('id') id: string) {
    return this.postsService.remove(id);
  }
}