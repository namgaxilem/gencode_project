# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routers.chat import router as chat_router
from app.api.routers.projects import router as projects_router

from app.db.database import Base, engine

app = FastAPI()
app.include_router(chat_router)
app.include_router(projects_router)

app.add_middleware(
    CORSMiddleware,
    # chặt chẽ hơn thì chỉ cho http://localhost:3000,5173
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    Base.metadata.create_all(bind=engine)


@app.get("/")
def root():
    return {"message": "SQLite + SQLAlchemy ready!"}
