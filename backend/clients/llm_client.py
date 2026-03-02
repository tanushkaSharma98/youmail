"""
LLM client. Uses Hugging Face router (router.huggingface.co) Inference Providers API.
Single method returning raw JSON dict. No assistant or mail logic. API errors converted to LLMError.
"""
from __future__ import annotations

import json
import logging
import re
from typing import Any

import httpx

from core.exceptions import LLMError

logger = logging.getLogger(__name__)

DEFAULT_TIMEOUT_SEC = 60.0
# New Inference Providers API (api-inference.huggingface.co is deprecated, returns 410)
HF_ROUTER_URL = "https://router.huggingface.co/v1/responses"


class LLMClient:
    """
    Calls Hugging Face router (Inference Providers) with a prompt; returns parsed JSON as dict.
    Constructor injection: token and model_id required; timeout optional.
    """

    def __init__(
        self,
        token: str,
        *,
        model_id: str = "meta-llama/Llama-3.2-3B-Instruct",
        timeout_sec: float = DEFAULT_TIMEOUT_SEC,
    ) -> None:
        self._token = token
        self._model_id = model_id
        self._timeout_sec = timeout_sec

    def generate_structured_action(self, prompt: str) -> dict[str, Any]:
        """
        Send prompt to HF router; expect a single JSON object in the generated text.
        Returns that object as a dict. Raises LLMError on API failure or timeout.
        """
        headers = {
            "Authorization": f"Bearer {self._token}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self._model_id,
            "instructions": "Return only a single JSON object. No markdown, no explanation.",
            "input": prompt,
        }
        try:
            with httpx.Client(timeout=self._timeout_sec) as client:
                response = client.post(HF_ROUTER_URL, headers=headers, json=payload)
        except httpx.TimeoutException as e:
            raise LLMError("Hugging Face API timeout", cause=e) from e
        except httpx.HTTPError as e:
            logger.warning("HF API request failed: %s", e)
            raise LLMError("Hugging Face API request failed", cause=e) from e

        if response.status_code == 401:
            raise LLMError(
                "Invalid Hugging Face token. Check HF_API_TOKEN at huggingface.co/settings/tokens"
            )
        if response.status_code == 403:
            _raise_inference_providers_permission_error(response.text)
        if response.status_code == 429:
            raise LLMError(
                "Hugging Face rate limit. Wait a minute or check model availability."
            )
        if response.status_code >= 400:
            raise LLMError(
                f"Hugging Face API error: {response.status_code} - {response.text[:300]}"
            )

        try:
            data = response.json()
        except json.JSONDecodeError as e:
            raise LLMError("Hugging Face returned non-JSON response", cause=e) from e

        err = isinstance(data, dict) and data.get("error")
        if err:
            err_str = str(err)
            if "Inference Providers" in err_str and ("permission" in err_str.lower() or "403" in err_str):
                _raise_inference_providers_permission_error(err_str)
            raise LLMError(f"Hugging Face error: {err}")

        content = ""
        if isinstance(data, dict):
            raw = data.get("output_text") or data.get("output")
            if isinstance(raw, str):
                content = raw.strip()
            elif isinstance(raw, list):
                for item in raw:
                    if isinstance(item, dict) and item.get("type") == "message":
                        content = _message_content_to_string(item.get("content"))
                        break
        if not content:
            content = str(data).strip()

        if not content:
            raise LLMError("Hugging Face returned empty generated text")

        content = _extract_json_string(content)
        try:
            return json.loads(content)
        except json.JSONDecodeError as e:
            raise LLMError("Model output is not valid JSON", cause=e) from e


HF_INFERENCE_PROVIDERS_TOKEN_URL = (
    "https://huggingface.co/settings/tokens/new?ownUserPermissions=inference.serverless.write&tokenType=fineGrained"
)


def _raise_inference_providers_permission_error(response_text: str = "") -> None:
    raise LLMError(
        "Your Hugging Face token does not have permission to call Inference Providers. "
        "Create a new token with 'Make calls to Inference Providers' enabled: "
        f"{HF_INFERENCE_PROVIDERS_TOKEN_URL} "
        "Then set HF_API_TOKEN in your .env to that token."
    )


def _message_content_to_string(content: Any) -> str:
    """Normalize message content to a string; content may be str or list of parts (e.g. output_text)."""
    if content is None:
        return ""
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts = []
        for part in content:
            if isinstance(part, str):
                parts.append(part)
            elif isinstance(part, dict):
                text = part.get("text") or part.get("content")
                if isinstance(text, str):
                    parts.append(text)
        return " ".join(parts).strip()
    return str(content).strip()


def _extract_json_string(text: str) -> str:
    """Extract first JSON object {...} from text; strip markdown code blocks."""
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```\w*\n?", "", text)
        text = re.sub(r"\n?```\s*$", "", text)
    if "{" in text and "}" in text:
        start = text.index("{")
        end = text.rindex("}") + 1
        return text[start:end]
    return text
