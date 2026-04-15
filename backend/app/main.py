from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import stories, admin, users, webhook, analytics
from app.core.bot import dp, bot
from app.bot import handlers
import contextlib

dp.include_router(handlers.router)

@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    # Setup webhook if ENV has domain, else polling could be run (skip for now to avoid complexity, webhooks managed externally)
    print("Backend API starting...")
    yield
    print("Backend API shutting down...")
    await bot.session.close()

app = FastAPI(
    title="Lust Choices API",
    description="18+ Interactive Visual Novel Marketplace",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(stories.router)
app.include_router(admin.router)
app.include_router(users.router)
app.include_router(webhook.router)
app.include_router(analytics.router)


@app.get("/")
def health_check():
    return {"msg": "Lust Choices API is alive 🔥", "version": "1.0.0"}
