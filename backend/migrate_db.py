from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

def migrate():
    if not DATABASE_URL:
        print("ERROR: DATABASE_URL not found in environment or .env file.")
        return

    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        print(f"Connecting to database...")
        
        # 1. Add missing columns to 'stories' table
        print("Checking for missing columns in 'stories' table...")
        columns_to_add = [
            ("long_description", "TEXT"),
            ("characters_info", "JSONB"),
            ("completion_rate", "FLOAT DEFAULT 0.0")
        ]
        
        for col_name, col_type in columns_to_add:
            try:
                # PostgreSQL specific check for column existence
                check_query = text(f"""
                    SELECT 1 
                    FROM information_schema.columns 
                    WHERE table_name='stories' AND column_name='{col_name}';
                """)
                result = conn.execute(check_query).fetchone()
                
                if not result:
                    print(f"Adding column '{col_name}'...")
                    conn.execute(text(f"ALTER TABLE stories ADD COLUMN {col_name} {col_type};"))
                    conn.commit()
                    print(f"Column '{col_name}' added successfully.")
                else:
                    print(f"Column '{col_name}' already exists.")
            except Exception as e:
                print(f"Error adding column '{col_name}': {e}")

        # 2. Add missing columns to 'users' table (subscription + monetization)
        print("\nChecking for missing columns in 'users' table...")
        
        # Create enum type if not exists
        try:
            conn.execute(text("CREATE TYPE subscriptiontier AS ENUM ('basic', 'premium');"))
            conn.commit()
            print("Created 'subscriptiontier' enum type.")
        except Exception:
            conn.rollback()
            print("Enum 'subscriptiontier' already exists (ok).")
        
        user_columns_to_add = [
            ("total_earned_stars", "INTEGER DEFAULT 0"),
            ("subscription_tier", "subscriptiontier DEFAULT 'basic'"),
            ("subscription_expires_at", "TIMESTAMP"),
            ("stories_created_this_month", "INTEGER DEFAULT 0"),
            ("bio", "TEXT"),
            ("accent_color", "VARCHAR(20) DEFAULT '#DC2650'"),
            ("last_limit_reset_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"),
        ]

        
        for col_name, col_type in user_columns_to_add:
            try:
                check_query = text(f"""
                    SELECT 1 
                    FROM information_schema.columns 
                    WHERE table_name='users' AND column_name='{col_name}';
                """)
                result = conn.execute(check_query).fetchone()
                
                if not result:
                    print(f"Adding column 'users.{col_name}'...")
                    conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type};"))
                    conn.commit()
                    print(f"Column 'users.{col_name}' added successfully.")
                else:
                    print(f"Column 'users.{col_name}' already exists.")
            except Exception as e:
                print(f"Error adding column 'users.{col_name}': {e}")

        # 3. Run create_all to create new tables (Analytics, Recommendation)
        print("\nCreating new tables if they don't exist...")
        from app.core.database import Base
        from app.models.analytics import AnalyticsEvent, DailyMetric
        from app.models.recommendation import UserTagScore
        from app.models.story import Story, Like, Purchase, User
        
        Base.metadata.create_all(bind=engine)
        print("Table creation check done.")
        
    print("\nMigration completed successfully! [OK]")

if __name__ == "__main__":
    migrate()
