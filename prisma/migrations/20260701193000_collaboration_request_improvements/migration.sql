-- Drop full unique constraint so users can re-apply after rejection/withdrawal
DROP INDEX IF EXISTS "CollaborationRequest_projectId_userId_key";

-- Only one active request per user per project
CREATE UNIQUE INDEX "CollaborationRequest_projectId_userId_active_key"
ON "CollaborationRequest"("projectId", "userId")
WHERE "status" IN ('PENDING', 'ACCEPTED');

-- Cascade deletes when project or user is removed
ALTER TABLE "CollaborationRequest" DROP CONSTRAINT IF EXISTS "CollaborationRequest_projectId_fkey";
ALTER TABLE "CollaborationRequest" DROP CONSTRAINT IF EXISTS "CollaborationRequest_userId_fkey";

ALTER TABLE "CollaborationRequest"
ADD CONSTRAINT "CollaborationRequest_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CollaborationRequest"
ADD CONSTRAINT "CollaborationRequest_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "CollaborationRequest_projectId_idx" ON "CollaborationRequest"("projectId");
CREATE INDEX IF NOT EXISTS "CollaborationRequest_userId_idx" ON "CollaborationRequest"("userId");
