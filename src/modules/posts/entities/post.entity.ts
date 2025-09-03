import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Comment } from '../../comments/entities/comment.entity';

@Entity('posts')
@Index('IDX_POST_AUTHOR', ['authorId'])
@Index('IDX_POST_CREATED', ['createdAt'])
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 500 })
  title: string;

  @Column('text')
  content: string;

  @Column({ nullable: true, length: 1000 })
  image?: string;

  @Column({ default: 0 })
  views: number;

  @Column({ default: 0 })
  likes: number;

  @ManyToOne(() => User, (user) => user.posts, { eager: true })
  @JoinColumn({ name: 'authorId' })
  author: User;

  @Column('uuid')
  authorId: string;

  @OneToMany(() => Comment, (comment) => comment.post, { cascade: true })
  comments: Comment[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
