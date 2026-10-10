BEGIN;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "googleSubject" TEXT,
ADD COLUMN     "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "notifyCircleActivity" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifySocialActivity" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "refreshTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "refreshTokenHash" TEXT,
ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "weeklyDigestEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "circleId" TEXT;

-- CreateTable
CREATE TABLE "GoogleAuthChallenge" (
    "id" TEXT NOT NULL,
    "nonceHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoogleAuthChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Circle" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'community',
    "description" TEXT,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Circle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CircleMember" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CircleMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CircleEvent" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'EVENT',
    "mode" TEXT NOT NULL DEFAULT 'IN_PERSON',
    "gameMode" TEXT NOT NULL DEFAULT 'EXTERNAL',
    "templateId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "gameUrl" TEXT,
    "capacity" INTEGER,
    "durationMinutes" INTEGER,
    "tournamentFormat" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CircleEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CircleEventGameRound" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "choices" JSONB NOT NULL,
    "answerIndex" INTEGER NOT NULL,

    CONSTRAINT "CircleEventGameRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CircleEventParticipant" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CircleEventParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CircleEventGameSubmission" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CircleEventGameSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CirclePinnedPost" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "pinnedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CirclePinnedPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CirclePrompt" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "weekStartsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CirclePrompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CirclePromptParticipant" (
    "id" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CirclePromptParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GoogleAuthChallenge_nonceHash_key" ON "GoogleAuthChallenge"("nonceHash");

-- CreateIndex
CREATE INDEX "GoogleAuthChallenge_expiresAt_idx" ON "GoogleAuthChallenge"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceToken_token_key" ON "DeviceToken"("token");

-- CreateIndex
CREATE INDEX "DeviceToken_userId_idx" ON "DeviceToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Circle_slug_key" ON "Circle"("slug");

-- CreateIndex
CREATE INDEX "CircleMember_userId_idx" ON "CircleMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CircleMember_circleId_userId_key" ON "CircleMember"("circleId", "userId");

-- CreateIndex
CREATE INDEX "CircleEvent_circleId_startsAt_idx" ON "CircleEvent"("circleId", "startsAt");

-- CreateIndex
CREATE INDEX "CircleEvent_circleId_templateId_createdAt_idx" ON "CircleEvent"("circleId", "templateId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CircleEventGameRound_eventId_position_key" ON "CircleEventGameRound"("eventId", "position");

-- CreateIndex
CREATE INDEX "CircleEventParticipant_userId_joinedAt_idx" ON "CircleEventParticipant"("userId", "joinedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CircleEventParticipant_eventId_userId_key" ON "CircleEventParticipant"("eventId", "userId");

-- CreateIndex
CREATE INDEX "CircleEventGameSubmission_eventId_score_submittedAt_idx" ON "CircleEventGameSubmission"("eventId", "score", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CircleEventGameSubmission_eventId_userId_key" ON "CircleEventGameSubmission"("eventId", "userId");

-- CreateIndex
CREATE INDEX "CirclePinnedPost_circleId_createdAt_idx" ON "CirclePinnedPost"("circleId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CirclePinnedPost_circleId_postId_key" ON "CirclePinnedPost"("circleId", "postId");

-- CreateIndex
CREATE UNIQUE INDEX "CirclePrompt_slug_key" ON "CirclePrompt"("slug");

-- CreateIndex
CREATE INDEX "CirclePrompt_circleId_weekStartsAt_idx" ON "CirclePrompt"("circleId", "weekStartsAt");

-- CreateIndex
CREATE INDEX "CirclePromptParticipant_userId_idx" ON "CirclePromptParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CirclePromptParticipant_promptId_userId_key" ON "CirclePromptParticipant"("promptId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleSubject_key" ON "User"("googleSubject");

-- CreateIndex
CREATE INDEX "Follow_followerId_createdAt_idx" ON "Follow"("followerId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_recipientId_read_createdAt_idx" ON "Notification"("recipientId", "read", "createdAt");

-- CreateIndex
CREATE INDEX "Post_createdAt_idx" ON "Post"("createdAt");

-- CreateIndex
CREATE INDEX "Post_circleId_createdAt_idx" ON "Post"("circleId", "createdAt");

-- CreateIndex
CREATE INDEX "Like_createdAt_idx" ON "Like"("createdAt");

-- CreateIndex
CREATE INDEX "Comment_createdAt_idx" ON "Comment"("createdAt");

-- CreateIndex
CREATE INDEX "Comment_postId_createdAt_idx" ON "Comment"("postId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationParticipant_conversationId_userId_key" ON "ConversationParticipant"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- AddForeignKey
ALTER TABLE "DeviceToken" ADD CONSTRAINT "DeviceToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircleMember" ADD CONSTRAINT "CircleMember_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircleMember" ADD CONSTRAINT "CircleMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircleEvent" ADD CONSTRAINT "CircleEvent_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircleEvent" ADD CONSTRAINT "CircleEvent_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircleEventGameRound" ADD CONSTRAINT "CircleEventGameRound_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CircleEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircleEventParticipant" ADD CONSTRAINT "CircleEventParticipant_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CircleEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircleEventParticipant" ADD CONSTRAINT "CircleEventParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircleEventGameSubmission" ADD CONSTRAINT "CircleEventGameSubmission_eventId_userId_fkey" FOREIGN KEY ("eventId", "userId") REFERENCES "CircleEventParticipant"("eventId", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CirclePinnedPost" ADD CONSTRAINT "CirclePinnedPost_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CirclePinnedPost" ADD CONSTRAINT "CirclePinnedPost_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CirclePinnedPost" ADD CONSTRAINT "CirclePinnedPost_pinnedById_fkey" FOREIGN KEY ("pinnedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CirclePrompt" ADD CONSTRAINT "CirclePrompt_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CirclePromptParticipant" ADD CONSTRAINT "CirclePromptParticipant_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "CirclePrompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CirclePromptParticipant" ADD CONSTRAINT "CirclePromptParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
