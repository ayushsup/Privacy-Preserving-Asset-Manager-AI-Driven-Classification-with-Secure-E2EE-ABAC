from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    APP_NAME: str = "Privacy Preserving Asset Manager"
    SECRET_KEY: str = "change-this-in-real-deployment-please-use-env"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    DATABASE_URL: str = "sqlite:///./asset_manager.db"
    STORAGE_DIR: str = "./storage"
    MFA_DEMO_CODE: str = "123456"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()