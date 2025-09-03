import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({ example: 'This is a great post! Thanks for sharing.' })
  @IsNotEmpty()
  @IsString()
  content: string;
}