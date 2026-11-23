-- ULITMS compatibility migration 001
-- Review and back up the database before running. Does not drop data.
SET search_path TO library, public;

ALTER TABLE book_categories
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ck_book_categories_status'
      AND conrelid = 'library.book_categories'::regclass
  ) THEN
    ALTER TABLE book_categories
      ADD CONSTRAINT ck_book_categories_status
      CHECK (status IN ('active', 'inactive'));
  END IF;
END
$$;

-- Existing books retain their category references.
ALTER TABLE damage_reports DROP CONSTRAINT IF EXISTS ck_report_has_target;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ck_report_has_exactly_one_target'
      AND conrelid = 'library.damage_reports'::regclass
  ) THEN
    ALTER TABLE damage_reports
      ADD CONSTRAINT ck_report_has_exactly_one_target
      CHECK ((unit_id IS NOT NULL) <> (peripheral_id IS NOT NULL));
  END IF;
END
$$;


-- Prevent new book assignments to inactive categories while preserving
-- existing books that already reference a category later deactivated.
CREATE OR REPLACE FUNCTION library.trg_fn_validate_active_book_category()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_status VARCHAR(20);
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.category_id IS NOT NULL THEN
      SELECT status INTO v_status FROM library.book_categories
      WHERE category_id = NEW.category_id FOR SHARE;
      IF v_status IS NULL OR v_status <> 'active' THEN
        RAISE EXCEPTION 'Cannot assign an inactive or missing book category';
      END IF;
    END IF;
  ELSIF NEW.category_id IS DISTINCT FROM OLD.category_id THEN
    IF NEW.category_id IS NOT NULL THEN
      SELECT status INTO v_status FROM library.book_categories
      WHERE category_id = NEW.category_id FOR SHARE;
      IF v_status IS NULL OR v_status <> 'active' THEN
        RAISE EXCEPTION 'Cannot assign an inactive or missing book category';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_books_active_category ON library.books;
CREATE TRIGGER trg_books_active_category
BEFORE INSERT OR UPDATE OF category_id ON library.books
FOR EACH ROW
EXECUTE FUNCTION library.trg_fn_validate_active_book_category();
