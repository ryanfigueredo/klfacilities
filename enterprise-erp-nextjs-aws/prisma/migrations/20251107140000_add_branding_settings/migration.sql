-- CreateTable
CREATE TABLE "BrandingSettings" (
    "id" TEXT NOT NULL,
    "primaryColor" TEXT NOT NULL DEFAULT '#009ee2',
    "secondaryColor" TEXT NOT NULL DEFAULT '#e8f5ff',
    "accentColor" TEXT NOT NULL DEFAULT '#0088c7',
    "sidebarBackground" TEXT NOT NULL DEFAULT '#f6fbff',
    "sidebarTextColor" TEXT NOT NULL DEFAULT '#0b2b4f',
    "sidebarLogoDataUrl" TEXT,
    "loginLogoDataUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" TEXT,

    CONSTRAINT "BrandingSettings_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BrandingSettings"
  ADD CONSTRAINT "BrandingSettings_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

