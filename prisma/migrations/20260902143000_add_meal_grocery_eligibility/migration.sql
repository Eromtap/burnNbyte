-- Planned meals remain grocery-eligible by default. New food-log entries opt out
-- explicitly, so restaurants and already-eaten meals never affect shopping.
ALTER TABLE "Meal" ADD COLUMN "includeInGroceries" BOOLEAN NOT NULL DEFAULT true;
