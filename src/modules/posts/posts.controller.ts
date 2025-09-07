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
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateDraftDto } from './dto/create-draft.dto';
import { PublishDraftDto, UpdateDraftDto } from './dto/update-draft.dto';
import { PostsQueryDto, UpdatePostDto } from './dto/update-post.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DraftsQueryDto } from './dto/draft-query.dto';

@ApiTags('posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  // Option 1: Create post with image upload in single request
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Create post with optional image',
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        content: { type: 'string' },
        status: { type: 'string', enum: ['draft', 'published'] },
        image: { type: 'string', format: 'binary' },
      },
      required: ['title', 'content'],
    },
  })
  @ApiOperation({
    summary:
      'Create a new post (can be draft or published) with optional image',
  })
  async create(
    @Body() createPostDto: CreatePostDto,
    @UploadedFile() file: any,
    @Request() req,
  ) {
    return this.postsService.createWithImage(createPostDto, file, req.user.id);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all published posts with pagination and search',
  })
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
  @ApiOperation({ summary: 'Get published post by id' })
  findOne(@Param('id') id: string) {
    return this.postsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Update post with optional image',
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        content: { type: 'string' },
        status: { type: 'string', enum: ['draft', 'published'] },
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({ summary: 'Update published post with optional image' })
  async update(
    @Param('id') id: string,
    @Body() updatePostDto: UpdatePostDto,
    @UploadedFile() file: any,
    @Request() req,
  ) {
    return this.postsService.updateWithImage(
      id,
      updatePostDto,
      file,
      req.user.id,
    );
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
  @ApiOperation({ summary: 'Delete published post' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Request() req) {
    return this.postsService.remove(id, req.user.id);
  }

  // DRAFT ENDPOINTS
  @Post('drafts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Create draft with optional image',
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        content: { type: 'string' },
        image: { type: 'string', format: 'binary' },
      },
      required: ['title', 'content'],
    },
  })
  @ApiOperation({ summary: 'Create a new draft with optional image' })
  async createDraft(
    @Body() createDraftDto: CreateDraftDto,
    @UploadedFile() file: any,
    @Request() req,
  ) {
    return this.postsService.createDraftWithImage(
      createDraftDto,
      file,
      req.user.id,
    );
  }

  @Get('drafts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user drafts' })
  getUserDrafts(@Query() query: DraftsQueryDto, @Request() req) {
    return this.postsService.getUserDrafts(query, req.user.id);
  }

  @Get('drafts/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get draft by id' })
  getDraft(@Param('id') id: string, @Request() req) {
    return this.postsService.getDraft(id, req.user.id);
  }

  @Patch('drafts/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Update draft with optional image',
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        content: { type: 'string' },
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({ summary: 'Update draft with optional image' })
  async updateDraft(
    @Param('id') id: string,
    @Body() updateDraftDto: UpdateDraftDto,
    @UploadedFile() file: any,
    @Request() req,
  ) {
    return this.postsService.updateDraftWithImage(
      id,
      updateDraftDto,
      file,
      req.user.id,
    );
  }

  @Post('drafts/:id/publish')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Publish draft with optional image update',
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        content: { type: 'string' },
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({ summary: 'Publish a draft with optional image update' })
  async publishDraft(
    @Param('id') id: string,
    @Body() publishDraftDto: PublishDraftDto,
    @UploadedFile() file: any,
    @Request() req,
  ) {
    return this.postsService.publishDraftWithImage(
      id,
      publishDraftDto,
      file,
      req.user.id,
    );
  }

  @Delete('drafts/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete/Discard draft' })
  @HttpCode(HttpStatus.NO_CONTENT)
  discardDraft(@Param('id') id: string, @Request() req) {
    return this.postsService.discardDraft(id, req.user.id);
  }

  // Keep separate upload endpoint for cases where you need to upload image first
  @Post('upload-image')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(
    FileInterceptor('image', {
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Upload post image',
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Upload image to Supabase storage (standalone)' })
  async uploadImage(@UploadedFile() file: any) {
    return this.postsService.uploadImage(file);
  }
  // Thêm vào PostsController
  @Get(':id/like-status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if user has liked a post' })
  getLikeStatus(@Param('id') id: string, @Request() req) {
    return this.postsService.hasUserLikedPost(id, req.user.id);
  }

  @Post(':id/toggle-like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle like/unlike a post' })
  toggleLike(@Param('id') id: string, @Request() req) {
    return this.postsService.toggleLike(id, req.user.id);
  }
}
