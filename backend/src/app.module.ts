import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PostsModule } from './posts/posts.module';
import { LikesModule } from './likes/likes.module';
import { CommentsModule } from './comments/comments.module';
import { SuggestionsModule } from './suggestions/suggestions.module';
import { StoriesModule } from './stories/stories.module';
import { UploadsModule } from './uploads/uploads.module';
import { ChatModule } from './chat/chat.module';
import { HealthController } from './health.controller';
import { RealtimeModule } from './realtime/realtime.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    PostsModule,
    LikesModule,
    CommentsModule,
    SuggestionsModule,
    StoriesModule,
    UploadsModule,
    ChatModule,
    RealtimeModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
