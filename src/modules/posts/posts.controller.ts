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


  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new post (can be draft or published)' })
  create(@Body() createPostDto: CreatePostDto, @Request() req) {
    return this.postsService.create(createPostDto, req.user.id);
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
  @ApiOperation({ summary: 'Update published post' })
  update(
    @Param('id') id: string,
    @Body() updatePostDto: UpdatePostDto,
    @Request() req,
  ) {
    return this.postsService.update(id, updatePostDto, req.user.id);
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


  @Post('drafts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new draft' })
  createDraft(@Body() createDraftDto: CreateDraftDto, @Request() req) {
    return this.postsService.createDraft(createDraftDto, req.user.id);
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
  @ApiOperation({ summary: 'Update draft' })
  updateDraft(
    @Param('id') id: string,
    @Body() updateDraftDto: UpdateDraftDto,
    @Request() req,
  ) {
    return this.postsService.updateDraft(id, updateDraftDto, req.user.id);
  }

  @Post('drafts/:id/publish')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish a draft' })
  publishDraft(
    @Param('id') id: string,
    @Body() publishDraftDto: PublishDraftDto,
    @Request() req,
  ) {
    return this.postsService.publishDraft(id, publishDraftDto, req.user.id);
  }

  @Delete('drafts/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete/Discard draft' })
  @HttpCode(HttpStatus.NO_CONTENT)
  discardDraft(@Param('id') id: string, @Request() req) {
    return this.postsService.discardDraft(id, req.user.id);
  }


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
  @ApiOperation({ summary: 'Upload image to Supabase storage' })
  async uploadImage(@UploadedFile() file: any) {
    return this.postsService.uploadImage(file);
  }
}
