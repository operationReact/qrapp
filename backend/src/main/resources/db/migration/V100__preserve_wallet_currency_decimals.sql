-- Wallet balances and transactions are stored in rupees. Preserve paise
-- instead of forcing wallet debits and credits to whole rupees.
ALTER TABLE wallets
    ALTER COLUMN balance TYPE NUMERIC(19, 2)
    USING balance::NUMERIC(19, 2);

ALTER TABLE wallet_transactions
    ALTER COLUMN amount TYPE NUMERIC(19, 2)
    USING amount::NUMERIC(19, 2),
    ALTER COLUMN balance_after TYPE NUMERIC(19, 2)
    USING balance_after::NUMERIC(19, 2);
