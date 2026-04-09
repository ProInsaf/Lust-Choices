from app.core.database import engine, Base
from app.models.story import Story, Like, Purchase, User  # noqa — triggers table registration


def init_db():
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    print("Done [OK]")


if __name__ == "__main__":
    init_db()
