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
  BadRequestException,
  Response,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateDraftDto } from './dto/create-draft.dto';
import { PublishDraftDto, UpdateDraftDto } from './dto/update-draft.dto';
import { PostsQueryDto, UpdatePostDto } from './dto/update-post.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DraftsQueryDto } from './dto/draft-query.dto';

// Multer configuration for image uploads
const imageStorage = diskStorage({
  destination: './uploads/posts',
  filename: (req, file, callback) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = extname(file.originalname);
    callback(null, `post-${uniqueSuffix}${ext}`);
  },
});

const imageFileFilter = (req: any, file: any, callback: any) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
    return callback(
      new BadRequestException('Only image files are allowed!'),
      false,
    );
  }
  callback(null, true);
};

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

  // Image upload endpoint
  @Post('upload-image')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(
    FileInterceptor('image', {
      storage: imageStorage,
      fileFilter: imageFileFilter,
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Image file upload',
    type: 'multipart/form-data',
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
  @ApiOperation({ summary: 'Upload image for post' })
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Return the file URL that frontend can use
    const imageUrl = `/api/posts/images/${file.filename}`;
    
    return {
      message: 'Image uploaded successfully',
      imageUrl,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
    };
  }

  // Serve uploaded images
  @Get('images/:filename')
  @ApiOperation({ summary: 'Get uploaded image' })
  getImage(@Param('filename') filename: string, @Request() req, @Response() res) {
    const imagePath = join(process.cwd(), 'uploads/posts', filename);
    return res.sendFile(imagePath);
  }

  @Get()
  @ApiOperation({ summary: 'Get all published posts with pagination and search' })
  findAll(@Query() query: PostsQueryDto) {
    return this.postsService.findAll(query);
  }

  // Draft endpoints
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

  // Existing endpoints
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
}