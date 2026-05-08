"""Update MySQL schema to use LONGTEXT for image columns."""
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

db_user = os.getenv('DB_USER', 'root')
db_password = os.getenv('DB_PASSWORD', '')
db_host = os.getenv('DB_HOST', 'localhost')
db_port = os.getenv('DB_PORT', '3306')
db_name = os.getenv('DB_NAME', 'fungai')

url = f"mysql+pymysql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
engine = create_engine(url)

with engine.connect() as conn:
    result = conn.execute(text("SHOW COLUMNS FROM scans"))
    print("Current scans table columns:")
    for row in result:
        print(f"  {row[0]}: {row[1]}")
    
    print("\nUpdating columns to LONGTEXT...")
    conn.execute(text("ALTER TABLE scans MODIFY original_image_base64 LONGTEXT"))
    conn.execute(text("ALTER TABLE scans MODIFY annotated_image_base64 LONGTEXT"))
    conn.commit()
    
    result = conn.execute(text("SHOW COLUMNS FROM scans"))
    print("\nUpdated scans table columns:")
    for row in result:
        print(f"  {row[0]}: {row[1]}")

print("\nDone!")
