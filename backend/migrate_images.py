"""
Migration script: Upload all local images to cloud storage and update database URLs.
This ensures images persist across deployments.
"""
import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from database import db
from cloud_storage import put_object, APP_NAME
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("migrate_images")

UPLOAD_DIR = Path(__file__).parent / "uploads" / "images"
CLOUD_PREFIX = f"/api/media/cloud/{APP_NAME}"


def is_local_image(url: str) -> bool:
    """Check if the URL references a local image that needs migration."""
    if not url:
        return False
    return (
        url.startswith("/api/media/images/") or
        "/api/media/images/" in url
    )


def extract_filename(url: str) -> str:
    """Extract just the filename from a URL."""
    return url.split("/")[-1]


async def upload_to_cloud(filepath: Path) -> str:
    """Upload a local file to cloud storage, return the new relative URL."""
    filename = filepath.name
    storage_path = f"{APP_NAME}/images/{filename}"
    content_type = "image/jpeg"
    if filename.endswith(".png"):
        content_type = "image/png"
    elif filename.endswith(".webp"):
        content_type = "image/webp"
    elif filename.endswith(".gif"):
        content_type = "image/gif"

    data = filepath.read_bytes()
    if len(data) < 10:
        logger.warning(f"  Skipping {filename} (too small: {len(data)} bytes)")
        return ""

    result = put_object(storage_path, data, content_type)
    new_url = f"{CLOUD_PREFIX}/images/{filename}"
    logger.info(f"  Uploaded {filename} -> {new_url} ({len(data)} bytes)")
    return new_url


async def migrate_articles():
    """Migrate article images."""
    logger.info("=== Migrating articles ===")
    count = 0
    async for article in db.articles.find({}, {"_id": 0}):
        url = article.get("image_url", "")
        if is_local_image(url):
            filename = extract_filename(url)
            filepath = UPLOAD_DIR / filename
            if filepath.exists():
                new_url = await upload_to_cloud(filepath)
                if new_url:
                    await db.articles.update_one(
                        {"id": article["id"]},
                        {"$set": {"image_url": new_url}}
                    )
                    count += 1
                    logger.info(f"  Article '{article.get('title', '')}': {url} -> {new_url}")
            else:
                logger.warning(f"  Article '{article.get('title', '')}': file not found {filepath}")
    logger.info(f"  Migrated {count} articles")
    return count


async def migrate_properties():
    """Migrate property images."""
    logger.info("=== Migrating properties ===")
    count = 0
    async for prop in db.properties.find({}, {"_id": 0}):
        images = prop.get("images", [])
        updated = False
        new_images = []
        for img_url in images:
            if is_local_image(img_url):
                filename = extract_filename(img_url)
                filepath = UPLOAD_DIR / filename
                if filepath.exists():
                    new_url = await upload_to_cloud(filepath)
                    if new_url:
                        new_images.append(new_url)
                        updated = True
                        continue
                logger.warning(f"  Property '{prop.get('title', '')}': file not found for {img_url}")
                new_images.append(img_url)  # Keep old URL if can't migrate
            else:
                new_images.append(img_url)

        if updated:
            await db.properties.update_one(
                {"id": prop["id"]},
                {"$set": {"images": new_images}}
            )
            count += 1
            logger.info(f"  Property '{prop.get('title', '')}': updated {len(images)} images")
    logger.info(f"  Migrated {count} properties")
    return count


async def migrate_procedures():
    """Migrate procedure images."""
    logger.info("=== Migrating procedures ===")
    count = 0
    async for proc in db.procedures.find({}, {"_id": 0}):
        url = proc.get("image_url", "")
        if is_local_image(url):
            filename = extract_filename(url)
            filepath = UPLOAD_DIR / filename
            if filepath.exists():
                new_url = await upload_to_cloud(filepath)
                if new_url:
                    await db.procedures.update_one(
                        {"id": proc["id"]},
                        {"$set": {"image_url": new_url}}
                    )
                    count += 1
                    logger.info(f"  Procedure '{proc.get('title', '')}': {url} -> {new_url}")
    logger.info(f"  Migrated {count} procedures")
    return count


async def migrate_user_avatars():
    """Migrate user avatar images."""
    logger.info("=== Migrating user avatars ===")
    count = 0
    async for user in db.users.find({}, {"_id": 0}):
        url = user.get("avatar_url", "")
        if is_local_image(url):
            filename = extract_filename(url)
            filepath = UPLOAD_DIR / filename
            if filepath.exists():
                new_url = await upload_to_cloud(filepath)
                if new_url:
                    await db.users.update_one(
                        {"id": user["id"]},
                        {"$set": {"avatar_url": new_url}}
                    )
                    count += 1
    logger.info(f"  Migrated {count} user avatars")
    return count


async def bulk_upload_remaining():
    """Upload ALL local files that haven't been uploaded yet."""
    logger.info("=== Uploading all remaining local images to cloud ===")
    count = 0
    if not UPLOAD_DIR.exists():
        return 0
    for filepath in UPLOAD_DIR.iterdir():
        if filepath.is_file() and filepath.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
            try:
                await upload_to_cloud(filepath)
                count += 1
            except Exception as e:
                logger.error(f"  Failed to upload {filepath.name}: {e}")
    logger.info(f"  Uploaded {count} files to cloud")
    return count


async def main():
    logger.info("Starting image migration to cloud storage...")

    # First, bulk upload ALL local images to cloud
    await bulk_upload_remaining()

    # Then update database references
    a = await migrate_articles()
    p = await migrate_properties()
    pr = await migrate_procedures()
    u = await migrate_user_avatars()

    logger.info(f"\n=== MIGRATION COMPLETE ===")
    logger.info(f"Articles: {a}, Properties: {p}, Procedures: {pr}, Users: {u}")
    logger.info("All images now use cloud storage with relative URLs.")


if __name__ == "__main__":
    asyncio.run(main())
