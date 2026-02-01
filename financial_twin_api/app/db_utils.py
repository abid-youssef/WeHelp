import sqlite3
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'financial_twin.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Clients Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT,
        phone TEXT,
        current_balance REAL,
        monthly_income REAL
    )
    ''')
    
    # 2. Transactions Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        date TEXT,
        category TEXT,
        amount REAL,
        type TEXT,
        FOREIGN KEY (user_id) REFERENCES clients (id)
    )
    ''')
    
    # 3. Loan Requests Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS loan_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        amount REAL,
        reason TEXT,
        status TEXT DEFAULT 'pending',
        request_date TEXT,
        risk_score REAL,
        advisor_decision TEXT,
        advisor_comment TEXT,
        FOREIGN KEY (user_id) REFERENCES clients (id)
    )
    ''')
    
    # 4. Audit Logs Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        actor_id TEXT,
        action TEXT,
        payload TEXT,
        timestamp TEXT,
        FOREIGN KEY (user_id) REFERENCES clients (id)
    )
    ''')
    
    conn.commit()
    conn.close()
    print(f"✓ Database initialized at {DB_PATH}")

def seed_demo_data(user_id="demo_user"):
    """Seed the database with a demo user and realistic transactions."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if user exists
    user = cursor.execute('SELECT * FROM clients WHERE id = ?', (user_id,)).fetchone()
    if not user:
        # Create User
        cursor.execute('INSERT INTO clients (id, name, email, phone, current_balance, monthly_income) VALUES (?, ?, ?, ?, ?, ?)',
                       (user_id, "Amira Ben Ali", "amira@example.com", "+216 55 123 456", 3500.0, 2000.0))
        
        # Generate generic transactions
        # We will use the main generator function logic, but adapted for DB insertion
        # For now, let's insert some dummy recurring data to ensure the table isn't empty
        today = datetime.now()
        transactions = []
        
        # 3 months of history
        for i in range(90):
            date = (today - timedelta(days=i)).isoformat()
            # Random spending
            if i % 30 == 0: # Salary
                transactions.append((user_id, date, 'Salary', 2000.0, 'income'))
            elif i % 30 == 5: # Rent
                transactions.append((user_id, date, 'Rent', 800.0, 'expense'))
            elif i % 7 == 0: # Weekly groceries
                transactions.append((user_id, date, 'Groceries', 150.0, 'expense'))
            else: # Daily
                if np.random.random() > 0.5:
                    transactions.append((user_id, date, 'Cafe & Food', np.random.uniform(10, 30), 'expense'))
                    
        cursor.executemany('INSERT INTO transactions (user_id, date, category, amount, type) VALUES (?, ?, ?, ?, ?)', transactions)
        
        # Create a pending loan request
        cursor.execute('''
            INSERT INTO loan_requests (user_id, amount, reason, status, request_date, risk_score)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (user_id, 5000.0, "Wedding Expenses", "pending", today.isoformat(), 45.0))
        
        conn.commit()
        print(f"✓ Seeded demo data for {user_id}")
    
    conn.close()

if __name__ == "__main__":
    init_db()
    seed_demo_data()
