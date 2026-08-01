import asyncio
import os
import json
from typing import Any, Optional

import aiohttp
from loguru import logger

from cache import cache

BASE_URL = os.getenv("UPSTREAM_BASE_URL", "").strip().rstrip("/")
if not BASE_URL:
    BASE_URL = ""


def build_headers(token: str, accept: str = "application/json") -> dict[str, str]:
    return {
        "Authorization": f"Bearer {token}",
        "accept": accept,
        "content-type": "application/json",
    }


async def fetch(
    url: str,
    token: str,
    data: Optional[dict[str, Any]] = None,
    method: str = "POST",
    accept: str = "application/json",
    params: Optional[dict[str, Any]] = None,
):
    if not BASE_URL:
        raise RuntimeError("UPSTREAM_BASE_URL is not configured")
    headers = build_headers(token, accept=accept)
    payload = json.dumps(data) if data is not None else None

    async with aiohttp.ClientSession() as session:
        async with session.request(
            method=method,
            url=url,
            data=payload,
            headers=headers,
            params=params,
        ) as resp:
            if accept == "application/x-ndjson":
                text = await resp.text()
                if resp.status >= 400:
                    raise Exception(text)
                return text

            try:
                body = await resp.json()
            except aiohttp.ContentTypeError:
                body = await resp.text()

            if resp.status >= 400:
                raise Exception(body)

            return body


async def generate_audio(data: dict[str, Any], token: str, accept: str = "application/json"):
    return await fetch(
        f"{BASE_URL}/audios",
        token=token,
        data=data,
        method="POST",
        accept=accept,
    )


async def get_feed(task_id: str, token: str):
    payload = {"action": "retrieve", "id": task_id}
    logger.info(f"Fetching feed for task id: {task_id}")
    response = await fetch(
        f"{BASE_URL}/tasks",
        token=token,
        data=payload,
        method="POST",
    )
    logger.info(f"Feed fetched: {response}")
    return response


async def get_feed_by_clip_id(clip_id: str, token: str):
    task_id = cache.get(clip_id)
    if task_id:
        return await get_feed(task_id, token)
    return {"detail": "Task not found for clip id"}


async def generate_music_with_lyrics(data: dict[str, Any], token: str):
    payload = {
        "action": "extend" if data.get("continue_clip_id") else "generate",
        "model": data.get("mv", "chirp-v5"),
        "lyric": data["prompt"],
        "title": data["title"],
        "style": data["tags"],
        "custom": True,
        "continue_at": data.get("continue_at"),
        "audio_id": data.get("continue_clip_id"),
    }
    payload = {key: value for key, value in payload.items() if value is not None}
    response = await generate_audio(payload, token)
    return await get_clip_id(response, token)


async def generate_music_with_prompt(data: dict[str, Any], token: str):
    payload = {
        "action": "generate",
        "model": data.get("mv", "chirp-v5"),
        "prompt": data["gpt_description_prompt"],
        "custom": False,
        "instrumental": data.get("make_instrumental", False),
    }
    response = await generate_audio(payload, token)
    return await get_clip_id(response, token)


async def concat_music(data: dict[str, Any], token: str):
    payload = {
        "action": "concat",
        "audio_id": data["clip_id"],
    }
    return await generate_audio(payload, token)


async def generate_lyrics(prompt: str, token: str, model: str = "default"):
    response = await fetch(
        f"{BASE_URL}/lyrics",
        token=token,
        data={"prompt": prompt, "model": model},
        method="POST",
    )
    if response.get("success"):
        cache.set(response.get("task_id"), response.get("data"), 60)
    return response


async def get_lyrics(lid: str, token: str):
    lyrics = cache.get(lid)
    if lyrics:
        return lyrics
    return {"detail": "Lyrics not found"}


async def create_persona(data: dict[str, Any], token: str):
    return await fetch(
        f"{BASE_URL}/persona",
        token=token,
        data=data,
        method="POST",
    )


async def list_personas(user_id: str, token: str, limit: int = 50, offset: int = 0):
    return await fetch(
        f"{BASE_URL}/persona",
        token=token,
        method="GET",
        params={"user_id": user_id, "limit": limit, "offset": offset},
    )


async def delete_persona(persona_id: str, user_id: str, token: str):
    return await fetch(
        f"{BASE_URL}/persona",
        token=token,
        method="DELETE",
        params={"persona_id": persona_id, "user_id": user_id},
    )


async def get_clip_id(response: dict[str, Any], token: str):
    if response.get("task_id"):
        for _ in range(60):
            feed = await get_feed(response["task_id"], token)
            items = feed.get("data") or feed.get("response", {}).get("data") or []
            clips = []
            for clip in items:
                if clip.get("id"):
                    clips.append({"id": clip["id"]})
                    cache.set(clip["id"], response["task_id"], 600)
            if clips:
                return {"id": response["task_id"], "clips": clips, "raw": response}
            await asyncio.sleep(1)
    return response
