DROP TABLE IF EXISTS invoices;
CREATE TABLE invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT NOT NULL,
  amount REAL NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO invoices (customer_name, amount, status) VALUES 
('Acme Corp1', 1500.00, 'Paid'),
('Globex Inc', 850.50, 'Pending'),
('Initech', 3200.75, 'Overdue');
