CREATE TABLE "cmms" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"cmm_number" text,
	"manufacturer" text,
	"revision" text,
	"revision_date" timestamp,
	"file_path" text,
	"uploaded_at" timestamp DEFAULT now()
);
