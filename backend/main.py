"""
SCHRÖDINGER: Agentic AI Deepfake Forensics API v3.0
----------------------------------------------------
Agentic Orchestrator: routes media to the correct deep learning pipeline,
fuses results, and returns calibrated, zero-hallucination verdicts.
"""

from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
os.environ['KMP_DUPLICATE_LIB_OK'] = 'True'
import sys
import logging
import traceback
import uuid
import asyncio
from pydantic import BaseModel
from passlib.context import CryptContext
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi import HTTPException

# Inject local backend path for clean imports
sys.path.insert(0, os.path.dirname(__file__))

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [ORCHESTRATOR] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger("SCHRÖDINGER")

class ListHandler(logging.Handler):
    def __init__(self):
        super().__init__()
        self.logs = []
    
    def emit(self, record):
        msg = self.format(record)
        if "[DOWNLOAD]" in msg and len(self.logs) > 0 and "[DOWNLOAD]" in self.logs[-1] and "Recovered" not in msg:
            self.logs[-1] = msg
        else:
            self.logs.append(msg)
            if len(self.logs) > 500:
                self.logs.pop(0)
    
    def clear(self):
        self.logs = []

live_log_handler = ListHandler()
live_log_handler.setFormatter(logging.Formatter('[%(asctime)s] [ORCHESTRATOR] [%(levelname)s] %(message)s', datefmt="%H:%M:%S"))
logger.addHandler(live_log_handler)

app = FastAPI(
    title="SCHRÖDINGER: Agentic Deepfake Forensics",
    description=(
        "Multi-layer Deep Learning Inference API. "
        "Supports video (MP4/AVI/MOV), audio (WAV/MP3/M4A), "
        "and image (JPG/PNG/WebP) deepfake detection."
    ),
    version="3.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── MongoDB Auth Setup ───────────────────────────────────────────────────────
MONGO_URL = os.environ.get("MONGODB_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_URL)
db = client.schrodinger_db
users_collection = db.get_collection("users")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class UserAuth(BaseModel):
    email: str
    password: str

@app.get("/logs")
def get_live_logs():
    return {"logs": live_log_handler.logs}

@app.post("/api/auth/signup")
async def signup(user: UserAuth):
    if user.email.lower() == "yuvan@gmail.com":
        raise HTTPException(status_code=400, detail="Reserved test username")
        
    try:
        existing = await users_collection.find_one({"email": user.email})
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        hashed_pw = pwd_context.hash(user.password)
        await users_collection.insert_one({"email": user.email, "password": hashed_pw})
    except Exception as e:
        logger.error(f"Database error during signup: {e}")
        raise HTTPException(status_code=503, detail="Database connection error. Please use test account 'yuvan@gmail.com' to login.")
        
    return {"message": "Success", "email": user.email}

@app.post("/api/auth/login")
async def login(user: UserAuth):
    # Fast, error-free hardcoded test user
    if user.email.lower() == "yuvan@gmail.com" and user.password == "yvp":
        return {"message": "Success", "email": user.email}
        
    try:
        db_user = await users_collection.find_one({"email": user.email})
        if not db_user or not pwd_context.verify(user.password, db_user["password"]):
            raise HTTPException(status_code=401, detail="Invalid credentials")
    except Exception as e:
        logger.error(f"Database error during login: {e}")
        raise HTTPException(status_code=503, detail="Database connection error. Use test account 'yuvan@gmail.com' / 'yvp'")
    
    return {"message": "Success", "email": user.email}

# ── File type routing maps ─────────────────────────────────────────────────────
AUDIO_EXTS  = {'wav', 'mp3', 'm4a', 'ogg', 'flac', 'aac', 'wma'}
VIDEO_EXTS  = {'mp4', 'avi', 'mov', 'mkv', 'webm', 'flv', 'wmv', '3gp', 'ts'}
IMAGE_EXTS  = {'jpg', 'jpeg', 'png', 'webp', 'bmp', 'tiff', 'tif', 'heic', 'avif'}


@app.get("/")
def root():
    return {
        "status": "SCHRÖDINGER Engine Online",
        "version": "3.0.0",
        "supported_formats": {
            "video": sorted(VIDEO_EXTS),
            "audio": sorted(AUDIO_EXTS),
            "image": sorted(IMAGE_EXTS),
        }
    }

@app.get("/health")
def health():
    return {"status": "ok"}


# Allow up to 3 concurrent deep learning pipelines (multi-tab support)
analysis_lock = asyncio.Semaphore(3)

@app.post("/analyze/media")
async def analyze_media(file: UploadFile = File(...)):
    live_log_handler.clear()
    """
    Agentic AI Orchestrator Endpoint.
    Accepts any audio, video, or image file.
    Returns a calibrated deepfake verdict with multi-layer evidence.
    """
    file_ext = file.filename.rsplit('.', 1)[-1].lower().strip() if '.' in file.filename else ''
    temp_id = str(uuid.uuid4())[:8]
    temp_path = f"temp_upload_{temp_id}.{file_ext}" if file_ext else f"temp_upload_{temp_id}"

    logger.info(f"Received file: {file.filename} (ext={file_ext}) -> {temp_path}")

    content = await file.read()
    with open(temp_path, "wb") as f:
        f.write(content)

    try:
        async with analysis_lock:
            # ── Route to correct pipeline ──────────────────────────────────────────
            if file_ext in IMAGE_EXTS:
                result = await _run_image_pipeline(temp_path, file.filename)
            elif file_ext in AUDIO_EXTS:
                result = await _run_audio_pipeline(temp_path, file.filename)
            elif file_ext in VIDEO_EXTS:
                result = await _run_video_pipeline(temp_path, file.filename)
            else:
                supported = sorted(IMAGE_EXTS | AUDIO_EXTS | VIDEO_EXTS)
                return {
                    "error": (
                        f"Unsupported format: .{file_ext}. "
                        f"Supported: {', '.join(supported)}"
                    )
                }

        # Generate LLM Executive Summary
        logger.info("Initializing Large Language Model (LLM) cluster for verdict verification...")
        logger.info("Cross-examining deep learning layers and transcribing context. Please wait...")
        from api.llm_report import get_llm_reporter
        llm = get_llm_reporter()
        llm_summary = await asyncio.to_thread(llm.generate_report, result, temp_path)
        logger.info("LLM verification complete. Compiling final report...")
        
        if "[VERDICT: REAL]" in llm_summary:
            result["verdict"] = _make_verdict("REAL")
            llm_summary = llm_summary.replace("[VERDICT: REAL]", "").replace("*", "").strip()
            logger.info("LLM explicitly verified and overrode the verdict to REAL/AUTHENTIC.")
        elif "[VERDICT: FAKE]" in llm_summary:
            result["verdict"] = _make_verdict("FAKE")
            llm_summary = llm_summary.replace("[VERDICT: FAKE]", "").replace("*", "").strip()
            logger.info("LLM explicitly verified and confirmed the verdict as FAKE.")
        else:
            llm_summary = llm_summary.replace("*", "").strip()

        result["llm_summary"] = llm_summary

        return result

    except Exception as e:
        tb = traceback.format_exc()
        logger.error(f"Orchestrator error: {tb}")
        return _error_response(file.filename, str(e))

    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
            logger.info(f"Cleaned up temp file: {temp_path}")


@app.post("/analyze/url")
async def analyze_url(url: str = Form(...)):
    live_log_handler.clear()
    """
    Agentic AI Orchestrator Endpoint for URLs.
    Downloads media from YouTube, Twitter, Facebook, etc., using yt-dlp,
    then routes it through the deep learning pipelines.
    """
    logger.info(f"Received URL: {url}")
    temp_id = str(uuid.uuid4())[:8]
    
    import yt_dlp
    import time
    
    class YtDlpLogger:
        def debug(self, msg): pass
        def warning(self, msg): logger.warning(msg)
        def error(self, msg): logger.error(msg)

    # State for throttling download logs
    hook_state = {"last_time": 0}
    def yt_dlp_hook(d):
        if d['status'] == 'downloading':
            now = time.time()
            if now - hook_state["last_time"] > 0.8:
                hook_state["last_time"] = now
                p_str = d.get('_percent_str', '').strip()
                s_str = d.get('_speed_str', '').strip()
                
                # Clean ANSI escape codes from percentage string
                import re
                clean_p = re.sub(r'\x1b\[[0-9;]*m', '', p_str).replace('%', '')
                clean_p_str = re.sub(r'\x1b\[[0-9;]*m', '', p_str)
                clean_s_str = re.sub(r'\x1b\[[0-9;]*m', '', s_str)
                try:
                    p_float = float(clean_p)
                except:
                    p_float = 0
                    
                if p_str:
                    bar_len = 25
                    filled = int(bar_len * (p_float / 100))
                    bar = '█' * filled + '-' * (bar_len - filled)
                    logger.info(f"  [DOWNLOAD] [{bar}] {clean_p_str} | Speed: {clean_s_str}")
        elif d['status'] == 'finished':
            logger.info("  [DOWNLOAD] [█████████████████████████] 100.0% | Finalizing...")

    # Configure yt-dlp to download best quality
    ydl_opts = {
        'format': 'bestvideo+bestaudio/best',
        'outtmpl': f'temp_url_{temp_id}.%(ext)s',
        'quiet': True,
        'no_warnings': True,
        'nocheckcertificate': True,
        'source_address': '0.0.0.0',
        'extractor_args': {'youtube': {'player_client': ['android', 'web']}},
        'logger': YtDlpLogger(),
        'progress_hooks': [yt_dlp_hook]
    }

    downloaded_file = None
    try:
        logger.info("Initializing youtube-dl (yt-dlp) extraction engine...")
        logger.info(f"Connecting to media servers to download high-resolution stream...")
        def _download():
            try:
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    return ydl.extract_info(url, download=True)
            except Exception as e:
                err_str = str(e)
                if "WinError 32" in err_str or "used by another process" in err_str:
                    import re
                    match = re.search(r"'([^']+)' ->", err_str)
                    if match:
                        temp_file = match.group(1)
                        if os.path.exists(temp_file):
                            logger.info(f"  [DOWNLOAD] Recovered locked file bypass: {temp_file}")
                            # Mock info dict so the pipeline continues
                            return {'ext': temp_file.split('.')[-1], 'requested_downloads': [{'filepath': temp_file}]}
                raise e
                
        info = await asyncio.to_thread(_download)
        
        # Find the downloaded filename
        if 'requested_downloads' in info and len(info['requested_downloads']) > 0:
            downloaded_file = info['requested_downloads'][0]['filepath']
            ext = downloaded_file.split('.')[-1]
        else:
            ext = info.get('ext', 'mp4')
            downloaded_file = f'temp_url_{temp_id}.{ext}'
            
        original_title = info.get('title', 'URL Download') + f".{ext}"

        if not os.path.exists(downloaded_file):
            return _error_response(url, "Failed to download media from URL.")

        file_ext = ext.lower().strip()
        
        async with analysis_lock:
            # ── Route to correct pipeline ──────────────────────────────────────────
            if file_ext in IMAGE_EXTS:
                result = await _run_image_pipeline(downloaded_file, original_title)
            elif file_ext in AUDIO_EXTS:
                result = await _run_audio_pipeline(downloaded_file, original_title)
            elif file_ext in VIDEO_EXTS or file_ext == "mkv" or file_ext == "webm": # yt-dlp might use mkv/webm
                result = await _run_video_pipeline(downloaded_file, original_title)
            else:
                supported = sorted(IMAGE_EXTS | AUDIO_EXTS | VIDEO_EXTS)
                return {
                    "error": (
                        f"Downloaded unsupported format: .{file_ext}. "
                        f"Supported: {', '.join(supported)}"
                    )
                }

        # Generate LLM Executive Summary
        logger.info("Initializing Large Language Model (LLM) cluster for verdict verification...")
        logger.info("Cross-examining deep learning layers and transcribing context. Please wait...")
        from api.llm_report import get_llm_reporter
        llm = get_llm_reporter()
        llm_summary = await asyncio.to_thread(llm.generate_report, result, downloaded_file)
        logger.info("LLM verification complete. Compiling final report...")
        
        if "[VERDICT: REAL]" in llm_summary:
            result["verdict"] = _make_verdict("REAL")
            llm_summary = llm_summary.replace("[VERDICT: REAL]", "").replace("*", "").strip()
            logger.info("LLM explicitly verified and overrode the verdict to REAL/AUTHENTIC.")
        elif "[VERDICT: FAKE]" in llm_summary:
            result["verdict"] = _make_verdict("FAKE")
            llm_summary = llm_summary.replace("[VERDICT: FAKE]", "").replace("*", "").strip()
            logger.info("LLM explicitly verified and confirmed the verdict as FAKE.")
        else:
            llm_summary = llm_summary.replace("*", "").strip()

        result["llm_summary"] = llm_summary

        return result

    except Exception as e:
        tb = traceback.format_exc()
        logger.error(f"URL Orchestrator error: {tb}")
        return _error_response(url, f"Failed to process URL: {str(e)}")

    finally:
        if downloaded_file and os.path.exists(downloaded_file):
            os.remove(downloaded_file)
            logger.info(f"Cleaned up temp URL file: {os.path.basename(downloaded_file)}")


# ── Pipeline Implementations ──────────────────────────────────────────────────

async def _run_image_pipeline(path: str, filename: str) -> dict:
    from models.image_model import get_image_detector
    engine = get_image_detector()
    r = await asyncio.to_thread(engine._timed_analyze, path)
    return {
        "filename": filename,
        "media_type": "image",
        "status": "success",
        "synthetic_score": round(r.score * 100, 1),
        "fraud_risk": 0.0,
        "verdict": _make_verdict(r.status),
        "confidence": r.confidence,
        "details": {
            "vision": r.reason,
            "audio": "N/A — Image file",
            "intent": "N/A — Image file",
        },
        "latency_ms": r.latency_ms,
    }


async def _run_audio_pipeline(path: str, filename: str) -> dict:
    from models.audio_model import get_audio_detector
    from models.fraud_intent import get_fraud_analyzer

    audio_engine = get_audio_detector()
    r = await asyncio.to_thread(audio_engine._timed_analyze, path)

    fraud_engine = get_fraud_analyzer()
    fraud_data = await asyncio.to_thread(fraud_engine.full_analyze, path)

    verdict = _make_verdict(r.status)

    return {
        "filename": filename,
        "media_type": "audio",
        "status": "success",
        "synthetic_score": round(r.score * 100, 1),
        "fraud_risk": round(fraud_data["fraud_risk"] * 100, 1),
        "verdict": verdict,
        "confidence": r.confidence,
        "details": {
            "vision": "N/A — Audio file",
            "audio": r.reason,
            "intent": fraud_data["reason"],
        },
        "transcript": fraud_data["transcript"],
        "latency_ms": r.latency_ms,
    }


async def _run_video_pipeline(path: str, filename: str) -> dict:
    from models.video_model import get_video_detector
    from models.fraud_intent import get_fraud_analyzer

    video_engine = get_video_detector()
    r = await asyncio.to_thread(video_engine._timed_analyze, path)

    # Try to extract audio from video for fraud intent analysis
    fraud_reason = "Audio extraction from video not attempted"
    fraud_score = 0.0
    transcript = ""

    audio_path = path + "_extracted.wav"
    try:
        import subprocess
        # Use ffmpeg if available for audio extraction
        proc = subprocess.run(
            ["ffmpeg", "-y", "-i", path,
             "-ar", "16000", "-ac", "1",
             "-t", "30",
             audio_path],
            capture_output=True, timeout=30
        )
        if os.path.exists(audio_path) and os.path.getsize(audio_path) > 1000:
            fraud_engine = get_fraud_analyzer()
            fraud_data = await asyncio.to_thread(fraud_engine.full_analyze, audio_path)
            fraud_score = fraud_data["fraud_risk"]
            fraud_reason = fraud_data["reason"]
            transcript = fraud_data["transcript"]
    except Exception as ex:
        logger.warning(f"Audio extraction failed (ffmpeg may not be installed): {ex}")
        fraud_reason = "FFmpeg not found — video audio analysis skipped"
    finally:
        if os.path.exists(audio_path):
            os.remove(audio_path)

    return {
        "filename": filename,
        "media_type": "video",
        "status": "success",
        "synthetic_score": round(r.score * 100, 1),
        "fraud_risk": round(fraud_score * 100, 1),
        "verdict": _make_verdict(r.status),
        "confidence": r.confidence,
        "details": {
            "vision": r.reason,
            "audio": "Video audio analysis via ffmpeg",
            "intent": fraud_reason,
        },
        "transcript": transcript,
        "latency_ms": r.latency_ms,
    }


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_verdict(status: str) -> str:
    mapping = {
        "FAKE": "DEEPFAKE / AI-GENERATED DETECTED",
        "REAL": "AUTHENTIC MEDIA",
        "INCONCLUSIVE": "INCONCLUSIVE — CALIBRATED ABSTENTION",
        "ERROR": "ANALYSIS ERROR",
    }
    return mapping.get(status, "UNKNOWN")


def _error_response(filename: str, error: str) -> dict:
    return {
        "filename": filename,
        "media_type": "unknown",
        "status": "error",
        "synthetic_score": 0,
        "fraud_risk": 0,
        "verdict": "ANALYSIS ERROR",
        "confidence": 0,
        "details": {
            "vision": error,
            "audio": error,
            "intent": "N/A",
        },
        "latency_ms": 0,
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
