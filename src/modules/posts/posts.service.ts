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
import { SupabaseService } from '@/subabase/supabase.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private postsRepository: Repository<Post>,
    private readonly supabaseService: SupabaseService,
  ) {}

  // Original methods (keeping for backward compatibility)
  async create(createPostDto: CreatePostDto, authorId: string): Promise<Post> {
    const post = this.postsRepository.create({
      ...createPostDto,
      author: { id: authorId } as any,
      publishedAt:
        createPostDto.status === PostStatus.PUBLISHED ? new Date() : undefined,
    });
    return this.postsRepository.save(post);
  }

  // New method: Create post with image upload
  async createWithImage(createPostDto: CreatePostDto, file: any, authorId: string): Promise<Post> {
    let imageUrl: string | undefined;

    // Upload image if provided
    if (file) {
      const uploadResult = await this.uploadImage(file);
      imageUrl = uploadResult.url;
    }

    const post = this.postsRepository.create({
      ...createPostDto,
      image: imageUrl,
      author: { id: authorId } as any,
      publishedAt:
        createPostDto.status === PostStatus.PUBLISHED ? new Date() : undefined,
    });
    
    return this.postsRepository.save(post);
  }

  // New method: Update post with image upload
  async updateWithImage(
    id: string,
    updatePostDto: UpdatePostDto,
    file: any,
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

    // Upload new image if provided
    if (file) {
      const uploadResult = await this.uploadImage(file);
      updatePostDto.image = uploadResult.url;
    }

    Object.assign(post, updatePostDto);

    // Delete old image if a new one was uploaded
    if (updatePostDto.image && oldImageUrl && oldImageUrl !== updatePostDto.image) {
      await this.deleteSupabaseImage(oldImageUrl);
    }

    return this.postsRepository.save(post);
  }

  // Draft methods with image upload
  async createDraft(createDraftDto: CreateDraftDto, authorId: string): Promise<Post> {
    const draft = this.postsRepository.create({
      ...createDraftDto,
      authorId,
      status: PostStatus.DRAFT,
    });
    return this.postsRepository.save(draft);
  }

  // New method: Create draft with image upload
  async createDraftWithImage(
    createDraftDto: CreateDraftDto,
    file: any,
    authorId: string,
  ): Promise<Post> {
    let imageUrl: string | undefined;

    // Upload image if provided
    if (file) {
      const uploadResult = await this.uploadImage(file);
      imageUrl = uploadResult.url;
    }

    const draft = this.postsRepository.create({
      ...createDraftDto,
      image: imageUrl,
      authorId,
      status: PostStatus.DRAFT,
    });
    
    return this.postsRepository.save(draft);
  }

  // New method: Update draft with image upload
  async updateDraftWithImage(
    id: string,
    updateDraftDto: UpdateDraftDto,
    file: any,
    authorId: string,
  ): Promise<Post> {
    const draft = await this.getDraft(id, authorId);
    const oldImageUrl = draft.image;

    // Upload new image if provided
    if (file) {
      const uploadResult = await this.uploadImage(file);
      updateDraftDto.image = uploadResult.url;
    }

    Object.assign(draft, updateDraftDto);

    // Delete old image if a new one was uploaded
    if (updateDraftDto.image && oldImageUrl && oldImageUrl !== updateDraftDto.image) {
      await this.deleteSupabaseImage(oldImageUrl);
    }

    return this.postsRepository.save(draft);
  }

  // New method: Publish draft with image upload
  async publishDraftWithImage(
    id: string,
    publishDraftDto: PublishDraftDto,
    file: any,
    authorId: string,
  ): Promise<Post> {
    const draft = await this.getDraft(id, authorId);
    const oldImageUrl = draft.image;

    // Upload new image if provided
    if (file) {
      const uploadResult = await this.uploadImage(file);
      publishDraftDto.image = uploadResult.url;
    }

    // Update with any final changes before publishing
    if (publishDraftDto.title) draft.title = publishDraftDto.title;
    if (publishDraftDto.content) draft.content = publishDraftDto.content;
    if (publishDraftDto.image) {
      // Delete old image if a new one was uploaded
      if (oldImageUrl && oldImageUrl !== publishDraftDto.image) {
        await this.deleteSupabaseImage(oldImageUrl);
      }
      draft.image = publishDraftDto.image;
    }

    draft.status = PostStatus.PUBLISHED;
    draft.publishedAt = new Date();

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

    if (search) {
      queryBuilder.andWhere(
        '(post.title ILIKE :search OR post.content ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder.orderBy(`post.${sortBy}`, sortOrder as 'ASC' | 'DESC');

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

    // If image URL is being updated and there was an old image, delete the old one
    if (
      updateDraftDto.image &&
      oldImageUrl &&
      oldImageUrl !== updateDraftDto.image
    ) {
      await this.deleteSupabaseImage(oldImageUrl);
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
      // If image URL is being updated, delete the old one
      if (oldImageUrl && oldImageUrl !== publishDraftDto.image) {
        await this.deleteSupabaseImage(oldImageUrl);
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
      await this.deleteSupabaseImage(draft.image);
    }

    await this.postsRepository.remove(draft);
  }

  // Helper method to delete image from Supabase
  private async deleteSupabaseImage(imageUrl: string): Promise<void> {
    try {
      const supabase = this.supabaseService.getClient();
      
      // Extract filename from URL
      // URL format: https://[project].supabase.co/storage/v1/object/public/posts/filename
      const urlParts = imageUrl.split('/');
      const filename = urlParts[urlParts.length - 1];
      
      if (filename) {
        const { error } = await supabase.storage
          .from('posts')
          .remove([filename]);
          
        if (error) {
          console.warn('Failed to delete image from Supabase:', error.message);
        }
      }
    } catch (error) {
      console.warn('Failed to delete image from Supabase:', error.message);
    }
  }

  // Keep old method for backward compatibility
  private async deleteImageFile(imageUrl: string): Promise<void> {
    await this.deleteSupabaseImage(imageUrl);
  }

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
      status = PostStatus.PUBLISHED,
    } = query;

    const queryBuilder = this.postsRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('post.comments', 'comments')
      .leftJoinAndSelect('comments.author', 'commentAuthor')
      .where('post.status = :status', { status });

    if (search) {
      queryBuilder.andWhere(
        '(post.title ILIKE :search OR post.content ILIKE :search)',
        { search: `%${search}%` },
      );
    }

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

    // If image URL is being updated and there was an old image, delete the old one
    if (
      updatePostDto.image &&
      oldImageUrl &&
      oldImageUrl !== updatePostDto.image
    ) {
      await this.deleteSupabaseImage(oldImageUrl);
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
      await this.deleteSupabaseImage(post.image);
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

  async uploadImage(file: any) {
    if (!file) throw new BadRequestException('No file uploaded');

    const supabase = this.supabaseService.getClient();

    const filename = `post-${Date.now()}-${uuidv4()}.${file.originalname.split('.').pop()}`;

    const { error } = await supabase.storage
      .from('posts')
      .upload(filename, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) throw new BadRequestException(error.message);

    const { data } = supabase.storage.from('posts').getPublicUrl(filename);

    return {
      filename,
      url: data.publicUrl,
    };
  }
}