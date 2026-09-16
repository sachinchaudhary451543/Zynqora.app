CREATE TABLE "Circle" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "icon" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Circle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CircleMember" (
  "id" TEXT NOT NULL,
  "circleId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CircleMember_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Post" ADD COLUMN "circleId" TEXT;
CREATE UNIQUE INDEX "Circle_slug_key" ON "Circle"("slug");
CREATE UNIQUE INDEX "CircleMember_circleId_userId_key" ON "CircleMember"("circleId", "userId");
CREATE INDEX "CircleMember_userId_idx" ON "CircleMember"("userId");
CREATE INDEX "Post_circleId_createdAt_idx" ON "Post"("circleId", "createdAt");
ALTER TABLE "CircleMember" ADD CONSTRAINT "CircleMember_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CircleMember" ADD CONSTRAINT "CircleMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Post" ADD CONSTRAINT "Post_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE SET NULL ON UPDATE CASCADE;