-- AlterEnum
CREATE TYPE "Status_new" AS ENUM ('NEW', 'IN_PROGRESS', 'RESOLVED');
ALTER TABLE "Ticket" ALTER COLUMN "currentStatus" DROP DEFAULT;
ALTER TABLE "Ticket" ALTER COLUMN "currentStatus" TYPE "Status_new" USING ("currentStatus"::text::"Status_new");
ALTER TYPE "Status" RENAME TO "Status_old";
ALTER TYPE "Status_new" RENAME TO "Status";
DROP TYPE "Status_old";
ALTER TABLE "Ticket" ALTER COLUMN "currentStatus" SET DEFAULT 'NEW';