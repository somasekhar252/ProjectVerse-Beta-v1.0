import os
import tempfile
from fastapi import FastAPI, UploadFile, File, HTTPException, status
from pydantic import BaseModel
from cloudinary_config import configure_cloudinary, upload_video_to_cloudinary
import cloudinary.exceptions

# Initialize FastAPI application
app = FastAPI(title="Video Upload API")

# Configure Cloudinary immediately when the app starts
configure_cloudinary()

# Define allowed video content types
ALLOWED_VIDEO_TYPES = {
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/x-msvideo": "avi",
    "video/webm": "webm"
}

def is_valid_video_type(content_type: str) -> bool:
    """
    Checks if the uploaded file's content type is one of the allowed video formats.
    
    Args:
        content_type (str): The MIME type of the file.
        
    Returns:
        bool: True if it's a valid video format, False otherwise.
    """
    return content_type in ALLOWED_VIDEO_TYPES

@app.post("/upload/video")
async def upload_video(file: UploadFile = File(...)):
    """
    API endpoint to upload a video file to Cloudinary.
    It accepts MP4, MOV, AVI, and WebM. The uploaded file is temporarily saved locally,
    uploaded to Cloudinary in the 'reels' folder, and then the local file is deleted.
    """
    # 1. Validate the file type
    if not is_valid_video_type(file.content_type):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid video format. Supported formats are MP4, MOV, AVI, and WebM."
        )

    temp_file_path = None
    
    try:
        # 2. Save the uploaded file to a temporary file locally
        # This is necessary because Cloudinary's upload function typically expects a file path
        # or file-like object. Using a named temporary file makes it safe and easy to clean up.
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ALLOWED_VIDEO_TYPES[file.content_type]}") as temp_file:
            temp_file_path = temp_file.name
            
            # Read the incoming file chunks and write them to the temp file
            while content := await file.read(1024 * 1024):  # read in 1MB chunks
                temp_file.write(content)
        
        # 3. Upload the temporary file to Cloudinary
        upload_result = upload_video_to_cloudinary(temp_file_path)
        
        # 4. Extract required information from the Cloudinary response
        # Using .get() ensures it won't crash if a field happens to be missing
        video_url = upload_result.get("secure_url")
        public_id = upload_result.get("public_id")
        duration = upload_result.get("duration")
        video_format = upload_result.get("format")
        size = upload_result.get("bytes")
        
        # Return the specific required JSON structure
        return {
            "videoUrl": video_url,
            "publicId": public_id,
            "duration": str(duration) if duration else "unknown",
            "format": video_format,
            "size": str(size) if size else "unknown"
        }

    except cloudinary.exceptions.Error as cloud_err:
        # Handle specific errors from Cloudinary (e.g. bad credentials, file too large)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Cloudinary upload failed: {str(cloud_err)}"
        )
    except Exception as e:
        # Catch any other unexpected errors
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred during upload: {str(e)}"
        )
    finally:
        # 5. Ensure the temporary file is deleted after upload or if an error occurs
        # This keeps the server disk from filling up.
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except Exception as cleanup_err:
                # Log cleanup errors, but do not override the main response/exception
                print(f"Failed to delete temp file {temp_file_path}: {cleanup_err}")
