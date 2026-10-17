-- Optional bundled video (file name from frontend/src/assets/category-videos) for MRP product categories.
ALTER TABLE category ADD COLUMN IF NOT EXISTS video_key VARCHAR(255);
