-- Create borrow_transactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS library_schema.borrow_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    book_id INTEGER NOT NULL,
    due_date DATE NOT NULL,
    borrowed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    returned_at TIMESTAMP NULL,
    status VARCHAR(20) DEFAULT 'borrowed' CHECK (status IN ('borrowed', 'returned', 'overdue')),
    processed_by INTEGER NULL,
    fine_amount DECIMAL(10,2) DEFAULT 0.00,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES library_schema.users(id),
    FOREIGN KEY (book_id) REFERENCES library_schema.books(id),
    FOREIGN KEY (processed_by) REFERENCES library_schema.users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_borrow_transactions_user_id ON library_schema.borrow_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_borrow_transactions_book_id ON library_schema.borrow_transactions(book_id);
CREATE INDEX IF NOT EXISTS idx_borrow_transactions_status ON library_schema.borrow_transactions(status);
CREATE INDEX IF NOT EXISTS idx_borrow_transactions_due_date ON library_schema.borrow_transactions(due_date);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_borrow_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER borrow_transactions_updated_at
    BEFORE UPDATE ON library_schema.borrow_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_borrow_transactions_updated_at();
