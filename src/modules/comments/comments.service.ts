import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from './entities/comment.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private commentsRepository: Repository<Comment>,
  ) {}

  async create(
    createCommentDto: CreateCommentDto,
    authorId: string,
    postId: string,
  ): Promise<Comment> {
    const comment = this.commentsRepository.create({
      ...createCommentDto,
      authorId,
      postId,
    });
    return this.commentsRepository.save(comment);
  }

  async findByPost(postId: string): Promise<Comment[]> {
    return this.commentsRepository.find({
      where: { postId },
      relations: ['author'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Comment> {
    const comment = await this.commentsRepository.findOne({
      where: { id },
      relations: ['author', 'post'],
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }

    return comment;
  }

  async update(id: string, updateCommentDto: UpdateCommentDto): Promise<Comment> {
    const comment = await this.findOne(id);
    
    Object.assign(comment, updateCommentDto);
    return this.commentsRepository.save(comment);
  }

  async remove(id: string): Promise<void> {
    const comment = await this.findOne(id);
    await this.commentsRepository.remove(comment);
  }

  async findByUser(authorId: string): Promise<Comment[]> {
    return this.commentsRepository.find({
      where: { authorId },
      relations: ['post', 'author'],
      order: { createdAt: 'DESC' },
    });
  }

  async getRecentComments(limit: number = 10): Promise<Comment[]> {
    return this.commentsRepository.find({
      relations: ['author', 'post'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}