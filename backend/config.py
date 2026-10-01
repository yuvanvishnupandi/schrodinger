"""
SCHRÖDINGER System Configuration
---------------------------------
Central configuration for all detection thresholds, model names, and weights.
"""
from dataclasses import dataclass, field
from typing import Dict
import os
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

@dataclass
class VideoConfig:
    num_frames: int = 12            # Reduced from 16 for speed
    siglip_frames: int = 6         # SigLIP only needs 6 frames (slowest model)
    low_res_threshold: int = 320
    fake_threshold: float = 0.50
    real_threshold: float = 0.30
    abstention_std_threshold: float = 0.30
    early_exit_confidence: float = 0.85  # Skip slow models if fast ones are this confident
    siglip_model: str = "google/siglip-base-patch16-224"

@dataclass
class AudioConfig:
    sample_rate: int = 16000
    max_duration_sec: int = 10
    fake_threshold: float = 0.50
    real_threshold: float = 0.30
    abstention_std_threshold: float = 0.32
    wavlm_model: str = "microsoft/wavlm-base-plus"

@dataclass
class ImageConfig:
    max_size: int = 1024
    fake_threshold: float = 0.75
    real_threshold: float = 0.45
    abstention_std_threshold: float = 0.28
    siglip_model: str = "google/siglip-base-patch16-224"

@dataclass
class FraudConfig:
    whisper_model: str = "tiny"  # Changed from small to tiny for local CPU speed
    whisper_device: str = "cpu"
    whisper_compute_type: str = "int8"

@dataclass
class LLMConfig:
    # Keys can be securely loaded from .env during production
    openai_key: str = ""
    gemini_key: str = ""
    groq_key: str = ""
    claude_key: str = ""

@dataclass
class ScrodingerConfig:
    video: VideoConfig = field(default_factory=VideoConfig)
    audio: AudioConfig = field(default_factory=AudioConfig)
    image: ImageConfig = field(default_factory=ImageConfig)
    fraud: FraudConfig = field(default_factory=FraudConfig)
    llm: LLMConfig = field(default_factory=LLMConfig)

# Global config singleton
CONFIG = ScrodingerConfig()
