-- CreateEnum
CREATE TYPE "AbilityType" AS ENUM ('CORE', 'FACTION', 'DATASHEET', 'WARGEAR');

-- CreateEnum
CREATE TYPE "WeaponType" AS ENUM ('RANGED', 'MELEE');

-- CreateEnum
CREATE TYPE "StratagemCategory" AS ENUM ('BATTLE_TACTIC', 'STRATEGIC_PLOY', 'EPIC_DEED', 'WARGEAR');

-- CreateEnum
CREATE TYPE "GamePhase" AS ENUM ('COMMAND', 'MOVEMENT', 'SHOOTING', 'CHARGE', 'FIGHT', 'ANY');

-- CreateEnum
CREATE TYPE "BattlefieldRole" AS ENUM ('EPIC_HERO', 'CHARACTER', 'BATTLELINE', 'DEDICATED_TRANSPORT', 'FORTIFICATION', 'OTHER');

-- CreateTable
CREATE TABLE "factions" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "armyRule" TEXT,
    "parentId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "factions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detachments" (
    "id" SERIAL NOT NULL,
    "factionId" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "rule" TEXT,
    "description" TEXT,

    CONSTRAINT "detachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enhancements" (
    "id" SERIAL NOT NULL,
    "detachmentId" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "points" INTEGER NOT NULL,
    "description" TEXT,
    "restriction" TEXT,

    CONSTRAINT "enhancements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stratagems" (
    "id" SERIAL NOT NULL,
    "detachmentId" INTEGER,
    "name" VARCHAR(255) NOT NULL,
    "cpCost" INTEGER NOT NULL,
    "category" "StratagemCategory" NOT NULL,
    "phase" "GamePhase" NOT NULL,
    "turn" VARCHAR(64),
    "when" TEXT,
    "target" TEXT,
    "effect" TEXT NOT NULL,
    "restrictions" TEXT,

    CONSTRAINT "stratagems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "datasheets" (
    "id" SERIAL NOT NULL,
    "factionId" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "role" "BattlefieldRole" NOT NULL DEFAULT 'OTHER',
    "composition" TEXT,
    "wargearOptions" TEXT,
    "baseSize" VARCHAR(64),
    "lore" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "datasheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_profiles" (
    "id" SERIAL NOT NULL,
    "datasheetId" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "movement" VARCHAR(16) NOT NULL,
    "toughness" INTEGER NOT NULL,
    "save" INTEGER NOT NULL,
    "invulnSave" INTEGER,
    "wounds" INTEGER NOT NULL,
    "leadership" INTEGER NOT NULL,
    "oc" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "model_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit_sizes" (
    "id" SERIAL NOT NULL,
    "datasheetId" INTEGER NOT NULL,
    "models" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,

    CONSTRAINT "unit_sizes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weapons" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,

    CONSTRAINT "weapons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weapon_profiles" (
    "id" SERIAL NOT NULL,
    "weaponId" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" "WeaponType" NOT NULL,
    "range" INTEGER,
    "attacks" VARCHAR(16) NOT NULL,
    "skill" INTEGER,
    "strength" INTEGER NOT NULL,
    "ap" INTEGER NOT NULL DEFAULT 0,
    "damage" VARCHAR(16) NOT NULL,
    "keywords" TEXT[],

    CONSTRAINT "weapon_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "datasheet_weapons" (
    "datasheetId" INTEGER NOT NULL,
    "weaponId" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "datasheet_weapons_pkey" PRIMARY KEY ("datasheetId","weaponId")
);

-- CreateTable
CREATE TABLE "abilities" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" "AbilityType" NOT NULL,
    "description" TEXT,
    "isAura" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "abilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "datasheet_abilities" (
    "datasheetId" INTEGER NOT NULL,
    "abilityId" INTEGER NOT NULL,
    "value" VARCHAR(32),

    CONSTRAINT "datasheet_abilities_pkey" PRIMARY KEY ("datasheetId","abilityId")
);

-- CreateTable
CREATE TABLE "keywords" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "isFaction" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "keywords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "datasheet_keywords" (
    "datasheetId" INTEGER NOT NULL,
    "keywordId" INTEGER NOT NULL,

    CONSTRAINT "datasheet_keywords_pkey" PRIMARY KEY ("datasheetId","keywordId")
);

-- CreateTable
CREATE TABLE "leader_attachments" (
    "leaderId" INTEGER NOT NULL,
    "bodyguardId" INTEGER NOT NULL,

    CONSTRAINT "leader_attachments_pkey" PRIMARY KEY ("leaderId","bodyguardId")
);

-- CreateTable
CREATE TABLE "army_lists" (
    "id" TEXT NOT NULL,
    "ownerId" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "factionId" INTEGER NOT NULL,
    "detachmentId" INTEGER,
    "pointsLimit" INTEGER NOT NULL DEFAULT 2000,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "army_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "army_list_units" (
    "id" TEXT NOT NULL,
    "armyListId" TEXT NOT NULL,
    "datasheetId" INTEGER NOT NULL,
    "unitSizeId" INTEGER NOT NULL,
    "enhancementId" INTEGER,
    "attachedToId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "wargearNotes" TEXT,

    CONSTRAINT "army_list_units_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "factions_slug_key" ON "factions"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "detachments_factionId_name_key" ON "detachments"("factionId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "enhancements_detachmentId_name_key" ON "enhancements"("detachmentId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "stratagems_detachmentId_name_key" ON "stratagems"("detachmentId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "datasheets_factionId_slug_key" ON "datasheets"("factionId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "model_profiles_datasheetId_name_key" ON "model_profiles"("datasheetId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "unit_sizes_datasheetId_models_key" ON "unit_sizes"("datasheetId", "models");

-- CreateIndex
CREATE UNIQUE INDEX "weapons_name_key" ON "weapons"("name");

-- CreateIndex
CREATE UNIQUE INDEX "weapon_profiles_weaponId_name_key" ON "weapon_profiles"("weaponId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "abilities_name_type_key" ON "abilities"("name", "type");

-- CreateIndex
CREATE UNIQUE INDEX "keywords_name_key" ON "keywords"("name");

-- CreateIndex
CREATE INDEX "army_lists_ownerId_idx" ON "army_lists"("ownerId");

-- CreateIndex
CREATE INDEX "army_list_units_armyListId_idx" ON "army_list_units"("armyListId");

-- AddForeignKey
ALTER TABLE "factions" ADD CONSTRAINT "factions_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "factions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detachments" ADD CONSTRAINT "detachments_factionId_fkey" FOREIGN KEY ("factionId") REFERENCES "factions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enhancements" ADD CONSTRAINT "enhancements_detachmentId_fkey" FOREIGN KEY ("detachmentId") REFERENCES "detachments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stratagems" ADD CONSTRAINT "stratagems_detachmentId_fkey" FOREIGN KEY ("detachmentId") REFERENCES "detachments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "datasheets" ADD CONSTRAINT "datasheets_factionId_fkey" FOREIGN KEY ("factionId") REFERENCES "factions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_profiles" ADD CONSTRAINT "model_profiles_datasheetId_fkey" FOREIGN KEY ("datasheetId") REFERENCES "datasheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_sizes" ADD CONSTRAINT "unit_sizes_datasheetId_fkey" FOREIGN KEY ("datasheetId") REFERENCES "datasheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weapon_profiles" ADD CONSTRAINT "weapon_profiles_weaponId_fkey" FOREIGN KEY ("weaponId") REFERENCES "weapons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "datasheet_weapons" ADD CONSTRAINT "datasheet_weapons_datasheetId_fkey" FOREIGN KEY ("datasheetId") REFERENCES "datasheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "datasheet_weapons" ADD CONSTRAINT "datasheet_weapons_weaponId_fkey" FOREIGN KEY ("weaponId") REFERENCES "weapons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "datasheet_abilities" ADD CONSTRAINT "datasheet_abilities_datasheetId_fkey" FOREIGN KEY ("datasheetId") REFERENCES "datasheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "datasheet_abilities" ADD CONSTRAINT "datasheet_abilities_abilityId_fkey" FOREIGN KEY ("abilityId") REFERENCES "abilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "datasheet_keywords" ADD CONSTRAINT "datasheet_keywords_datasheetId_fkey" FOREIGN KEY ("datasheetId") REFERENCES "datasheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "datasheet_keywords" ADD CONSTRAINT "datasheet_keywords_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "keywords"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leader_attachments" ADD CONSTRAINT "leader_attachments_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "datasheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leader_attachments" ADD CONSTRAINT "leader_attachments_bodyguardId_fkey" FOREIGN KEY ("bodyguardId") REFERENCES "datasheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "army_lists" ADD CONSTRAINT "army_lists_factionId_fkey" FOREIGN KEY ("factionId") REFERENCES "factions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "army_lists" ADD CONSTRAINT "army_lists_detachmentId_fkey" FOREIGN KEY ("detachmentId") REFERENCES "detachments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "army_list_units" ADD CONSTRAINT "army_list_units_armyListId_fkey" FOREIGN KEY ("armyListId") REFERENCES "army_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "army_list_units" ADD CONSTRAINT "army_list_units_datasheetId_fkey" FOREIGN KEY ("datasheetId") REFERENCES "datasheets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "army_list_units" ADD CONSTRAINT "army_list_units_unitSizeId_fkey" FOREIGN KEY ("unitSizeId") REFERENCES "unit_sizes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "army_list_units" ADD CONSTRAINT "army_list_units_enhancementId_fkey" FOREIGN KEY ("enhancementId") REFERENCES "enhancements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "army_list_units" ADD CONSTRAINT "army_list_units_attachedToId_fkey" FOREIGN KEY ("attachedToId") REFERENCES "army_list_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
