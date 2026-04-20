from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .database import Base, engine, SessionLocal
from .api.auth import router as auth_router
from .api.files import router as files_router
from .seed import seed_users

app = FastAPI(title=settings.APP_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

db = SessionLocal()
seed_users(db)
db.close()

app.include_router(auth_router)
app.include_router(files_router)

@app.get("/")
def root():
    return {"message": settings.APP_NAME}