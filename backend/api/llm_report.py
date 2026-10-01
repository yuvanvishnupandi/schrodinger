"""
SCHRÖDINGER: LLM Forensic Report Generator v2.0
-------------------------------------------------
Multi-Fallback LLM Chain: Groq → Gemini → OpenAI → Mistral
Connects to Large Language Models to generate human-readable,
court-admissible forensic summary reports based on the raw
numerical outputs of the deep learning layers.

If one provider fails, it automatically falls through to the next.
"""

import os
import requests
import json
import logging
from config import CONFIG

logger = logging.getLogger("SCHRÖDINGER.LLMReport")


class ForensicReportGenerator:
    def __init__(self):
        self.api_keys = {
            "groq": os.getenv("GROQ_API_KEY", CONFIG.llm.groq_key),
            "gemini": os.getenv("GEMINI_API_KEY", CONFIG.llm.gemini_key),
            "openai": os.getenv("OPENAI_API_KEY", CONFIG.llm.openai_key),
            "mistral": os.getenv("MISTRAL_API_KEY", ""),
        }
        # Priority order for fallback chain
        self.fallback_order = [
            ("mistral", "mistral-large-latest"),
            ("mistral", "pixtral-12b-2409"),
            ("mistral", "mistral-small-latest"),
            ("gemini", "gemini-1.5-pro-latest"),
            ("gemini", "gemini-1.5-flash-latest"),
            ("openai", "gpt-4o-mini"),
            ("groq", "llama3-70b-8192")
        ]
        available_providers = set(p for p, m in self.fallback_order if self.api_keys.get(p))
        logger.info(f"LLM Providers available: {list(available_providers) or ['NONE']}")

    def generate_report(self, analysis_result: dict, file_path: str = None) -> str:
        """
        Generates a professional summary with multi-fallback.
        Tries each provider in order: Mistral → Gemini → OpenAI → Groq.
        """
        available_models = [(p, m) for p, m in self.fallback_order if self.api_keys.get(p)]
        if not available_models:
            return "No LLM API keys configured. LLM Forensic Summary disabled."

        prompt = self._build_prompt(analysis_result)

        for provider, model_name in available_models:
            try:
                logger.info(f"Trying LLM provider: {provider} ({model_name})")
                if provider == "gemini":
                    result = self._call_gemini(prompt, file_path, model_name)
                else:
                    result = self._call_provider(provider, prompt, model_name)
                if result and not result.startswith("Error"):
                    logger.info(f"LLM report generated via {provider} ({model_name})")
                    return result
                else:
                    logger.warning(f"{provider} ({model_name}) returned error: API Limit / Unavailable")
            except Exception as e:
                logger.warning(f"{provider} ({model_name}) failed: API Limit / Unavailable")
                continue

        return "All LLM providers failed. Raw analysis data is available above."

    def _build_prompt(self, analysis_result: dict) -> str:
        media_type = analysis_result.get('media_type', 'unknown')
        
        if media_type == 'audio':
            telemetry_instructions = """
Your job is to VERIFY the engine's verdict by cross-examining audio and intent telemetry.

CRITICAL DIRECTIVES:
1. If the Audio Telemetry indicates synthetic generation, you MUST classify it as a FAKE.
2. If the Intent Analysis shows strong adversarial/coercive patterns (e.g., voice cloning scams), you MUST classify it as FAKE.
3. If the analysis threw an ERROR (e.g. library missing), classify it as ERROR and simply explain that the system could not complete the scan. DO NOT invent false narratives about impersonation.
"""
        elif media_type == 'image':
            telemetry_instructions = """
Your job is to VERIFY the engine's verdict by analyzing visual telemetry.

CRITICAL DIRECTIVES:
1. If the Visual Telemetry strongly indicates synthetic generation (GAN artifacts, noise anomalies), you MUST classify it as a FAKE.
2. If the analysis threw an ERROR, classify it as ERROR and explain the system failure.
"""
        else:
            telemetry_instructions = """
Your job is to VERIFY the engine's verdict by cross-examining visual and audio telemetry. 

CRITICAL DIRECTIVES:
1. If the Visual Telemetry (e.g., SigLIP, FFT, Optical Flow) strongly indicates synthetic generation (e.g., GAN artifacts, temporal freezing, inconsistent coherence), you MUST classify it as a FAKE, regardless of how normal or conversational the audio transcript is. (High-quality deepfakes often use normal speech to bypass intent detectors).
2. If the Visual Telemetry is completely clean, but the Intent Analysis shows strong adversarial/coercive patterns (e.g., voice cloning scams), you MUST classify it as FAKE.
3. If the analysis threw an ERROR (e.g. library missing or unavailable), it is a system technical failure, NOT proof of a deepfake. DO NOT claim that missing libraries (like MediaPipe unavailable) mean the media is manipulated.
4. If the visual coherence is slightly low, keep in mind this might just be a YouTube Short with fast camera cuts, not necessarily a deepfake. Do not declare FAKE unless there is definitive synthetic evidence.
5. Only override a FAKE verdict to REAL if BOTH Visual and Audio telemetry are definitively natural and the initial score was a borderline false positive.
"""

        return f"""You are the Schrödinger Deep Forensics AI.
Analyze the following media data and provide a detailed, highly accurate, and professional executive summary. 
{telemetry_instructions}
4. You MUST start your response with EXACTLY one of these two phrases:
[VERDICT: REAL]
[VERDICT: FAKE]

Followed by your 1-2 paragraph professional executive summary. Maintain a cold, authoritative, cybersecurity expert tone. DO NOT use bullet points. Write in clean, highly professional prose.

[EVIDENCE LOG]
File: {analysis_result.get('filename')}
Media Type: {analysis_result.get('media_type')}
Verdict: {analysis_result.get('verdict')}
Synthetic Score: {analysis_result.get('synthetic_score')}%
Fraud Risk: {analysis_result.get('fraud_risk')}%
Confidence: {analysis_result.get('confidence')}%

[DEEP LEARNING LAYER OUTPUTS]
Vision Layer: {analysis_result.get('details', {}).get('vision')}
Audio/Intent Layer: {analysis_result.get('details', {}).get('intent')}

[TRANSCRIPT (if available)]
{analysis_result.get('transcript', 'N/A')}
"""

    def _call_provider(self, provider: str, prompt: str, model_name: str) -> str:
        dispatch = {
            "groq": self._call_groq,
            "openai": self._call_openai,
            "mistral": self._call_mistral,
        }
        return dispatch[provider](prompt, model_name)

    def _call_groq(self, prompt: str, model_name: str) -> str:
        headers = {
            "Authorization": f"Bearer {self.api_keys['groq']}",
            "Content-Type": "application/json"
        }
        data = {
            "model": model_name,
            "messages": [{"role": "system", "content": prompt}],
            "temperature": 0.1,
            "max_tokens": 300,
        }
        resp = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers, json=data, timeout=15
        )
        if resp.status_code == 200:
            return resp.json()["choices"][0]["message"]["content"]
        raise Exception(f"Groq HTTP {resp.status_code}: {resp.text[:200]}")

    def _call_gemini(self, prompt: str, file_path: str = None, model_name: str = "gemini-1.5-pro-latest") -> str:
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{model_name}:generateContent?key={self.api_keys['gemini']}"
        )
        
        parts = [{"text": prompt}]
        
        # Add visual verification using Gemini 1.5 Flash Vision capabilities!
        if file_path and os.path.exists(file_path):
            try:
                import cv2
                import base64
                
                # Check if it's a video
                if file_path.lower().endswith(('.mp4', '.avi', '.mov', '.webm', '.mkv')):
                    cap = cv2.VideoCapture(file_path)
                    frames_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                    if frames_count > 0:
                        cap.set(cv2.CAP_PROP_POS_FRAMES, max(0, frames_count // 2))
                        ret, frame = cap.read()
                        if ret:
                            # Resize for API limits
                            frame = cv2.resize(frame, (640, 480))
                            _, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
                            b64_img = base64.b64encode(buffer).decode('utf-8')
                            parts.append({
                                "inline_data": {
                                    "mime_type": "image/jpeg",
                                    "data": b64_img
                                }
                            })
                            logger.info("Attached video middle-frame to Gemini Vision prompt for Agentic Verification.")
                    cap.release()
                elif file_path.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
                    img = cv2.imread(file_path)
                    if img is not None:
                        img = cv2.resize(img, (640, 480))
                        _, buffer = cv2.imencode('.jpg', img, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
                        b64_img = base64.b64encode(buffer).decode('utf-8')
                        parts.append({
                            "inline_data": {
                                "mime_type": "image/jpeg",
                                "data": b64_img
                            }
                        })
                        logger.info("Attached image to Gemini Vision prompt for Agentic Verification.")
            except Exception as e:
                logger.warning(f"Failed to attach image to Gemini: {e}")

        data = {"contents": [{"parts": parts}]}
        resp = requests.post(url, json=data, timeout=25)
        if resp.status_code == 200:
            return resp.json()["candidates"][0]["content"]["parts"][0]["text"]
        raise Exception(f"Gemini HTTP {resp.status_code}: {resp.text[:200]}")

    def _call_openai(self, prompt: str, model_name: str) -> str:
        headers = {
            "Authorization": f"Bearer {self.api_keys['openai']}",
            "Content-Type": "application/json"
        }
        data = {
            "model": model_name,
            "messages": [{"role": "system", "content": prompt}],
            "temperature": 0.1,
            "max_tokens": 300,
        }
        resp = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers, json=data, timeout=20
        )
        if resp.status_code == 200:
            return resp.json()["choices"][0]["message"]["content"]
        raise Exception(f"OpenAI HTTP {resp.status_code}: {resp.text[:200]}")

    def _call_mistral(self, prompt: str, model_name: str) -> str:
        headers = {
            "Authorization": f"Bearer {self.api_keys['mistral']}",
            "Content-Type": "application/json"
        }
        data = {
            "model": model_name,
            "messages": [{"role": "system", "content": prompt}],
            "temperature": 0.1,
            "max_tokens": 300,
        }
        resp = requests.post(
            "https://api.mistral.ai/v1/chat/completions",
            headers=headers, json=data, timeout=15
        )
        if resp.status_code == 200:
            return resp.json()["choices"][0]["message"]["content"]
        raise Exception(f"Mistral HTTP {resp.status_code}: {resp.text[:200]}")


# Singleton
_llm_reporter = None

def get_llm_reporter() -> ForensicReportGenerator:
    global _llm_reporter
    if _llm_reporter is None:
        _llm_reporter = ForensicReportGenerator()
    return _llm_reporter
