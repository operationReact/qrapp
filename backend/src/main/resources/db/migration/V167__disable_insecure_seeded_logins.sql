-- Secure historical demo credentials without changing checksums of Flyway V16/V17/V69/V127.
-- On a fresh database, old example users would otherwise have public passwords/tokens,
-- including wallets with fake balances. Do not affect users who changed passwords.
-- Generated replacement BCrypt digest has no recoverable operator-known password.
UPDATE users
SET active = FALSE,
    token = NULL,
    password = '$2y$12$VRbpvgecnSbbThzgcIifKuVc.j1wp1mNUpax8T04P.i533r3VwH4W'
WHERE phone IN ('9000000001', '123', '9999999999', '9888888888', '9000000099')
  AND password IN (
    '$2a$10$slYQmyNdGzin7olVN3p5Be7DFH0KpZbP6H8KwkIVfZgYpHxsB3FYm',
    '$2a$10$VEu3BxIbTi1rp.E7CEu6SOJkHmJEWbCQKVi1r/yFQjVCDfEHp4Z5G',
    '$2a$10$8pW7LjHKYIvH5VPgz7ELs.rqZZrGUCZOm.QCgXv6bCvA2FX6wXiK2',
    '$2a$10$NEh9o7xrJG9eRZ4wSUJBsO4F0qT7x0rFBMQM.Kf8PkOr0v3zEMU4W',
    '$2a$10$SQ5BGBqYCCyMpIjbIbXg4eP8d74Fh9mo8YlX6XQXL5Gup0hjLBKOC',
    '$2a$10$pNN4iOOJrfIpVW2OTMK0Au8NbfipWu3SQOjQcTwNUCi3jlv3tu02i',
    '$2a$10$W.MCprXO7sd7CvJsqpIHD./AI9/fIaiEjX9I0osMLR8zbkNIPfUfe',
    '$2a$10$s4Z6h.KtygoHeN3tRXmZqOfLY2gr.4iTLyXT5fl5KDMvFZCLgVIIK',
    '$2b$10$jHjjdW9lCVR.3H.KjaE/S.kwH66EPUFZpGswTPcfZjlXd9F9BXP6y'
  );

-- Do not ship the predictable initial super-admin password from V69.
-- Keep the account available for VERIFIED WhatsApp password recovery by its owner.
-- An existing manually rotated password is left untouched.
UPDATE users
SET password = '$2y$12$VRbpvgecnSbbThzgcIifKuVc.j1wp1mNUpax8T04P.i533r3VwH4W',
    token = NULL,
    must_change_password = TRUE
WHERE phone = '7093327979'
  AND password = '$2b$10$Hw4XXBpcmZ2KgwEXcv4h6OSTSWZRFVsID2.lYWrHfrABD6WF2g/y6';
