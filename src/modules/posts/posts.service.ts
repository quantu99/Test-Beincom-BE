import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post, PostStatus } from './entities/post.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateDraftDto } from './dto/create-draft.dto';
import { PublishDraftDto, UpdateDraftDto } from './dto/update-draft.dto';
import { PostsQueryDto, UpdatePostDto } from './dto/update-post.dto';
import { DraftsQueryDto } from './dto/draft-query.dto';
import { unlink } from 'fs/promises';
import { join } from 'path';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private postsRepository: Repository<Post>,
  ) {}

  async create(createPostDto: CreatePostDto, authorId: string): Promise<Post> {
    const post = this.postsRepository.create({
      ...createPostDto,
      author: { id: authorId } as any,
      publishedAt:
        createPostDto.status === PostStatus.PUBLISHED ? new Date() : undefined,
    });
    return this.postsRepository.save(post);
  }

  // Draft methods
  async createDraft(
    createDraftDto: CreateDraftDto,
    authorId: string,
  ): Promise<Post> {
    const draft = this.postsRepository.create({
      ...createDraftDto,
      authorId,
      status: PostStatus.DRAFT,
    });
    return this.postsRepository.save(draft);
  }

  async getUserDrafts(
    query: DraftsQueryDto,
    authorId: string,
  ): Promise<{
    drafts: Post[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = 'updatedAt',
      sortOrder = 'DESC',
    } = query;

    const queryBuilder = this.postsRepository
      .createQueryBuilder('post')
      .where('post.authorId = :authorId', { authorId })
      .andWhere('post.status = :status', { status: PostStatus.DRAFT });

    // Search functionality for drafts
    if (search) {
      queryBuilder.andWhere(
        '(post.title ILIKE :search OR post.content ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Sorting
    queryBuilder.orderBy(`post.${sortBy}`, sortOrder as 'ASC' | 'DESC');

    // Pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [drafts, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      drafts,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getDraft(id: string, authorId: string): Promise<Post> {
    const draft = await this.postsRepository.findOne({
      where: {
        id,
        authorId,
        status: PostStatus.DRAFT,
      },
    });

    if (!draft) {
      throw new NotFoundException(`Draft with ID ${id} not found`);
    }

    return draft;
  }

  async updateDraft(
    id: string,
    updateDraftDto: UpdateDraftDto,
    authorId: string,
  ): Promise<Post> {
    const draft = await this.getDraft(id, authorId);
    const oldImageUrl = draft.image;

    Object.assign(draft, updateDraftDto);
    
    // If image is being updated and there was an old image, delete the old one
    if (updateDraftDto.image && oldImageUrl && oldImageUrl !== updateDraftDto.image) {
      await this.deleteImageFile(oldImageUrl);
    }

    return this.postsRepository.save(draft);
  }

  async publishDraft(
    id: string,
    publishDraftDto: PublishDraftDto,
    authorId: string,
  ): Promise<Post> {
    const draft = await this.getDraft(id, authorId);
    const oldImageUrl = draft.image;

    // Update with any final changes before publishing
    if (publishDraftDto.title) draft.title = publishDraftDto.title;
    if (publishDraftDto.content) draft.content = publishDraftDto.content;
    if (publishDraftDto.image) {
      // If image is being updated, delete the old one
      if (oldImageUrl && oldImageUrl !== publishDraftDto.image) {
        await this.deleteImageFile(oldImageUrl);
      }
      draft.image = publishDraftDto.image;
    }

    draft.status = PostStatus.PUBLISHED;
    draft.publishedAt = new Date();

    return this.postsRepository.save(draft);
  }

  async discardDraft(id: string, authorId: string): Promise<void> {
    const draft = await this.getDraft(id, authorId);
    
    // Delete associated image if exists
    if (draft.image) {
      await this.deleteImageFile(draft.image);
    }
    
    await this.postsRepository.remove(draft);
  }

  // Helper method to delete image files
  private async deleteImageFile(imageUrl: string): Promise<void> {
    try {
      // Extract filename from URL (assuming format like /api/posts/images/filename)
      const filename = imageUrl.split('/').pop();
      if (filename) {
        const filePath = join(process.cwd(), 'uploads/posts', filename);
        await unlink(filePath);
      }
    } catch (error) {
      console.warn('Failed to delete image file:', error.message);
      // Don't throw error as this is cleanup operation
    }
  }

  // Updated existing methods
  async findAll(query: PostsQueryDto): Promise<{
    posts: Post[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = 'publishedAt',
      sortOrder = 'DESC',
      status = PostStatus.PUBLISHED, // Default to published posts only
    } = query;

    const queryBuilder = this.postsRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('post.comments', 'comments')
      .leftJoinAndSelect('comments.author', 'commentAuthor')
      .where('post.status = :status', { status });

    // Search functionality
    if (search) {
      queryBuilder.andWhere(
        '(post.title ILIKE :search OR post.content ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Sorting - handle publishedAt for published posts
    if (sortBy === 'comments') {
      queryBuilder
        .addSelect('COUNT(comments.id)', 'commentCount')
        .groupBy('post.id, author.id, comments.id, commentAuthor.id')
        .orderBy('commentCount', sortOrder as 'ASC' | 'DESC');
    } else if (sortBy === 'publishedAt' && status === PostStatus.PUBLISHED) {
      queryBuilder.orderBy('post.publishedAt', sortOrder as 'ASC' | 'DESC');
    } else {
      queryBuilder.orderBy(`post.${sortBy}`, sortOrder as 'ASC' | 'DESC');
    }

    // Pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [posts, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      posts,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findOne(id: string): Promise<Post> {
    const post = await this.postsRepository.findOne({
      where: {
        id,
        status: PostStatus.PUBLISHED,
      },
      relations: ['author', 'comments', 'comments.author'],
    });

    if (!post) {
      throw new NotFoundException(`Published post with ID ${id} not found`);
    }

    // Increment views
    post.views += 1;
    await this.postsRepository.save(post);

    return post;
  }

  async update(
    id: string,
    updatePostDto: UpdatePostDto,
    authorId: string,
  ): Promise<Post> {
    const post = await this.postsRepository.findOne({
      where: {
        id,
        status: PostStatus.PUBLISHED,
      },
    });

    if (!post) {
      throw new NotFoundException(`Published post with ID ${id} not found`);
    }

    if (post.authorId !== authorId) {
      throw new ForbiddenException('You can only update your own posts');
    }

    const oldImageUrl = post.image;

    Object.assign(post, updatePostDto);

    // If image is being updated and there was an old image, delete the old one
    if (updatePostDto.image && oldImageUrl && oldImageUrl !== updatePostDto.image) {
      await this.deleteImageFile(oldImageUrl);
    }

    return this.postsRepository.save(post);
  }

  async remove(id: string, authorId: string): Promise<void> {
    const post = await this.postsRepository.findOne({
      where: {
        id,
        status: PostStatus.PUBLISHED,
      },
    });

    if (!post) {
      throw new NotFoundException(`Published post with ID ${id} not found`);
    }

    if (post.authorId !== authorId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    // Delete associated image if exists
    if (post.image) {
      await this.deleteImageFile(post.image);
    }

    await this.postsRepository.remove(post);
  }

  async likePost(id: string): Promise<Post> {
    const post = await this.postsRepository.findOne({
      where: {
        id,
        status: PostStatus.PUBLISHED,
      },
    });

    if (!post) {
      throw new NotFoundException(`Published post with ID ${id} not found`);
    }

    post.likes += 1;
    return this.postsRepository.save(post);
  }

  async getPopularPosts(limit: number = 5): Promise<Post[]> {
    return this.postsRepository.find({
      where: { status: PostStatus.PUBLISHED },
      relations: ['author', 'comments'],
      order: { likes: 'DESC', views: 'DESC' },
      take: limit,
    });
  }

  async getRecentPosts(limit: number = 5): Promise<Post[]> {
    return this.postsRepository.find({
      where: { status: PostStatus.PUBLISHED },
      relations: ['author', 'comments'],
      order: { publishedAt: 'DESC' },
      take: limit,
    });
  }
}