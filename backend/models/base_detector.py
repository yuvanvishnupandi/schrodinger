"""
SCHRÖDINGER: Base Detector Abstract Class
------------------------------------------
All detection engines inherit from this base class to enforce a consistent
interface across audio, video, and image pipelines.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Dict, List, Tuple
import numpy as np
import time
import logging

class MaskingFormatter(logging.Formatter):
    def format(self, record):
        msg = super().format(record)
        return msg.replace(r"C:\Users\yuvan", "[MASKED]").replace(r"c:\Users\yuvan", "[MASKED]")

formatter = MaskingFormatter("[%(asctime)s] [%(name)s] %(levelname)s: %(message)s", datefmt="%H:%M:%S")
handler = logging.StreamHandler()
handler.setFormatter(formatter)
logging.basicConfig(level=logging.INFO, handlers=[handler])

@dataclass
class DetectionResult:
    score: float           # 0.0 (real) → 1.0 (fake)
    status: str            # "REAL" | "FAKE" | "INCONCLUSIVE" | "ERROR"
    reason: str            # Human-readable explanation
    confidence: float      # 1 - vote_std (how confident the ensemble is)
    latency_ms: float      # Inference time in milliseconds

    def to_dict(self) -> Dict:
        return {
            "score": round(self.score, 3),
            "status": self.status,
            "reason": self.reason,
            "confidence": round(self.confidence, 3),
            "latency_ms": round(self.latency_ms, 1),
        }

class BaseDetector(ABC):
    """Abstract base class for all SCHRÖDINGER detection engines."""
    
    def __init__(self, name: str):
        self.name = name
        self.logger = logging.getLogger(f"SCHRÖDINGER.{name}")
        self.is_ready = False

    def _timed_analyze(self, path: str) -> DetectionResult:
        """Wraps analyze() with timing and error handling."""
        t0 = time.time()
        try:
            result = self.analyze(path)
        except Exception as e:
            self.logger.error(f"Analysis failed: {e}", exc_info=True)
            result = DetectionResult(
                score=0.5, status="ERROR",
                reason=str(e), confidence=0.0,
                latency_ms=0.0
            )
        result.latency_ms = (time.time() - t0) * 1000
        self.logger.info(
            f"Result: {result.status} (score={result.score:.3f}, "
            f"conf={result.confidence:.3f}, {result.latency_ms:.0f}ms)"
        )
        return result

    @abstractmethod
    def analyze(self, path: str) -> DetectionResult:
        """Override in subclass to implement detection logic."""
        pass

    def _calibrate(
        self,
        votes: List[Tuple[float, float]],
        reasons: List[str],
        fake_thresh: float,
        real_thresh: float,
        abstention_thresh: float
    ) -> DetectionResult:
        """
        Unified ensemble fusion with calibrated abstention.
        votes: list of (score, weight) tuples
        """
        if not votes:
            return DetectionResult(0.5, "ERROR", "No votes", 0.0, 0.0)

        total_w = sum(w for _, w in votes)
        final_score = sum(s * w for s, w in votes) / total_w
        vote_std = float(np.std([s for s, _ in votes]))
        confidence = max(0.0, 1.0 - vote_std)
        full_reason = " | ".join(r for r in reasons if r)

        if vote_std > abstention_thresh:
            status = "INCONCLUSIVE"
        elif final_score >= fake_thresh:
            status = "FAKE"
        elif final_score <= real_thresh:
            status = "REAL"
        else:
            status = "INCONCLUSIVE"

        return DetectionResult(
            score=round(final_score, 3),
            status=status,
            reason=full_reason,
            confidence=round(confidence, 3),
            latency_ms=0.0
        )
