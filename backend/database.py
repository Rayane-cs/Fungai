import os
import uuid
from datetime import datetime
from urllib.parse import unquote
from sqlalchemy import create_engine, Column, String, DateTime, JSON, Text
from sqlalchemy.dialects.mysql import LONGTEXT
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from dotenv import load_dotenv

load_dotenv()

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(100), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    reset_token = Column(String(255), nullable=True)
    reset_token_expires = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Scan(Base):
    __tablename__ = "scans"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=False)
    filename = Column(String(500), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    result_json = Column(JSON)
    original_image_base64 = Column(LONGTEXT)  # Full original image
    annotated_image_base64 = Column(LONGTEXT)  # Full annotated image

class DatabaseManager:
    def __init__(self):
        self.engine = None
        self.SessionLocal = None
        self._init_database()
    
    def _get_connection_url(self) -> str:
        """Build MySQL connection URL from environment or defaults"""
        # Use Railway's full URL if available (preferred)
        mysql_url = os.getenv('MYSQL_URL') or os.getenv('MYSQL_PUBLIC_URL')
        if mysql_url:
            # Convert mysql:// to mysql+pymysql:// and URL-decode special chars
            url = mysql_url.replace('mysql://', 'mysql+pymysql://', 1)
            # URL decode any percent-encoded characters (like @, /, :, etc.)
            return unquote(url)
        
        # Support both Railway naming (MYSQL*) and standard naming (DB_*)
        db_user = os.getenv('MYSQLUSER') or os.getenv('DB_USER', 'root')
        db_password = os.getenv('MYSQLPASSWORD') or os.getenv('MYSQL_ROOT_PASSWORD') or os.getenv('DB_PASSWORD', '')
        db_host = os.getenv('MYSQLHOST') or os.getenv('DB_HOST', 'localhost')
        db_port = os.getenv('MYSQLPORT') or os.getenv('DB_PORT', '3306')
        db_name = os.getenv('MYSQLDATABASE') or os.getenv('DB_NAME', 'fungai')
        
        if db_password:
            return f"mysql+pymysql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
        return f"mysql+pymysql://{db_user}@{db_host}:{db_port}/{db_name}"

    def _init_database(self):
        """Initialize database connection and create tables"""
        try:
            connection_url = self._get_connection_url()
            # Debug: print URL with masked password
            masked_url = connection_url
            if ':' in connection_url and '@' in connection_url:
                # Extract and mask password from URL
                parts = connection_url.split('@')
                auth_part = parts[0]
                if ':' in auth_part:
                    protocol_and_user = auth_part.rsplit(':', 1)[0]
                    masked_url = f"{protocol_and_user}:****@{parts[1]}"
            print(f"Connecting to database: {masked_url}")
            
            self.engine = create_engine(
                connection_url,
                echo=os.getenv('DB_ECHO', 'false').lower() == 'true',
                pool_pre_ping=True,
                pool_recycle=3600
            )
            Base.metadata.create_all(bind=self.engine)
            print("Database connected and tables ensured.")
            self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        except Exception as e:
            print(f"Database initialization error: {e}")
            raise
    
    def get_session(self) -> Session:
        """Get a new database session"""
        return self.SessionLocal()
    
    def close(self):
        """Close database connection"""
        if self.engine:
            self.engine.dispose()

# Global database manager instance
db_manager = DatabaseManager()

def get_db() -> Session:
    """Dependency to get database session"""
    session = db_manager.get_session()
    try:
        yield session
    finally:
        session.close()

if __name__ == "__main__":
    print("Database setup complete!")
    print(f"Connection URL: {db_manager._get_connection_url().replace(os.getenv('DB_PASSWORD', ''), '***')}")
