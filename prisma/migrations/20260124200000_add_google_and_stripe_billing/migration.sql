-- CreateEnum
CREATE TYPE "UserPlan" AS ENUM ('Free', 'Pro', 'Enterprise');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('ENTRA', 'GOOGLE');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN     "plan" "UserPlan" NOT NULL DEFAULT 'Free',
ADD COLUMN     "authProvider" "AuthProvider" NOT NULL DEFAULT 'ENTRA',
ADD COLUMN     "stripeCustomerId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "customerId" TEXT,
    "subscriptionId" TEXT,
    "priceId" TEXT,
    "currentPeriodEnd" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_subscriptionId_key" ON "Subscription"("subscriptionId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

