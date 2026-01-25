CREATE TABLE `editionCompanyPrices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`clientId` integer NOT NULL,
	`editionId` integer NOT NULL,
	`companyId` integer NOT NULL,
	`price` integer NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`editionId`) REFERENCES `courseEditions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `editionCompanyPrices_editionId_companyId_unique` ON `editionCompanyPrices` (`editionId`,`companyId`);--> statement-breakpoint
CREATE INDEX `edition_price_clientId_idx` ON `editionCompanyPrices` (`clientId`);
