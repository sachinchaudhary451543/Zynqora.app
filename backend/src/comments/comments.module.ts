import { Module } from '@nestjs/common';
import { CommentsController, StandaloneCommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { PostsModule } from '../posts/posts.module';

@Module({
  imports: [PostsModule],
  controllers: [CommentsController, StandaloneCommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
