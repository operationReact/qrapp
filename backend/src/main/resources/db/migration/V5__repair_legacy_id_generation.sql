-- Repair legacy PostgreSQL schemas where Flyway was introduced after tables already existed
-- without identity/sequence defaults on bigint primary-key columns.
--
-- Hibernate now relies on database-generated ids for these entities. If an older table
-- was baselined instead of recreated, inserts can fail with:
--   null value in column "id" violates not-null constraint
--
-- For every known id column, only add a sequence-backed default when the column currently
-- has neither IDENTITY generation nor an existing DEFAULT.
DO $$
DECLARE
    schema_name text := current_schema();
    target_table text;
    sequence_name text;
    qualified_sequence text;
    current_default text;
    identity_kind text;
    next_id bigint;
BEGIN
    FOREACH target_table IN ARRAY ARRAY[
        'users',
        'menu_item',
        'orders',
        'wallets',
        'wallet_transactions',
        'order_item',
        'order_status_history'
    ]
    LOOP
        SELECT c.column_default, c.identity_generation
        INTO current_default, identity_kind
        FROM information_schema.columns c
        WHERE c.table_schema = schema_name
          AND c.table_name = target_table
          AND c.column_name = 'id';

        IF NOT FOUND THEN
            CONTINUE;
        END IF;

        IF identity_kind IS NOT NULL OR current_default IS NOT NULL THEN
            CONTINUE;
        END IF;

        sequence_name := target_table || '_id_seq';
        qualified_sequence := format('%I.%I', schema_name, sequence_name);

        EXECUTE format('CREATE SEQUENCE IF NOT EXISTS %s', qualified_sequence);
        EXECUTE format('SELECT COALESCE(MAX(id), 0) + 1 FROM %I.%I', schema_name, target_table)
            INTO next_id;
        EXECUTE format('SELECT setval(%L::regclass, %s, false)', qualified_sequence, next_id);
        EXECUTE format('ALTER SEQUENCE %s OWNED BY %I.%I.id', qualified_sequence, schema_name, target_table);
        EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN id SET DEFAULT nextval(%L::regclass)', schema_name, target_table, qualified_sequence);
    END LOOP;
END $$;

