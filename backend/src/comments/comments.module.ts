import { Module } from '@nestjs/common';
import { CommentsController, StandaloneCommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { PostsModule } from '../posts/posts.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PostsModule, AuthModule],
  controllers: [CommentsController, StandaloneCommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
