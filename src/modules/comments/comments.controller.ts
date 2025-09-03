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
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('comments')
@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post('posts/:postId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a comment for a post' })
  create(
    @Param('postId') postId: string,
    @Body() createCommentDto: CreateCommentDto,
    @Request() req,
  ) {
    return this.commentsService.create(createCommentDto, req.user.id, postId);
  }

  @Get('posts/:postId')
  @ApiOperation({ summary: 'Get all comments for a post' })
  findByPost(@Param('postId') postId: string) {
    return this.commentsService.findByPost(postId);
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get recent comments' })
  getRecent(@Query('limit') limit?: number) {
    return this.commentsService.getRecentComments(limit);
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get comments by user' })
  findByUser(@Param('userId') userId: string) {
    return this.commentsService.findByUser(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get comment by id' })
  findOne(@Param('id') id: string) {
    return this.commentsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update comment' })
  update(@Param('id') id: string, @Body() updateCommentDto: UpdateCommentDto) {
    return this.commentsService.update(id, updateCommentDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete comment' })
  remove(@Param('id') id: string) {
    return this.commentsService.remove(id);
  }
}