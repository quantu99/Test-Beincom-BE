import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
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

  // Validate file type and size
  private validateFile(file: any): void {
    if (!file) return;
    
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only image files (JPEG, PNG, WebP, GIF) are allowed');
    }
    
    if (file.size > maxSize) {
      throw new BadRequestException('File size must be less than 5MB');
    }
  }

  // Get proper file extension
  private getFileExtension(originalName: string, mimetype: string): string {
    if (originalName && originalName.includes('.')) {
      return originalName.split('.').pop()?.toLowerCase() || 'jpg';
    }
    
    const mimeTypeMap: { [key: string]: string } = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif'
    };
    
    return mimeTypeMap[mimetype] || 'jpg';
  }

  // Upload image to Supabase with proper error handling
  async uploadImage(file: any) {
    if (!file) throw new BadRequestException('No file uploaded');
    
    // Validate file
    this.validateFile(file);
    
    const supabase = this.supabaseService.getClient();
    const fileExtension = this.getFileExtension(file.originalname, file.mimetype);
    const filename = `post-${Date.now()}-${uuidv4()}.${fileExtension}`;
    
    try {
      // Ensure we have the buffer
      const fileBuffer = file.buffer || file;
      
      if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
        throw new BadRequestException('Invalid file buffer');
      }
      
      console.log(`Uploading file: ${filename}, size: ${fileBuffer.length}, type: ${file.mimetype}`);
      
      const { data, error } = await supabase.storage
        .from('posts')
        .upload(filename, fileBuffer, {
          contentType: file.mimetype,
          upsert: false,
          cacheControl: '3600'
        });
      
      if (error) {
        console.error('Supabase upload error:', error);
        throw new BadRequestException(`Upload failed: ${error.message}`);
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('posts')
        .getPublicUrl(filename);
      
      console.log(`File uploaded successfully: ${urlData.publicUrl}`);
      
      return {
        filename,
        url: urlData.publicUrl,
        path: data.path
      };
    } catch (error) {
      console.error('Upload error:', error);
      throw new BadRequestException(`Failed to upload image: ${error.message}`);
    }
  }

  // Create post with image upload
  async createWithImage(createPostDto: CreatePostDto, file: any, authorId: string): Promise<Post> {
    let imageUrl: string | undefined;
    
    if (file) {
      const uploadResult = await this.uploadImage(file);
      imageUrl = uploadResult.url;
    }
    
    const post = this.postsRepository.create({
      ...createPostDto,
      image: imageUrl,
      author: { id: authorId } as any,
      publishedAt: createPostDto.status === PostStatus.PUBLISHED ? new Date() : undefined,
    });
    
    return this.postsRepository.save(post);
  }

  // Update post with image upload
  async updateWithImage(
    id: string,
    updatePostDto: UpdatePostDto,
    file: any,
    authorId: string,
  ): Promise<Post> {
    const post = await this.postsRepository.findOne({
      where: { id, status: PostStatus.PUBLISHED },
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

  // Create draft with image upload
  async createDraftWithImage(
    createDraftDto: CreateDraftDto,
    file: any,
    authorId: string,
  ): Promise<Post> {
    let imageUrl: string | undefined;

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

  // Update draft with image upload
  async updateDraftWithImage(
    id: string,
    updateDraftDto: UpdateDraftDto,
    file: any,
    authorId: string,
  ): Promise<Post> {
    const draft = await this.getDraft(id, authorId);
    const oldImageUrl = draft.image;

    if (file) {
      const uploadResult = await this.uploadImage(file);
      updateDraftDto.image = uploadResult.url;
    }

    Object.assign(draft, updateDraftDto);

    if (updateDraftDto.image && oldImageUrl && oldImageUrl !== updateDraftDto.image) {
      await this.deleteSupabaseImage(oldImageUrl);
    }

    return this.postsRepository.save(draft);
  }

  // Publish draft with image upload
  async publishDraftWithImage(
    id: string,
    publishDraftDto: PublishDraftDto,
    file: any,
    authorId: string,
  ): Promise<Post> {
    const draft = await this.getDraft(id, authorId);
    const oldImageUrl = draft.image;

    if (file) {
      const uploadResult = await this.uploadImage(file);
      publishDraftDto.image = uploadResult.url;
    }

    if (publishDraftDto.title) draft.title = publishDraftDto.title;
    if (publishDraftDto.content) draft.content = publishDraftDto.content;
    if (publishDraftDto.image) {
      if (oldImageUrl && oldImageUrl !== publishDraftDto.image) {
        await this.deleteSupabaseImage(oldImageUrl);
      }
      draft.image = publishDraftDto.image;
    }

    draft.status = PostStatus.PUBLISHED;
    draft.publishedAt = new Date();

    return this.postsRepository.save(draft);
  }

  // Delete image from Supabase
  private async deleteSupabaseImage(imageUrl: string): Promise<void> {
    try {
      const supabase = this.supabaseService.getClient();
      
      // Extract filename from URL
      const urlParts = imageUrl.split('/');
      const filename = urlParts[urlParts.length - 1];
      
      if (filename) {
        const { error } = await supabase.storage
          .from('posts')
          .remove([filename]);
          
        if (error) {
          console.warn('Failed to delete image from Supabase:', error.message);
        } else {
          console.log(`Successfully deleted image: ${filename}`);
        }
      }
    } catch (error) {
      console.warn('Failed to delete image from Supabase:', error.message);
    }
  }

  // ... rest of your existing methods remain the same ...

  async getUserDrafts(
    query: DraftsQueryDto,
    authorId: string,
  ): Promise<{ drafts: Post[]; total: number; page: number; limit: number; totalPages: number; }> {
    const { page = 1, limit = 10, search, sortBy = 'updatedAt', sortOrder = 'DESC' } = query;

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

    return { drafts, total, page, limit, totalPages };
  }

  async getDraft(id: string, authorId: string): Promise<Post> {
    const draft = await this.postsRepository.findOne({
      where: { id, authorId, status: PostStatus.DRAFT },
    });

    if (!draft) {
      throw new NotFoundException(`Draft with ID ${id} not found`);
    }

    return draft;
  }

  async discardDraft(id: string, authorId: string): Promise<void> {
    const draft = await this.getDraft(id, authorId);

    if (draft.image) {
      await this.deleteSupabaseImage(draft.image);
    }

    await this.postsRepository.remove(draft);
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

    if (sortBy === 'publishedAt' && status === PostStatus.PUBLISHED) {
      queryBuilder.orderBy('post.publishedAt', sortOrder as 'ASC' | 'DESC');
    } else {
      queryBuilder.orderBy(`post.${sortBy}`, sortOrder as 'ASC' | 'DESC');
    }

    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [posts, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return { posts, total, page, limit, totalPages };
  }

  async findOne(id: string): Promise<Post> {
    const post = await this.postsRepository.findOne({
      where: { id, status: PostStatus.PUBLISHED },
      relations: ['author', 'comments', 'comments.author'],
    });

    if (!post) {
      throw new NotFoundException(`Published post with ID ${id} not found`);
    }

    post.views += 1;
    await this.postsRepository.save(post);

    return post;
  }

  async remove(id: string, authorId: string): Promise<void> {
    const post = await this.postsRepository.findOne({
      where: { id, status: PostStatus.PUBLISHED },
    });

    if (!post) {
      throw new NotFoundException(`Published post with ID ${id} not found`);
    }

    if (post.authorId !== authorId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    if (post.image) {
      await this.deleteSupabaseImage(post.image);
    }

    await this.postsRepository.remove(post);
  }

  async likePost(id: string): Promise<Post> {
    const post = await this.postsRepository.findOne({
      where: { id, status: PostStatus.PUBLISHED },
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

  async create(createPostDto: CreatePostDto, authorId: string): Promise<Post> {
    return this.createWithImage(createPostDto, null, authorId);
  }

  async update(id: string, updatePostDto: UpdatePostDto, authorId: string): Promise<Post> {
    return this.updateWithImage(id, updatePostDto, null, authorId);
  }

  async createDraft(createDraftDto: CreateDraftDto, authorId: string): Promise<Post> {
    return this.createDraftWithImage(createDraftDto, null, authorId);
  }

  async updateDraft(id: string, updateDraftDto: UpdateDraftDto, authorId: string): Promise<Post> {
    return this.updateDraftWithImage(id, updateDraftDto, null, authorId);
  }

  async publishDraft(id: string, publishDraftDto: PublishDraftDto, authorId: string): Promise<Post> {
    return this.publishDraftWithImage(id, publishDraftDto, null, authorId);
  }
}