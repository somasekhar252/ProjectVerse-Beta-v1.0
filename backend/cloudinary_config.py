import os
from dotenv import load_dotenv
import cloudinary
import cloudinary.uploader

def configure_cloudinary():
    load_dotenv()
    cloudinary.config(
        cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME", "projectverse"),
        api_key=os.getenv("CLOUDINARY_API_KEY"),
        api_secret=os.getenv("CLOUDINARY_API_SECRET"),
        secure=True
    )

def upload_video_to_cloudinary(file_path: str):
    configure_cloudinary()
    response = cloudinary.uploader.upload(
        file_path,
        resource_type="video",
        folder="reels/videos"
    )
    return response