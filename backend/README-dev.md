# Development Partner access

The `dev` Spring profile seeds one development-only Partner administrator through
Flyway migration `V127__seed_dev_partner_test_access.sql`.

- Phone: `9000000099`
- Password: `PartnerDev@123`

Use these credentials only with the development environment. The migration exits
without changes when the database name does not identify a development database.
