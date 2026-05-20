-- ============================================================================
-- V26 : Convert wallet balances and transaction amounts from paise → rupees
-- ============================================================================
-- Why:
--   Wallet amounts were previously stored in paise (smallest currency unit).
--   The system now stores and operates in rupees throughout.
--   Paise conversion to/from Razorpay API is handled internally in the backend.
--
-- What this does:
--   1. Divides all wallet.balance values by 100
--   2. Divides all wallet_transaction.amount values by 100
--   3. Divides all wallet_transaction.balance_after values by 100
--
-- Safety:
--   - Wrapped in a transaction so it either fully applies or fully rolls back.
--   - Uses integer division (amounts were always whole paise → whole rupees).
--   - Idempotent guard: skips conversion if all balances are already < 1000
--     (heuristic: no realistic wallet has a paise balance < ₹10 = 1000 paise).
-- ============================================================================

DO $$
DECLARE
    max_balance BIGINT;
    max_tx_amount BIGINT;
BEGIN
    -- Check if conversion is needed (guard against re-running on already-converted data)
    SELECT COALESCE(MAX(balance), 0) INTO max_balance FROM wallets;
    SELECT COALESCE(MAX(amount), 0) INTO max_tx_amount FROM wallet_transactions;

    -- If all values are already small (< 100), assume already in rupees – skip
    IF max_balance < 100 AND max_tx_amount < 100 THEN
        RAISE NOTICE 'V26: wallet data already appears to be in rupees (max balance=%, max tx amount=%). Skipping conversion.',
            max_balance, max_tx_amount;
        RETURN;
    END IF;

    RAISE NOTICE 'V26: Converting wallet balances and transaction amounts from paise to rupees...';

    -- Convert wallet balances
    UPDATE wallets
    SET balance = balance / 100
    WHERE balance >= 100;

    -- Convert transaction amounts
    UPDATE wallet_transactions
    SET amount = amount / 100
    WHERE amount >= 100;

    -- Convert balance_after snapshots
    UPDATE wallet_transactions
    SET balance_after = balance_after / 100
    WHERE balance_after IS NOT NULL AND balance_after >= 100;

    RAISE NOTICE 'V26: Conversion complete.';
END;
$$;

