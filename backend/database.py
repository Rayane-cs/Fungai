import os
import uuid
from datetime import datetime
from sqlalchemy import create_engine, Column, String, DateTime, JSON, Text, text
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
        db_user = os.getenv('DB_USER', 'root')
        db_password = os.getenv('DB_PASSWORD', '')
        db_host = os.getenv('DB_HOST', 'localhost')
        db_port = os.getenv('DB_PORT', '3306')
        db_name = os.getenv('DB_NAME', 'fungai')
        
        if db_password:
            return f"mysql+pymysql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
        return f"mysql+pymysql://{db_user}@{db_host}:{db_port}/{db_name}"
    
    def _get_server_url(self) -> str:
        """Get server connection URL without database"""
        db_user = os.getenv('DB_USER', 'root')
        db_password = os.getenv('DB_PASSWORD', '')
        db_host = os.getenv('DB_HOST', 'localhost')
        db_port = os.getenv('DB_PORT', '3306')
        
        if db_password:
            return f"mysql+pymysql://{db_user}:{db_password}@{db_host}:{db_port}"
        return f"mysql+pymysql://{db_user}@{db_host}:{db_port}"
    
    def _init_database(self):
        """Initialize database connection and create tables"""
        try:
            # First, try to create the database if it doesn't exist
            server_engine = create_engine(
                self._get_server_url(),
                echo=False,
                isolation_level="AUTOCOMMIT"
            )
            db_name = os.getenv('DB_NAME', 'fungai')
            
            with server_engine.connect() as conn:
                conn.execute(text(f"CREATE DATABASE IF NOT EXISTS {db_name} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"))
                print(f"Database '{db_name}' ensured.")
            
            server_engine.dispose()
            
            # Now connect to the specific database
            self.engine = create_engine(
                self._get_connection_url(),
                echo=os.getenv('DB_ECHO', 'false').lower() == 'true',
                pool_pre_ping=True,
                pool_recycle=3600
            )
            
            # Create all tables
            Base.metadata.create_all(bind=self.engine)
            print("All tables created successfully.")
            
            # Create session factory
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
