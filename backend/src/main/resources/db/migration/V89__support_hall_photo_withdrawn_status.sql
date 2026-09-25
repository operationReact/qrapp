ALTER TABLE hall_of_happiness_photos
    DROP CONSTRAINT IF EXISTS ck_hall_photo_status;

ALTER TABLE hall_of_happiness_photos
    ADD CONSTRAINT ck_hall_photo_status
    CHECK (status IN (
        'CUSTOMER_UPLOAD',
        'PENDING_REVIEW',
        'PENDING',
        'APPROVED',
        'PUBLISHED',
        'REJECTED',
        'UNPUBLISHED',
        'WITHDRAWN',
        'REMOVED'
    ));
