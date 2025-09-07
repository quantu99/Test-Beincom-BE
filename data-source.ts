import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { User } from './src/modules/users/entities/user.entity';
import { Post } from './src/modules/posts/entities/post.entity';
import { Comment } from './src/modules/comments/entities/comment.entity';
import { PostLike } from './src/modules/posts/entities/post-like.entity';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  entities: [User, Post, Comment, PostLike],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});
