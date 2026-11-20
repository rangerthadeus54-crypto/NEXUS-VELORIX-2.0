from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.api.v1.router import router as v1_router
from app.core.config import settings
from app.schemas import HealthResponse

app = FastAPI(
    title=settings.title,
    version=settings.version,
    description=(
        "REST API for NEXUS VELORIX. Resource endpoints require Supabase configuration "
        "and respect the database's row-level security policies."
    ),
    openapi_tags=[
        {"name": "Health", "description": "Service readiness."},
        {"name": "Users", "description": "User directory endpoints."},
        {"name": "Profiles", "description": "Player profile endpoints."},
        {"name": "Games", "description": "Game catalog endpoints."},
        {"name": "Communities", "description": "Community directory endpoints."},
        {"name": "Teams", "description": "Team directory endpoints."},
        {"name": "Tournaments", "description": "Tournament directory endpoints."},
        {"name": "Leaderboards", "description": "Leaderboard query endpoints."},
    ],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH"],
    allow_headers=["*"],
)

app.include_router(v1_router, prefix="/api/v1")


@app.get("/health", response_model=HealthResponse, tags=["Health"])
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        api_version=__version__,
        data_backend="configured" if settings.supabase_configured else "not_configured",
    )
