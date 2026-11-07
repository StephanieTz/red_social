-- CreateEnum
CREATE TYPE "TransformType" AS ENUM ('THUMB', 'RESIZE', 'GRAYSCALE', 'SEPIA', 'UPSCALE', 'BLUR', 'ROTATE');

-- CreateEnum
CREATE TYPE "AnalysisProvider" AS ENUM ('FACEAPI', 'OPENCV', 'REKOGNITION');

-- CreateEnum
CREATE TYPE "ReactionKind" AS ENUM ('POST', 'COMMENT');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "nick" VARCHAR(20) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255),
    "salt" VARCHAR(64),
    "image_key" VARCHAR(500),
    "bio" VARCHAR(160) NOT NULL DEFAULT '',
    "google_id" VARCHAR(255),
    "role" VARCHAR(20) NOT NULL DEFAULT 'user',
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follows" (
    "id" UUID NOT NULL,
    "follower_id" UUID NOT NULL,
    "followed_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "text" VARCHAR(500) NOT NULL,
    "file_key" VARCHAR(500),
    "file_type" VARCHAR(50),
    "thumb_key" VARCHAR(500),
    "width" INTEGER,
    "height" INTEGER,
    "size_bytes" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publication_transforms" (
    "id" UUID NOT NULL,
    "publication_id" UUID NOT NULL,
    "type" "TransformType" NOT NULL,
    "s3_key" VARCHAR(500) NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "size_bytes" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "publication_transforms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "image_analysis" (
    "id" UUID NOT NULL,
    "publication_id" UUID NOT NULL,
    "provider" "AnalysisProvider" NOT NULL,
    "faces" JSONB,
    "face_count" INTEGER NOT NULL DEFAULT 0,
    "labels" JSONB,
    "moderation" JSONB,
    "raw_response" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "image_analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "publication_id" UUID NOT NULL,
    "parent_id" UUID,
    "reply_to_id" UUID,
    "text" VARCHAR(300) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reactions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "kind" "ReactionKind" NOT NULL,
    "target_id" UUID NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reposts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "publication_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reposts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saves" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "publication_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "action" VARCHAR(80) NOT NULL,
    "entity" VARCHAR(50),
    "entity_id" UUID,
    "ip" VARCHAR(45),
    "user_agent" VARCHAR(500),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_resets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_nick_key" ON "users"("nick");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

-- CreateIndex
CREATE INDEX "users_nick_idx" ON "users"("nick");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "follows_followed_id_idx" ON "follows"("followed_id");

-- CreateIndex
CREATE UNIQUE INDEX "follows_follower_id_followed_id_key" ON "follows"("follower_id", "followed_id");

-- CreateIndex
CREATE INDEX "publications_user_id_idx" ON "publications"("user_id");

-- CreateIndex
CREATE INDEX "publications_created_at_idx" ON "publications"("created_at");

-- CreateIndex
CREATE INDEX "publication_transforms_publication_id_idx" ON "publication_transforms"("publication_id");

-- CreateIndex
CREATE UNIQUE INDEX "publication_transforms_publication_id_type_key" ON "publication_transforms"("publication_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "image_analysis_publication_id_key" ON "image_analysis"("publication_id");

-- CreateIndex
CREATE INDEX "comments_publication_id_created_at_idx" ON "comments"("publication_id", "created_at");

-- CreateIndex
CREATE INDEX "comments_parent_id_idx" ON "comments"("parent_id");

-- CreateIndex
CREATE INDEX "comments_user_id_idx" ON "comments"("user_id");

-- CreateIndex
CREATE INDEX "reactions_target_id_kind_idx" ON "reactions"("target_id", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "reactions_user_id_kind_target_id_key" ON "reactions"("user_id", "kind", "target_id");

-- CreateIndex
CREATE INDEX "reposts_publication_id_idx" ON "reposts"("publication_id");

-- CreateIndex
CREATE UNIQUE INDEX "reposts_user_id_publication_id_key" ON "reposts"("user_id", "publication_id");

-- CreateIndex
CREATE INDEX "saves_user_id_created_at_idx" ON "saves"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "saves_user_id_publication_id_key" ON "saves"("user_id", "publication_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "password_resets_token_hash_key" ON "password_resets"("token_hash");

-- CreateIndex
CREATE INDEX "password_resets_user_id_idx" ON "password_resets"("user_id");

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_followed_id_fkey" FOREIGN KEY ("followed_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_transforms" ADD CONSTRAINT "publication_transforms_publication_id_fkey" FOREIGN KEY ("publication_id") REFERENCES "publications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "image_analysis" ADD CONSTRAINT "image_analysis_publication_id_fkey" FOREIGN KEY ("publication_id") REFERENCES "publications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_publication_id_fkey" FOREIGN KEY ("publication_id") REFERENCES "publications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reactions" ADD CONSTRAINT "reaction_publication_fk" FOREIGN KEY ("target_id") REFERENCES "publications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reactions" ADD CONSTRAINT "reaction_comment_fk" FOREIGN KEY ("target_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reposts" ADD CONSTRAINT "reposts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reposts" ADD CONSTRAINT "reposts_publication_id_fkey" FOREIGN KEY ("publication_id") REFERENCES "publications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saves" ADD CONSTRAINT "saves_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saves" ADD CONSTRAINT "saves_publication_id_fkey" FOREIGN KEY ("publication_id") REFERENCES "publications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
