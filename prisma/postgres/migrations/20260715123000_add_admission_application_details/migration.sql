ALTER TABLE "admission_applications"
ADD COLUMN "emergencyContact" VARCHAR(120),
ADD COLUMN "emergencyPhone" VARCHAR(30),
ADD COLUMN "previousEducation" VARCHAR(200),
ADD COLUMN "reference" VARCHAR(120);
