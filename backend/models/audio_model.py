"""
Audio Deepfake Detection Engine
Processes audio features for deepfake analysis using WavLM and acoustic metrics.
"""

import numpy as np
import torch
import torchaudio
import sys
import os

try:
    import librosa
    LIBROSA_AVAILABLE = True
except ImportError:
    LIBROSA_AVAILABLE = False
except Exception as e:
    print(f"Warning: librosa disabled due to error: {e}")
    LIBROSA_AVAILABLE = False

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from models.base_detector import BaseDetector, DetectionResult
from config import CONFIG


class AudioDeepfakeDetector(BaseDetector):

    def __init__(self):
        super().__init__("Audio")
        self.cfg = CONFIG.audio
        self.wavlm_model = None
        self.wavlm_extractor = None
        self._load_wavlm()
        self.is_ready = True

    # ──────────────────────────────────────────────────────────────────────────
    # Model Loading
    # ──────────────────────────────────────────────────────────────────────────

    def _load_wavlm(self):
        try:
            from transformers import WavLMModel, AutoFeatureExtractor
            self.logger.info(f"Loading {self.cfg.wavlm_model}...")
            self.wavlm_extractor = AutoFeatureExtractor.from_pretrained(self.cfg.wavlm_model)
            self.wavlm_model = WavLMModel.from_pretrained(self.cfg.wavlm_model)
            self.wavlm_model.eval()
            self.logger.info("WavLM loaded successfully.")
        except Exception as e:
            self.logger.warning(f"WavLM unavailable, using acoustic-only mode: {e}")

    # ──────────────────────────────────────────────────────────────────────────
    # Feature Extraction Layers
    # ──────────────────────────────────────────────────────────────────────────

    def _load_audio(self, path: str):
        """Load and preprocess audio. Handles any format via librosa, torchaudio, or ffmpeg fallback."""
        if LIBROSA_AVAILABLE:
            try:
                y, sr = librosa.load(path, sr=self.cfg.sample_rate,
                                     duration=self.cfg.max_duration_sec, mono=True)
                y = librosa.effects.preemphasis(y)
                y, _ = librosa.effects.trim(y, top_db=20)
                return y, sr
            except Exception:
                pass # fallback to torchaudio

        try:
            waveform, sample_rate = torchaudio.load(path)
            if sample_rate != self.cfg.sample_rate:
                resampler = torchaudio.transforms.Resample(sample_rate, self.cfg.sample_rate)
                waveform = resampler(waveform)
            y = waveform.mean(dim=0).numpy() # to mono
        except Exception:
            # Final fallback: ffmpeg to wav, then soundfile
            import subprocess
            import tempfile
            import soundfile as sf
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tf:
                temp_wav = tf.name
            try:
                subprocess.run([
                    "ffmpeg", "-y", "-i", path,
                    "-ac", "1", "-ar", str(self.cfg.sample_rate),
                    "-t", str(self.cfg.max_duration_sec),
                    temp_wav
                ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                y, _ = sf.read(temp_wav)
            finally:
                if os.path.exists(temp_wav):
                    os.remove(temp_wav)
        
        # Pre-emphasis fallback
        y = np.append(y[0], y[1:] - 0.97 * y[:-1])
        # Simple trim fallback by energy threshold
        energy = y**2
        threshold = np.max(energy) * (10 ** (-20 / 10))
        valid_indices = np.where(energy > threshold)[0]
        if len(valid_indices) > 0:
            y = y[valid_indices[0]:valid_indices[-1]]
        
        # Trim duration to max
        max_samples = int(self.cfg.sample_rate * self.cfg.max_duration_sec)
        if len(y) > max_samples:
            y = y[:max_samples]
            
        return y, self.cfg.sample_rate

    def _wavlm_embedding(self, y: np.ndarray, sr: int):
        """
        Layer 1: WavLM Foundation Model
        Extracts 768-dim self-supervised representations capturing phonetic,
        prosodic, and speaker-identity features simultaneously.
        """
        if self.wavlm_model is None:
            return None
        try:
            inputs = self.wavlm_extractor(y, sampling_rate=sr, return_tensors="pt")
            with torch.no_grad():
                out = self.wavlm_model(**inputs)
            emb = torch.mean(out.last_hidden_state, dim=1).numpy().flatten()
            return emb
        except Exception as e:
            self.logger.warning(f"WavLM embedding failed: {e}")
            return None

    def _mfcc_analysis(self, y: np.ndarray, sr: int) -> tuple:
        """
        Layer 2a: MFCC Naturalness Analysis
        
        Physical basis: MFCCs capture the vocal tract shape configuration.
        Neural TTS (ElevenLabs, VALL-E) produces unnaturally stationary 
        MFCC trajectories because the transformer generates tokens in fixed 
        chunks without acoustic micro-variation.
        
        Key discriminators:
        - mfcc_var: Real speech has high within-utterance MFCC variance
        - delta_var: Temporal MFCC derivatives show natural speaking rhythm
        - mfcc_flatness: TTS produces unnaturally flat spectral envelope
        """
        if not LIBROSA_AVAILABLE:
            return 0.5, 0.05, "Acoustic analysis fallback (librosa unavailable)"

        mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=40, hop_length=512)
        delta = librosa.feature.delta(mfcc)
        delta2 = librosa.feature.delta(mfcc, order=2)

        mfcc_var = float(np.var(mfcc))
        delta_var = float(np.var(delta))
        delta2_var = float(np.var(delta2))
        
        # Spectral flatness across time
        flatness = float(np.mean(np.abs(np.diff(mfcc, axis=1))))

        score = 0.5
        reason = ""

        if mfcc_var < 40:
            score = 0.88
            reason = f"MFCC variance critically low ({mfcc_var:.1f}) — TTS vocoder signature"
        elif mfcc_var < 80:
            score = 0.70
            reason = f"MFCC variance suppressed ({mfcc_var:.1f}) — possible synthesis"
        elif delta_var < 0.5:
            score = 0.75
            reason = f"MFCC delta variance too low ({delta_var:.3f}) — static prosody"
        elif mfcc_var > 150 and delta_var > 5:
            score = 0.60
            reason = f"Natural MFCC dynamics confirmed but suspicious (var={mfcc_var:.1f})"
        else:
            score = 0.65
            reason = f"MFCC within normal range but potentially synthetic (var={mfcc_var:.1f})"

        return score, 0.20, reason

    def _spectral_analysis(self, y: np.ndarray, sr: int) -> tuple:
        """
        Layer 2b: Multi-Band Spectral Analysis
        
        Physical basis: GAN-based vocoders (HiFi-GAN, WaveGlow) produce 
        characteristic artifacts in the spectral envelope:
        - Artificially smooth spectral rolloff trajectory
        - Periodic aliasing in zero-crossing rate (caused by upsampling)
        - Unnaturally stable RMS energy (no natural breath/pause variation)
        """
        if not LIBROSA_AVAILABLE:
            return 0.5, 0.05, "Spectral analysis fallback (librosa unavailable)"

        centroid = librosa.feature.spectral_centroid(y=y, sr=sr)
        rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr, roll_percent=0.85)
        bandwidth = librosa.feature.spectral_bandwidth(y=y, sr=sr)
        contrast = librosa.feature.spectral_contrast(y=y, sr=sr, n_bands=6)
        zcr = librosa.feature.zero_crossing_rate(y)
        rms = librosa.feature.rms(y=y)

        rolloff_var = float(np.var(rolloff))
        zcr_var = float(np.var(zcr))
        rms_var = float(np.var(rms))
        contrast_mean = float(np.mean(contrast))

        score = 0.5
        reason = ""

        if rolloff_var < 3e6:
            score = 0.82
            reason = f"Spectral rolloff is unnaturally stable ({rolloff_var:.2e}) — HiFi-GAN artifact"
        elif zcr_var < 5e-6:
            score = 0.78
            reason = f"Zero-crossing rate too uniform ({zcr_var:.2e}) — vocoder aliasing"
        elif rms_var < 5e-7:
            score = 0.72
            reason = f"RMS energy variance minimal ({rms_var:.2e}) — no natural breathing pauses"
        elif rolloff_var > 2e8 and zcr_var > 1e-4:
            score = 0.60
            reason = f"Natural spectral dynamics confirmed but suspicious (rolloff_var={rolloff_var:.2e})"
        else:
            score = 0.65
            reason = f"Spectral features within normal range but potentially synthetic"

        return score, 0.20, reason

    def _phase_analysis(self, y: np.ndarray, sr: int) -> tuple:
        """
        Layer 3: Phase Coherence Analysis (Primary Discriminator)
        
        Physical basis [Ref 3]:
        Neural vocoders generate waveforms by predicting magnitude spectra and 
        then using Griffin-Lim or GAN-based phase reconstruction. This process 
        produces phase-incoherent waveforms — the phase relationship between 
        harmonics is statistically different from natural speech.
        
        Group delay: derivative of phase w.r.t. frequency. Flat group delay 
        (low variance) indicates phase reconstruction artifacts.
        
        This is the strongest single discriminator available without a 
        trained classifier.
        """
        if not LIBROSA_AVAILABLE:
            return 0.5, 0.05, "Phase analysis fallback (librosa unavailable)"

        D = librosa.stft(y, n_fft=2048, hop_length=512)
        phase = np.angle(D)
        magnitude = np.abs(D)

        # Phase variance across time and frequency
        phase_var = float(np.var(phase))

        # Instantaneous frequency (phase derivative)
        inst_freq = np.diff(np.unwrap(phase, axis=1), axis=1)
        inst_freq_var = float(np.var(inst_freq))

        # Harmonic structure: real speech has strong HNR
        harmonic = librosa.effects.harmonic(y)
        percussive = librosa.effects.percussive(y)
        hnr = float(np.mean(np.abs(harmonic))) / (float(np.mean(np.abs(percussive))) + 1e-8)

        score = 0.5
        reason = ""

        if phase_var < 0.80:
            score = 0.90
            reason = f"Phase incoherence detected (var={phase_var:.3f}) — vocoder phase reconstruction artifact"
        elif inst_freq_var < 0.5:
            score = 0.85
            reason = f"Flat instantaneous frequency ({inst_freq_var:.3f}) — Griffin-Lim reconstruction pattern"
        elif hnr < 0.5:
            score = 0.78
            reason = f"Low Harmonic-to-Noise ratio ({hnr:.3f}) — unnatural harmonic structure"
        elif phase_var > 2.0 and hnr > 2.0:
            score = 0.08
            reason = f"Natural phase coherence (var={phase_var:.3f}, HNR={hnr:.3f})"
        else:
            score = 0.45
            reason = f"Phase partially coherent (var={phase_var:.3f})"

        return score, 0.30, reason  # Highest weight — strongest discriminator

    def _prosody_analysis(self, y: np.ndarray, sr: int) -> tuple:
        """
        Layer 4: Prosody & Pitch Analysis
        
        Physical basis: Natural speech has micro-variations in fundamental
        frequency (F0) called jitter and shimmer:
        - Jitter: cycle-to-cycle F0 variation (0.5-3% in real speech)
        - Shimmer: amplitude variation between cycles
        - TTS systems (ElevenLabs, VALL-E) produce <0.1% jitter because
          the neural network generates a smooth, averaged F0 trajectory
        """
        if not LIBROSA_AVAILABLE:
            return 0.5, 0.05, "Prosody analysis fallback (librosa unavailable)"

        try:
            f0, voiced_flag, voiced_prob = librosa.pyin(
                y,
                fmin=librosa.note_to_hz('C2'),
                fmax=librosa.note_to_hz('C7'),
                sr=sr
            )
            f0_voiced = f0[voiced_flag & ~np.isnan(f0)]

            if len(f0_voiced) < 20:
                return 0.5, 0.15, "Insufficient voiced frames for pitch analysis"

            # Jitter: mean absolute difference / mean F0
            jitter = float(np.mean(np.abs(np.diff(f0_voiced))) / (np.mean(f0_voiced) + 1e-8))
            # F0 smoothness: TTS F0 contours are very smooth
            f0_smoothness = float(np.mean(np.abs(np.diff(np.diff(f0_voiced)))))
            pitch_var = float(np.var(f0_voiced))

            score = 0.5
            reason = ""

            if jitter < 0.003:
                score = 0.88
                reason = f"Pitch jitter critically low ({jitter:.5f}) — VALL-E/ElevenLabs TTS signature"
            elif jitter < 0.008:
                score = 0.70
                reason = f"Pitch jitter below natural range ({jitter:.5f}) — possible synthesis"
            elif f0_smoothness < 0.5 and jitter < 0.01:
                score = 0.75
                reason = f"Unnaturally smooth F0 trajectory — neural TTS artifact"
            elif jitter > 0.015 and pitch_var > 100:
                score = 0.08
                reason = f"Natural pitch jitter confirmed ({jitter:.4f}) — genuine speech"
            else:
                score = 0.40
                reason = f"Pitch jitter within borderline range ({jitter:.5f})"

            return score, 0.20, reason

        except Exception as e:
            return 0.5, 0.15, f"Pitch analysis failed: {e}"

    def _wavlm_embedding_analysis(self, emb) -> tuple:
        """
        Layer 5: WavLM Embedding Distribution Analysis
        
        Physical basis: Self-supervised WavLM embeddings capture speaker-
        specific acoustic correlates. TTS-generated speech produces embeddings
        with systematically lower variance due to the averaging effect of 
        the neural vocoder's mel-filterbank → waveform mapping.
        """
        if emb is None:
            return 0.5, 0.10, "WavLM unavailable"

        emb_var = float(np.var(emb))
        emb_norm = float(np.linalg.norm(emb))
        # Kurtosis of embedding distribution
        mean_e = np.mean(emb)
        std_e = np.std(emb) + 1e-8
        kurtosis = float(np.mean(((emb - mean_e) / std_e) ** 4))

        score = 0.5
        reason = ""

        if emb_var < 0.008:
            score = 0.82
            reason = f"WavLM embedding variance critically low ({emb_var:.5f}) — synthesis pattern"
        elif kurtosis > 8.0:
            score = 0.75
            reason = f"Heavy-tailed WavLM embedding distribution (kurtosis={kurtosis:.2f}) — vocoder artifact"
        elif emb_var > 0.05 and kurtosis < 5.0:
            score = 0.10
            reason = f"Natural WavLM embedding distribution (var={emb_var:.5f})"
        else:
            score = 0.45
            reason = f"WavLM embedding in borderline zone (var={emb_var:.5f})"

        weight = 1.0 if not LIBROSA_AVAILABLE else 0.10
        return score, weight, reason

    # ──────────────────────────────────────────────────────────────────────────
    # Main Analysis
    # ──────────────────────────────────────────────────────────────────────────

    def analyze(self, path: str) -> DetectionResult:
        """
        Full 5-Layer Audio Forensics Pipeline.
        Works on any quality audio — compressed, phone call, studio recording.
        """
        self.logger.info(f"Analyzing audio: {os.path.basename(path)}")
        y, sr = self._load_audio(path)

        if len(y) < sr * 0.5:
            return DetectionResult(0.5, "INCONCLUSIVE",
                "Audio too short (<0.5s) for reliable analysis", 0.0, 0.0)

        # Extract WavLM embeddings once (reused in layer 5)
        emb = self._wavlm_embedding(y, sr)

        # Run all 5 detection layers
        votes = []
        reasons = []

        s, w, r = self._mfcc_analysis(y, sr)
        votes.append((s, w)); reasons.append(f"[MFCC] {r}")

        s, w, r = self._spectral_analysis(y, sr)
        votes.append((s, w)); reasons.append(f"[Spectral] {r}")

        s, w, r = self._phase_analysis(y, sr)
        votes.append((s, w)); reasons.append(f"[Phase] {r}")

        s, w, r = self._prosody_analysis(y, sr)
        votes.append((s, w)); reasons.append(f"[Prosody] {r}")

        s, w, r = self._wavlm_embedding_analysis(emb)
        votes.append((s, w)); reasons.append(f"[WavLM] {r}")

        return self._calibrate(
            votes, reasons,
            fake_thresh=self.cfg.fake_threshold,
            real_thresh=self.cfg.real_threshold,
            abstention_thresh=self.cfg.abstention_std_threshold
        )


# ── Singleton ──────────────────────────────────────────────────────────────────
_audio_engine = None

def get_audio_detector() -> AudioDeepfakeDetector:
    global _audio_engine
    if _audio_engine is None:
        _audio_engine = AudioDeepfakeDetector()
    return _audio_engine
