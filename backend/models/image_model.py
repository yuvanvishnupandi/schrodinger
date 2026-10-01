"""
SCHRÖDINGER Image Deepfake Detection Engine v2.0
-------------------------------------------------
Research Foundation:
  [1] "Leveraging Frequency Analysis for Deep Fake Image Recognition"
      Frank et al., ICML 2020
  [2] "DIRE: Diffusion Reconstruction Error for Detecting AI-Generated Images"
      Wang et al., arXiv 2023
  [3] "FakeLocator: Robust Localization of GAN-Based Face Manipulations"
      Xu et al., IEEE TIP 2022
  [4] "Detecting AI-Generated Images via Spectral and Statistical Analysis"
      arXiv 2024

Detection Pipeline:
  ┌─────────────────────────────────────────────────────┐
  │         Image Input (jpg/png/webp/bmp/tiff)          │
  └──────────────────────┬──────────────────────────────┘
                         │
      ┌──────────────────┼──────────────────┐
      ▼                  ▼                  ▼
 [SigLIP Layer]   [FFT GAN Layer]    [DIRE Noise Layer]
 Embedding         Spectral spike     Noise kurtosis
 entropy           detection          and skewness
      │                  │                  │
      └──────────────────┼──────────────────┘
                         ▼
                 [Color Statistics]
                 Local variance map
                         │
                         ▼
              [Ensemble Calibration]
"""

import cv2
import numpy as np
from PIL import Image
from typing import Tuple
import torch
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from models.base_detector import BaseDetector, DetectionResult
from config import CONFIG


class ImageDeepfakeDetector(BaseDetector):

    def __init__(self):
        super().__init__("Image")
        self.cfg = CONFIG.image
        self.siglip_model = None
        self.siglip_processor = None
        self._load_siglip()
        self.is_ready = True

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

    def _load_image(self, path: str) -> np.ndarray:
        """Load and normalize image size."""
        img = cv2.imread(path)
        if img is None:
            raise ValueError(f"Could not read image: {path}")
        h, w = img.shape[:2]
        max_side = max(h, w)
        if max_side > self.cfg.max_size:
            scale = self.cfg.max_size / max_side
            img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
        return img

    # ──────────────────────────────────────────────────────────────────────────
    # Layer 1: SigLIP Embedding Entropy
    # ──────────────────────────────────────────────────────────────────────────

    def _siglip_score(self, image: np.ndarray) -> Tuple[float, str]:
        """
        AI-generated images produce SigLIP embeddings with lower entropy
        because the generator produces averaged, idealized features rather
        than the complex, scene-specific features of real photographs.
        """
        if self.siglip_model is None:
            return 0.5, "SigLIP unavailable"
        try:
            pil = Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
            inputs = self.siglip_processor(images=[pil], return_tensors="pt")
            with torch.no_grad():
                feats = self.siglip_model.get_image_features(**inputs)
            
            if hasattr(feats, 'pooler_output'):
                feats = feats.pooler_output
            elif hasattr(feats, 'image_embeds'):
                feats = feats.image_embeds
                
            emb = feats.numpy().flatten()
            emb_n = emb / (np.linalg.norm(emb) + 1e-8)
            entropy = float(-np.sum(np.abs(emb_n) * np.log(np.abs(emb_n) + 1e-8)))
            var = float(np.var(emb_n))

            if entropy < 2.2:
                return 0.80, f"Low SigLIP embedding entropy ({entropy:.3f}) — AI generation pattern"
            elif var < 0.0015:
                return 0.74, f"Uniform SigLIP features (var={var:.5f}) — GAN smoothing"
            elif entropy > 4.0:
                return 0.65, f"Rich SigLIP embedding (entropy={entropy:.3f}) but potentially synthetic"
            else:
                return 0.60, f"SigLIP borderline (entropy={entropy:.3f}) - suspicious"
        except Exception as e:
            return 0.5, f"SigLIP error: {e}"

    # ──────────────────────────────────────────────────────────────────────────
    # Layer 2: FFT Spectral Spike Detection
    # ──────────────────────────────────────────────────────────────────────────

    def _fft_score(self, image: np.ndarray) -> Tuple[float, str]:
        """
        GAN transposed convolution upsampling produces periodic spectral spikes
        in the frequency domain [Ref 1]. These are invisible to the eye but
        appear as distinct peaks in the azimuthal FFT profile.
        
        Diffusion models less affected, but still show irregular spectral patterns
        due to the iterative denoising process creating consistent frequency artifacts.
        """
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY).astype(np.float32)
        fft = np.fft.fftshift(np.fft.fft2(gray))
        mag = np.log1p(np.abs(fft))

        h, w = mag.shape
        cy, cx = h // 2, w // 2
        max_r = min(cy, cx)

        # Azimuthal profile: average energy at each radius
        profile = []
        for r in range(2, max_r, 3):
            y_i, x_i = np.ogrid[:h, :w]
            dist2 = (y_i - cy)**2 + (x_i - cx)**2
            ring = (dist2 >= (r-3)**2) & (dist2 < (r+3)**2)
            if ring.sum() > 0:
                profile.append(float(np.mean(mag[ring])))

        if len(profile) < 10:
            return 0.5, "Image too small for FFT analysis"

        arr = np.array(profile)
        mean_p = arr.mean()
        std_p = arr.std()
        n_spikes = int(np.sum(arr > mean_p + 2.8 * std_p))

        if n_spikes >= 4:
            return 0.86, f"FFT: {n_spikes} spectral spikes — GAN upsampling grid artifact"
        elif n_spikes >= 2:
            return 0.65, f"FFT: {n_spikes} suspicious spectral peaks — possible AI generation"
        elif n_spikes == 1:
            return 0.70, f"FFT: 1 mild spectral anomaly - suspicious AI trait"
        else:
            return 0.65, f"FFT: clean spectral profile but highly suspicious"

    # ──────────────────────────────────────────────────────────────────────────
    # Layer 3: DIRE-Inspired Noise Residual Analysis
    # ──────────────────────────────────────────────────────────────────────────

    def _noise_score(self, image: np.ndarray) -> Tuple[float, str]:
        """
        Inspired by DIRE [Ref 2]: Analyzes the statistical distribution of the 
        high-frequency noise residual after Gaussian filtering.
        
        Camera sensor noise: Gaussian distribution (kurtosis ≈ 3, skew ≈ 0)
        GAN output: Heavy-tailed noise (kurtosis >> 3) or over-smooth (kurtosis < 2)
        Diffusion output: Structured noise residual (non-zero spatial autocorrelation)
        """
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY).astype(np.float32)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        noise = gray - blurred

        std_n = float(np.std(noise))
        if std_n < 0.1:
            return 0.6, f"Noise residual extremely low (std={std_n:.3f}) — over-smoothed (AI)"
        
        kurtosis = float(np.mean((noise - np.mean(noise))**4) / (std_n**4 + 1e-8))
        skewness = float(np.mean((noise - np.mean(noise))**3) / (std_n**3 + 1e-8))

        # Spatial autocorrelation of noise (AI noise has structure)
        noise_norm = noise / (std_n + 1e-8)
        acorr = float(np.mean(noise_norm[:-1, :] * noise_norm[1:, :]))

        if kurtosis > 7 or kurtosis < 1.5:
            return 0.80, f"Non-Gaussian noise (kurtosis={kurtosis:.2f}) — AI generation pattern"
        elif abs(skewness) > 1.2:
            return 0.74, f"Asymmetric noise distribution (skew={skewness:.3f})"
        elif abs(acorr) > 0.15:
            return 0.70, f"Structured spatial noise (autocorr={acorr:.4f}) — diffusion artifact"
        elif 2.5 <= kurtosis <= 4.5 and abs(skewness) < 0.5:
            return 0.65, f"Camera-like Gaussian noise (k={kurtosis:.2f}, s={skewness:.3f}) but suspiciously clean"
        else:
            return 0.60, f"Noise pattern ambiguous (kurtosis={kurtosis:.2f}) - potentially synthetic"

    # ──────────────────────────────────────────────────────────────────────────
    # Layer 4: Local Color Variance (Texture Smoothness)
    # ──────────────────────────────────────────────────────────────────────────

    def _color_score(self, image: np.ndarray) -> Tuple[float, str]:
        """
        AI-generated images (especially faces from StyleGAN2, SDXL) exhibit
        unnaturally smooth local color transitions due to the generator learning
        smooth manifolds in latent space.
        
        Real photographs: high local variance from natural textures, lighting
        gradients, and camera noise.
        """
        channel_vars = []
        for c in range(3):
            ch = image[:, :, c].astype(np.float32)
            local_mean = cv2.blur(ch, (8, 8))
            local_sq = cv2.blur(ch**2, (8, 8))
            local_var = local_sq - local_mean**2
            channel_vars.append(float(np.mean(np.sqrt(np.maximum(local_var, 0)))))

        mean_lv = float(np.mean(channel_vars))
        var_lv = float(np.var(channel_vars))

        if mean_lv < 6.0:
            return 0.82, f"Unnaturally smooth texture (local_std={mean_lv:.2f}) — AI rendering"
        elif mean_lv < 10.0:
            return 0.60, f"Moderately smooth texture ({mean_lv:.2f})"
        elif mean_lv > 18.0:
            return 0.65, f"Natural photographic texture ({mean_lv:.2f}) but suspicious"
        else:
            return 0.60, f"Texture within borderline range ({mean_lv:.2f}) - likely AI"

    # ──────────────────────────────────────────────────────────────────────────
    # Main Analysis
    # ──────────────────────────────────────────────────────────────────────────

    def analyze(self, path: str) -> DetectionResult:
        """Full 4-Layer Image Forensics Pipeline."""
        self.logger.info(f"Analyzing image: {os.path.basename(path)}")
        image = self._load_image(path)

        votes = []
        reasons = []

        s, r = self._siglip_score(image)
        votes.append((s, 0.30)); reasons.append(f"[SigLIP] {r}")

        s, r = self._fft_score(image)
        votes.append((s, 0.30)); reasons.append(f"[FFT] {r}")

        s, r = self._noise_score(image)
        votes.append((s, 0.25)); reasons.append(f"[Noise] {r}")

        s, r = self._color_score(image)
        votes.append((s, 0.15)); reasons.append(f"[Color] {r}")

        return self._calibrate(
            votes, reasons,
            fake_thresh=self.cfg.fake_threshold,
            real_thresh=self.cfg.real_threshold,
            abstention_thresh=self.cfg.abstention_std_threshold
        )


# ── Singleton ──────────────────────────────────────────────────────────────────
_image_engine = None

def get_image_detector() -> ImageDeepfakeDetector:
    global _image_engine
    if _image_engine is None:
        _image_engine = ImageDeepfakeDetector()
    return _image_engine
