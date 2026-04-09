import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

PREVIEW_BUCKET = "previews"
JSON_BUCKET = "stories"


def get_public_url(bucket: str, path: str) -> str:
    """Get public URL for a file in Supabase Storage."""
    return supabase.storage.from_(bucket).get_public_url(path)


def upload_file(bucket: str, path: str, content: bytes, content_type: str) -> str:
    """Upload file to Supabase Storage, return public URL."""
    supabase.storage.from_(bucket).upload(
        path,
        content,
        {"content-type": content_type, "upsert": "true"},
    )
    return get_public_url(bucket, path)


def delete_file(bucket: str, path: str) -> None:
    """Delete a file from Supabase Storage."""
    supabase.storage.from_(bucket).remove([path])
