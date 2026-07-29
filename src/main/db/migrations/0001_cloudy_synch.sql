CREATE TYPE "public"."external_manual_type" AS ENUM('SRM', 'SOPM', 'AMM', 'NTM', 'CMM', 'IPC', 'SPEC', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."external_reference_status" AS ENUM('pending', 'resolved');--> statement-breakpoint
CREATE TABLE "external_references" (
	"id" serial PRIMARY KEY NOT NULL,
	"manual_type" "external_manual_type" NOT NULL,
	"platform" text,
	"raw_doc_number" text NOT NULL,
	"normalized_key" text NOT NULL,
	"status" "external_reference_status" DEFAULT 'pending' NOT NULL,
	"resolved_manual_id" integer,
	"resolved_section_id" text,
	"resolved_start_page" integer,
	"resolved_end_page" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reference_manuals" (
	"id" serial PRIMARY KEY NOT NULL,
	"manual_type" "external_manual_type" NOT NULL,
	"platform" text,
	"file_path" text,
	"ingested_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "task_reference_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"cmm_id" integer NOT NULL,
	"section_id" text NOT NULL,
	"task_id" text NOT NULL,
	"external_reference_id" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cmms" ADD COLUMN "platform" text;--> statement-breakpoint
ALTER TABLE "external_references" ADD CONSTRAINT "external_references_resolved_manual_id_reference_manuals_id_fk" FOREIGN KEY ("resolved_manual_id") REFERENCES "public"."reference_manuals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_reference_links" ADD CONSTRAINT "task_reference_links_cmm_id_cmms_id_fk" FOREIGN KEY ("cmm_id") REFERENCES "public"."cmms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_reference_links" ADD CONSTRAINT "task_reference_links_external_reference_id_external_references_id_fk" FOREIGN KEY ("external_reference_id") REFERENCES "public"."external_references"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "external_references_normalized_key_idx" ON "external_references" USING btree ("normalized_key");--> statement-breakpoint
CREATE UNIQUE INDEX "task_reference_links_unique_idx" ON "task_reference_links" USING btree ("cmm_id","section_id","task_id","external_reference_id");