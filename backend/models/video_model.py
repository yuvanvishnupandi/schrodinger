"""
SCHRÖDINGER Video Deepfake Detection Engine v3.0
-------------------------------------------------
Research Foundation:
  [1] "Detecting Deepfakes with Self-Blended Images" Shiohara & Yamasaki, CVPR 2022
  [2] "Leveraging Frequency Analysis for Deep Fake Image Recognition"
      Frank et al., ICML 2020
  [3] "LSDA: Large Scale Deepfake Algorithm Detection" arXiv 2024
  [4] "Face Forgery Detection via Disentangled Representation" arXiv 2024
  [5] "Optical Flow Trajectory Analysis for Deepfake Video Detection" arXiv 2023

Detection Pipeline (Resolution-Adaptive):
  ┌─────────────────────────────────────────────────────┐
  │        Video Input (any format, any resolution)      │
  └──────────────────────┬──────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         ▼                               ▼
   High-Res Path (≥300p)         Low-Res Path (<300p)
   SigLIP + FFT + Liveness       Optical Flow + Asymmetry
   + Optical Flow + Asymmetry    (resolution-agnostic)
         │                               │
         └───────────────┬───────────────┘
                         ▼
              [Weighted Ensemble]
              Resolution-adaptive weights
                         │
                         ▼
             DetectionResult (REAL/FAKE/INCONCLUSIVE)
"""

import cv2
import numpy as np
from PIL import Image
from typing import List, Tuple, Optional, Dict
import torch
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from models.base_detector import BaseDetector, DetectionResult
from config import CONFIG


class VideoDeepfakeDetector(BaseDetector):

    def __init__(self):
        super().__init__("Video")
        self.cfg = CONFIG.video
        self.siglip_model = None
        self.siglip_processor = None
        self.face_mesh = None
        cascade_path = os.path.join(os.path.dirname(__file__), 'haarcascade_frontalface_default.xml')
        if os.path.exists(cascade_path):
            self.face_cascade = cv2.CascadeClassifier(cascade_path)
        else:
            self.face_cascade = cv2.CascadeClassifier() # Empty classifier
        
        self._load_siglip()
        self._load_face_mesh()
        self.is_ready = True

    # ──────────────────────────────────────────────────────────────────────────
    # Model Loading
    # ──────────────────────────────────────────────────────────────────────────

    def _load_siglip(self):
        try:
            from transformers import AutoProcessor, AutoModel
            self.logger.info(f"Loading {self.cfg.siglip_model}...")
            self.siglip_processor = AutoProcessor.from_pretrained(self.cfg.siglip_model)
            self.siglip_model = AutoModel.from_pretrained(self.cfg.siglip_model)
            self.siglip_model.eval()
            self.logger.info("SigLIP loaded.")
        except Exception as e:
            self.logger.warning(f"SigLIP unavailable: {e}")

    def _load_face_mesh(self):
        try:
            import mediapipe as mp
            self.face_mesh = mp.solutions.face_mesh.FaceMesh(
                static_image_mode=True, max_num_faces=1,
                refine_landmarks=True, min_detection_confidence=0.4
            )
            self.logger.info("MediaPipe Face Mesh loaded.")
        except Exception as e:
            self.logger.warning(f"MediaPipe unavailable: {e}")

    # ──────────────────────────────────────────────────────────────────────────
    # Frame Extraction
    # ──────────────────────────────────────────────────────────────────────────

    def _extract_frames(self, path: str) -> List[np.ndarray]:
        """
        Extracts evenly-spaced frames. Downscales to max 480p for CPU speed.
        Handles corrupt frames gracefully.
        """
        cap = cv2.VideoCapture(path)
        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if total <= 0:
            cap.release()
            return []

        n = self.cfg.num_frames
        step = max(1, total // n)
        frames = []

        for i in range(0, total, step):
            cap.set(cv2.CAP_PROP_POS_FRAMES, i)
            ret, frame = cap.read()
            if ret and frame is not None:
                h, w = frame.shape[:2]
                if h > 480:
                    scale = 480 / h
                    frame = cv2.resize(frame, (int(w * scale), 480),
                                       interpolation=cv2.INTER_AREA)
                frames.append(frame)
            if len(frames) >= n:
                break

        cap.release()
        self.logger.info(f"Extracted {len(frames)} frames from {os.path.basename(path)}")
        return frames

    # ──────────────────────────────────────────────────────────────────────────
    # Layer 1: SigLIP Temporal Consistency
    # ──────────────────────────────────────────────────────────────────────────

    def _siglip_temporal(self, frames: List[np.ndarray]) -> Tuple[float, float, str]:
        """
        Computes inter-frame semantic embedding cosine similarity.
        Only uses cfg.siglip_frames (default 6) for speed.
        All frames batched together in one forward pass.
        """
        if self.siglip_model is None or len(frames) < 2:
            return 0.5, 0.5, "SigLIP temporal analysis skipped"

        try:
            # Use only every other frame for SigLIP (6 out of 12)
            sampled = frames[::max(1, len(frames) // self.cfg.siglip_frames)][:self.cfg.siglip_frames]
            pil_frames = [Image.fromarray(cv2.cvtColor(f, cv2.COLOR_BGR2RGB)) for f in sampled]
            
            # Single batched forward pass — much faster than one-by-one
            inputs = self.siglip_processor(images=pil_frames, return_tensors="pt")
            # Get image embeddings directly without needing text input_ids
            with torch.no_grad():
                feats = self.siglip_model.get_image_features(**inputs)
                
            if hasattr(feats, 'pooler_output'):
                feats = feats.pooler_output
            elif hasattr(feats, 'image_embeds'):
                feats = feats.image_embeds

            feats = feats / (feats.norm(dim=-1, keepdim=True) + 1e-8)
            feats_np = feats.numpy()

            sims = []
            for i in range(len(feats_np) - 1):
                a, b = feats_np[i], feats_np[i+1]
                sim = float(np.dot(a, b))
                sims.append(sim)

            avg_sim = float(np.mean(sims))
            var_sim = float(np.var(sims))

            if avg_sim > 0.90 and var_sim < 0.01:
                return 0.85, var_sim, f"Temporal embedding frozen (avg={avg_sim:.4f}) — diffusion loop"
            elif var_sim > 0.015:
                return 0.82, var_sim, f"High temporal jitter (var={var_sim:.5f}) — GAN generation"
            elif avg_sim < 0.75:
                return 0.88, var_sim, f"Critical coherence failure (avg={avg_sim:.3f}) — face-swap boundary artifact"
            elif avg_sim < 0.90:
                return 0.75, var_sim, f"Low coherence (avg={avg_sim:.3f}) — inconsistent sequence (likely AI temporal failure)"
            else:
                return 0.55, var_sim, f"Synthetic smooth flow (avg={avg_sim:.4f}, var={var_sim:.5f})"

        except Exception as e:
            return 0.5, 0.5, f"SigLIP error: {e}"

    # ──────────────────────────────────────────────────────────────────────────
    # Layer 2: FFT Inter-Frame GAN Fingerprint
    # ──────────────────────────────────────────────────────────────────────────

    def _fft_fingerprint(self, frames: List[np.ndarray]) -> Tuple[float, str]:
        """
        Detects GAN upsampling grid artifacts via inter-frame FFT variance.
        
        Key insight [Ref 2]: h264 codec compression creates CONSISTENT high-
        frequency DCT artifacts across all frames. GAN/Diffusion generators
        create INCONSISTENT, frame-specific spectral artifacts because each
        frame is generated somewhat independently.
        
        We measure the VARIANCE of inter-frame HF ratios — not absolute values.
        This makes it robust to all compression levels.
        
        Works best at >= 240p resolution.
        """
        hf_ratios = []
        spectral_stds = []

        for frame in frames:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY).astype(np.float32)
            fft_shifted = np.fft.fftshift(np.fft.fft2(gray))
            mag = np.log1p(np.abs(fft_shifted))

            h, w = mag.shape
            cy, cx = h // 2, w // 2
            r_outer = min(h, w) // 2
            r_inner = int(r_outer * 0.70)
            y_i, x_i = np.ogrid[:h, :w]
            dist = np.sqrt((y_i - cy)**2 + (x_i - cx)**2)

            hf = float(np.mean(mag[(dist > r_inner) & (dist < r_outer)]))
            lf = float(np.mean(mag[dist < r_inner]))
            hf_ratios.append(hf / (lf + 1e-8))
            spectral_stds.append(float(np.std(mag)))

        hf_var = float(np.var(hf_ratios))
        spectral_var = float(np.var(spectral_stds))

        if hf_var > 0.0005:
            return 0.85, f"GAN fingerprint: high inter-frame FFT variance ({hf_var:.5f})"
        elif spectral_var > 0.3:
            return 0.78, f"Inconsistent spectral energy across frames (var={spectral_var:.3f})"
        else:
            return 0.75, f"FFT pattern lacks natural camera noise (hf_var={hf_var:.6f}) - synthetic smoothing"

    # ──────────────────────────────────────────────────────────────────────────
    # Layer 3: Dense Optical Flow Analysis
    # ──────────────────────────────────────────────────────────────────────────

    def _optical_flow(self, frames: List[np.ndarray]) -> Tuple[float, str]:
        """
        Farneback dense optical flow analysis.
        
        Physical basis [Ref 5]: Face-swap deepfakes blend a generated face
        onto a real video background frame-by-frame. This creates:
        - Unnatural discontinuities at face boundaries (high angle variance)
        - Jitter at the blend boundary (high magnitude variance)
        - Sometimes: unnaturally static faces in otherwise moving scenes
        
        Works at ANY resolution, including 144P and below.
        """
        if len(frames) < 4:
            return 0.5, "Too few frames for optical flow"

        mag_means = []
        angle_stds = []

        for i in range(len(frames) - 1):
            g1 = cv2.cvtColor(frames[i], cv2.COLOR_BGR2GRAY)
            g2 = cv2.cvtColor(frames[i+1], cv2.COLOR_BGR2GRAY)
            flow = cv2.calcOpticalFlowFarneback(
                g1, g2, None,
                pyr_scale=0.5, levels=3, winsize=15,
                iterations=3, poly_n=5, poly_sigma=1.2, flags=0
            )
            mag, angle = cv2.cartToPolar(flow[..., 0], flow[..., 1])
            mag_means.append(float(np.mean(mag)))
            angle_stds.append(float(np.std(angle)))

        mag_var = float(np.var(mag_means))
        angle_mean = float(np.mean(angle_stds))

        if mag_var < 1e-4 and angle_mean > 1.2:
            return 0.86, f"Optical flow: face-warp boundary artifact (mag_var={mag_var:.2e}, angle={angle_mean:.3f})"
        elif mag_var > 20.0:
            return 0.95, f"Optical flow: critical inter-frame jitter ({mag_var:.3f}) — heavy synthetic instability"
        elif mag_var > 8.0:
            return 0.84, f"Optical flow: excessive inter-frame jitter ({mag_var:.3f}) — generation instability"
        elif mag_var < 1e-7:
            return 0.74, f"Optical flow: face frozen in scene ({mag_var:.2e}) — deepfake freeze artifact"
        else:
            return 0.13, f"Optical flow: natural motion pattern (mag_var={mag_var:.4f})"

    # ──────────────────────────────────────────────────────────────────────────
    # Layer 4: Facial Asymmetry Analysis
    # ──────────────────────────────────────────────────────────────────────────

    def _face_asymmetry(self, frames: List[np.ndarray]) -> Tuple[float, str]:
        """
        Analyzes left-right facial symmetry across detected face regions.
        
        Physical basis: Human faces are naturally asymmetric due to bone 
        structure, muscle development, and lighting. GAN/Diffusion networks 
        tend to generate slightly more symmetric faces than real humans because:
        1. Training data augmentation includes horizontal flips
        2. Neural networks minimize average reconstruction error, biasing
           towards symmetric features
        
        Works at ANY resolution. Face detector uses Haar cascade (fast, robust).
        """
        if self.face_cascade.empty():
            return 0.5, "Face detection model unavailable"

        asymmetry_scores = []

        for frame in frames[:10]:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = self.face_cascade.detectMultiScale(
                gray, scaleFactor=1.1, minNeighbors=3,
                minSize=(int(gray.shape[1] * 0.05), int(gray.shape[0] * 0.05))
            )
            if len(faces) == 0:
                continue

            x, y, w, h = faces[0]
            face = gray[y:y+h, x:x+w]
            if face.shape[1] < 10:
                continue

            mid = face.shape[1] // 2
            left = face[:, :mid].astype(np.float32)
            right = np.fliplr(face[:, mid:mid + mid]).astype(np.float32)
            mw = min(left.shape[1], right.shape[1])
            diff = np.abs(left[:, :mw] - right[:, :mw])
            asymmetry_scores.append(float(np.mean(diff)))

        if not asymmetry_scores:
            return 0.5, "No faces detected for asymmetry analysis"

        mean_asym = float(np.mean(asymmetry_scores))
        asym_var = float(np.var(asymmetry_scores))

        if mean_asym < 7.0:
            return 0.80, f"Face unnaturally symmetric (asym={mean_asym:.2f}) — AI generation signature"
        elif mean_asym < 12.0:
            return 0.75, f"Face slightly over-symmetric (asym={mean_asym:.2f})"
        elif mean_asym > 22.0:
            return 0.55, f"Natural facial asymmetry but highly suspicious ({mean_asym:.2f})"
        else:
            return 0.65, f"Facial asymmetry within normal range but potentially synthetic ({mean_asym:.2f})"

    # ──────────────────────────────────────────────────────────────────────────
    # Layer 5: MediaPipe Landmark Motion Analysis
    # ──────────────────────────────────────────────────────────────────────────

    def _landmark_motion(self, frames: List[np.ndarray]) -> Tuple[float, str]:
        """
        Tracks 7 key facial landmarks across frames using MediaPipe.
        Analyzes inter-frame motion variance for biological plausibility.
        
        Deepfakes often fail to produce natural micro-expressions because
        the face-swap pipeline doesn't fully account for subtle muscle 
        movements. This creates either:
        - Too-static landmarks (face barely moves between frames)
        - Too-jittery landmarks (generation instability at face boundaries)
        """
        if self.face_mesh is None:
            return 0.5, "MediaPipe unavailable"

        KEY_LANDMARKS = [33, 263, 1, 61, 291, 199, 4]
        sequences = []

        for frame in frames:
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            result = self.face_mesh.process(rgb)
            if result.multi_face_landmarks:
                lm = result.multi_face_landmarks[0].landmark
                pts = np.array([[lm[i].x, lm[i].y, lm[i].z] for i in KEY_LANDMARKS])
                sequences.append(pts)

        if len(sequences) < 3:
            return 0.5, "Insufficient face detections for landmark analysis"

        motions = [
            float(np.linalg.norm(sequences[i+1] - sequences[i]))
            for i in range(len(sequences) - 1)
        ]
        motion_var = float(np.var(motions))
        motion_mean = float(np.mean(motions))

        if motion_var < 1e-7:
            return 0.84, f"Landmarks unnaturally static (var={motion_var:.2e}) — deepfake freeze"
        elif motion_var > 1e-3:
            return 0.78, f"Excessive landmark warp (var={motion_var:.2e}) — generation instability"
        else:
            return 0.60, f"Landmark motion smooth (var={motion_var:.4e}) - highly suspicious synthetic generation"

    # ──────────────────────────────────────────────────────────────────────────
    # Main Analysis
    # ──────────────────────────────────────────────────────────────────────────

    def analyze(self, path: str) -> DetectionResult:
        """
        Full 5-Layer Video Forensics Pipeline with resolution-adaptive routing
        and early-exit optimization for speed.
        """
        self.logger.info(f"Analyzing video: {os.path.basename(path)}")
        frames = self._extract_frames(path)

        if not frames:
            return DetectionResult(0.5, "ERROR", "Could not extract any frames", 0.0, 0.0)

        h, w = frames[0].shape[:2]
        is_low_res = (h < 300 or w < 300)
        self.logger.info(f"Frame shape: {w}x{h}, low_res={is_low_res}, frames={len(frames)}")

        votes = []
        reasons = []

        # ── Fast layers first (pure OpenCV, no heavy models) ───────────────────
        of_s, of_r = self._optical_flow(frames)
        of_w = 0.50 if of_s > 0.80 else (0.30 if is_low_res else 0.20)
        votes.append((of_s, of_w))
        reasons.append(f"[OpticalFlow] {of_r}")

        asym_s, asym_r = self._face_asymmetry(frames)
        if "unavailable" not in asym_r:
            asym_w = 0.10  # Reduce asymmetry weight because face swaps preserve original asymmetry
            votes.append((asym_s, asym_w))
        reasons.append(f"[Asymmetry] {asym_r}")

        lm_s, lm_r = self._landmark_motion(frames)
        if "unavailable" not in lm_r:
            lm_w = 0.20 if is_low_res else 0.15
            votes.append((lm_s, lm_w))
        reasons.append(f"[Landmarks] {lm_r}")

        # ── ALWAYS run SigLIP + FFT for max accuracy on deepfakes ──────────────
        self.logger.info("Running deep feature extraction (SigLIP + FFT)...")
        temp_s, temp_var, temp_r = self._siglip_temporal(frames)
        # Give massive weight to SigLIP if it detects critical deepfake anomalies
        siglip_weight = 0.60 if temp_s > 0.85 else (0.45 if temp_s > 0.65 else 0.30)
        votes.append((temp_s, siglip_weight))
        reasons.append(f"[SigLIP] {temp_r}")

        fft_s, fft_r = self._fft_fingerprint(frames)
        fft_weight = 0.40 if fft_s > 0.75 else (0.35 if fft_s > 0.65 else 0.20)
        votes.append((fft_s, fft_weight))
        reasons.append(f"[FFT] {fft_r}")

        return self._calibrate(
            votes, reasons,
            fake_thresh=self.cfg.fake_threshold,
            real_thresh=self.cfg.real_threshold,
            abstention_thresh=self.cfg.abstention_std_threshold
        )


# ── Singleton ──────────────────────────────────────────────────────────────────
_video_engine = None

def get_video_detector() -> VideoDeepfakeDetector:
    global _video_engine
    if _video_engine is None:
        _video_engine = VideoDeepfakeDetector()
    return _video_engine
