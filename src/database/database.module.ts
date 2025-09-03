import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeederService } from './seeder/seeder.service';
import { User } from '@/modules/users/entities/user.entity';
import { Post } from '@/modules/posts/entities/post.entity';
import { Comment } from '@/modules/comments/entities/comment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Post, Comment])],
  providers: [SeederService],
  exports: [SeederService],
})
export class DatabaseModule {}
