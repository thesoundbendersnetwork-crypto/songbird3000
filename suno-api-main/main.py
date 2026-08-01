from copy import deepcopy

from fastapi import Depends, FastAPI, Header, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.openapi.utils import get_openapi
from fastapi.responses import HTMLResponse, JSONResponse

import schemas
from deps import get_token
from utils import (
    create_persona,
    delete_persona,
    generate_audio,
    generate_lyrics,
    generate_music_with_prompt,
    generate_music_with_lyrics,
    get_feed_by_clip_id,
    get_lyrics,
    list_personas,
    concat_music,
)


OPENAPI_I18N = {
    "paths": {
        "/": {
            "get": {
                "summary": {"zh": "服务状态", "en": "Service status"},
                "description": {
                    "zh": "返回统一成功响应，用于检查服务是否正常运行。",
                    "en": "Returns a standard success response to confirm the service is running.",
                },
            }
        },
        "/generate": {
            "post": {
                "summary": {"zh": "兼容：自定义模式生成音乐", "en": "Compatibility: generate music in custom mode"},
                "description": {
                    "zh": "兼容旧版调用，内部转发到 /audios。",
                    "en": "Backwards-compatible route that forwards to /audios.",
                },
            }
        },
        "/generate/description-mode": {
            "post": {
                "summary": {"zh": "兼容：描述模式生成音乐", "en": "Compatibility: generate music from description"},
                "description": {
                    "zh": "兼容旧版调用，内部转发到 /audios。",
                    "en": "Backwards-compatible route that forwards to /audios.",
                },
            }
        },
        "/audios": {
            "post": {
                "summary": {"zh": "生成歌曲或执行音频相关动作", "en": "Generate songs or execute audio actions"},
                "description": {
                    "zh": "对齐最新 /audios 接口，支持 generate、extend、cover、persona 等动作，并支持 NDJSON 流式响应。",
                    "en": "Mirrors the latest /audios API with generate, extend, cover, persona-related actions, and optional NDJSON streaming.",
                },
            }
        },
        "/feed/{aid}": {
            "get": {
                "summary": {"zh": "查询任务结果", "en": "Fetch task result"},
                "description": {
                    "zh": "根据已缓存的 clip ID 查询对应任务结果。",
                    "en": "Fetches the task result associated with a cached clip ID.",
                },
            }
        },
        "/lyrics": {
            "post": {
                "summary": {"zh": "生成歌词", "en": "Generate lyrics"},
                "description": {
                    "zh": "对齐最新 /lyrics 接口。",
                    "en": "Mirrors the latest /lyrics API.",
                },
            }
        },
        "/generate/lyrics/": {
            "post": {
                "summary": {"zh": "兼容：生成歌词", "en": "Compatibility: generate lyrics"},
                "description": {
                    "zh": "兼容旧版调用，内部转发到 /lyrics。",
                    "en": "Backwards-compatible route that forwards to /lyrics.",
                },
            }
        },
        "/persona": {
            "get": {
                "summary": {"zh": "查询 persona 列表", "en": "List personas"},
                "description": {
                    "zh": "对齐最新 /persona 查询接口。",
                    "en": "Mirrors the latest /persona list endpoint.",
                },
            },
            "post": {
                "summary": {"zh": "创建 persona", "en": "Create persona"},
                "description": {
                    "zh": "根据已生成歌曲创建歌手风格 persona。",
                    "en": "Creates a singer-style persona from an existing generated song.",
                },
            },
            "delete": {
                "summary": {"zh": "删除 persona", "en": "Delete persona"},
                "description": {
                    "zh": "删除指定 persona。",
                    "en": "Deletes a specified persona.",
                },
            }
        },
        "/lyrics/{lid}": {
            "get": {
                "summary": {"zh": "获取缓存歌词结果", "en": "Fetch cached lyrics result"},
                "description": {
                    "zh": "根据任务 ID 获取本地缓存中的歌词结果。",
                    "en": "Fetches cached lyrics result by task ID from local memory.",
                },
            }
        },
        "/generate/concat": {
            "post": {
                "summary": {"zh": "兼容：拼接歌曲", "en": "Compatibility: concatenate songs"},
                "description": {
                    "zh": "兼容旧版调用，内部转发到 /audios 的 concat 动作。",
                    "en": "Backwards-compatible route that forwards to the concat action of /audios.",
                },
            }
        },
    },
    "schemas": {
        "Response": {
            "description": {"zh": "统一响应结构", "en": "Standard response wrapper"},
            "properties": {
                "code": {"description": {"zh": "业务状态码", "en": "Business status code"}},
                "msg": {"description": {"zh": "响应消息", "en": "Response message"}},
                "data": {"description": {"zh": "响应数据", "en": "Response payload"}},
            },
        },
        "CustomModeGenerateParam": {
            "description": {
                "zh": "自定义模式生成参数",
                "en": "Request payload for custom mode generation",
            },
            "properties": {
                "prompt": {"description": {"zh": "歌词内容", "en": "Song lyrics"}},
                "mv": {
                    "description": {
                        "zh": "模型版本，默认 chirp-v5",
                        "en": "Model version, defaults to chirp-v5",
                    }
                },
                "title": {"description": {"zh": "歌曲标题", "en": "Song title"}},
                "tags": {"description": {"zh": "音乐风格标签", "en": "Music style tags"}},
                "continue_at": {
                    "description": {
                        "zh": "从上一首歌的指定秒数继续生成",
                        "en": "Continue generation from the specified second of a previous song",
                    }
                },
                "continue_clip_id": {
                    "description": {
                        "zh": "继续生成时关联的 clip ID",
                        "en": "Clip ID used when continuing generation",
                    }
                },
            },
        },
        "DescriptionModeGenerateParam": {
            "description": {
                "zh": "描述模式生成参数",
                "en": "Request payload for description mode generation",
            },
            "properties": {
                "gpt_description_prompt": {
                    "description": {
                        "zh": "歌曲描述提示词",
                        "en": "Song description prompt",
                    }
                },
                "make_instrumental": {
                    "description": {"zh": "是否生成纯音乐", "en": "Generate instrumental only"}
                },
                "mv": {
                    "description": {
                        "zh": "模型版本，默认 chirp-v5",
                        "en": "Model version, defaults to chirp-v5",
                    }
                },
                "prompt": {
                    "description": {
                        "zh": "占位字段，请保持空字符串",
                        "en": "Placeholder field, keep it as an empty string",
                    }
                },
            },
        },
        "ConcatParam": {
            "description": {
                "zh": "歌曲拼接参数",
                "en": "Request payload for song concatenation",
            },
            "properties": {
                "clip_id": {"description": {"zh": "音频 clip ID", "en": "Audio clip ID"}},
                "is_infill": {
                    "description": {"zh": "是否启用补全模式", "en": "Whether to use infill mode"}
                },
            },
        },
        "GenerateLyricsParam": {
            "description": {
                "zh": "歌词生成参数",
                "en": "Request payload for lyrics generation",
            },
            "properties": {
                "prompt": {
                    "description": {"zh": "歌词提示词", "en": "Lyrics prompt"}
                }
            },
        },
        "AudioGenerateRequest": {
            "description": {
                "zh": "最新 /audios 请求参数",
                "en": "Request payload for /audios",
            },
            "properties": {
                "action": {"description": {"zh": "音频动作类型", "en": "Audio action type"}},
                "prompt": {"description": {"zh": "灵感模式提示词", "en": "Prompt for inspiration mode"}},
                "model": {"description": {"zh": "模型版本", "en": "Model version"}},
                "lyric": {"description": {"zh": "歌词内容", "en": "Lyrics content"}},
                "custom": {"description": {"zh": "是否使用自定义歌词模式", "en": "Whether to use custom lyrics mode"}},
                "instrumental": {"description": {"zh": "是否生成纯音乐", "en": "Whether to generate instrumental only"}},
                "title": {"description": {"zh": "歌曲标题", "en": "Song title"}},
                "style": {"description": {"zh": "歌曲风格", "en": "Song style"}},
                "audio_id": {"description": {"zh": "参考或续写音频 ID", "en": "Reference or source audio ID"}},
                "persona_id": {"description": {"zh": "歌手风格 persona ID", "en": "Singer-style persona ID"}},
                "continue_at": {"description": {"zh": "续写时间点（秒）", "en": "Continuation time in seconds"}},
                "callback_url": {"description": {"zh": "回调地址", "en": "Callback URL"}},
            },
        },
        "LyricsGenerateRequest": {
            "description": {
                "zh": "最新 /lyrics 请求参数",
                "en": "Request payload for /lyrics",
            },
            "properties": {
                "prompt": {"description": {"zh": "歌词提示词", "en": "Lyrics prompt"}},
                "model": {"description": {"zh": "歌词生成模型", "en": "Lyrics generation model"}},
            },
        },
        "PersonaCreateRequest": {
            "description": {
                "zh": "最新 /persona 创建参数",
                "en": "Request payload for creating /persona",
            },
            "properties": {
                "name": {"description": {"zh": "persona 名称", "en": "Persona name"}},
                "audio_id": {"description": {"zh": "已生成歌曲音频 ID", "en": "Existing generated audio ID"}},
                "vox_audio_id": {"description": {"zh": "vox 音频 ID", "en": "VOX audio ID"}},
                "description": {"description": {"zh": "persona 描述", "en": "Persona description"}},
                "vocal_start": {"description": {"zh": "人声片段起始时间", "en": "Vocal segment start time"}},
                "vocal_end": {"description": {"zh": "人声片段结束时间", "en": "Vocal segment end time"}},
            },
        },
    },
}

DOCS_CONFIG = {
    "zh": {
        "openapi_url": "/openapi.json",
        "title": "SUNO API 文档",
        "switch_label": "English",
        "switch_href": "/docs/en",
        "api_title": "SUNO API 中文文档",
        "api_description": "基于 FastAPI 的 SUNO 音乐生成 API。",
    },
    "en": {
        "openapi_url": "/openapi.en.json",
        "title": "SUNO API Docs",
        "switch_label": "中文",
        "switch_href": "/docs",
        "api_title": "SUNO API English Docs",
        "api_description": "A FastAPI-based SUNO music generation API.",
    },
}


app = FastAPI(
    title="SUNO API",
    version="1.0.0",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def build_localized_openapi(lang: str) -> dict:
    config = DOCS_CONFIG[lang]
    schema = get_openapi(
        title=config["api_title"],
        version=app.version,
        description=config["api_description"],
        routes=app.routes,
    )
    localized = deepcopy(schema)

    for path, methods in OPENAPI_I18N["paths"].items():
        path_item = localized.get("paths", {}).get(path, {})
        for method, translations in methods.items():
            operation = path_item.get(method)
            if not operation:
                continue
            for key in ("summary", "description"):
                translated = translations.get(key, {}).get(lang)
                if translated:
                    operation[key] = translated

    components = localized.get("components", {}).get("schemas", {})
    for schema_name, translations in OPENAPI_I18N["schemas"].items():
        schema_node = components.get(schema_name)
        if not schema_node:
            continue
        description = translations.get("description", {}).get(lang)
        if description:
            schema_node["description"] = description
        for prop_name, prop_translations in translations.get("properties", {}).items():
            prop_node = schema_node.get("properties", {}).get(prop_name)
            if not prop_node:
                continue
            translated = prop_translations.get("description", {}).get(lang)
            if translated:
                prop_node["description"] = translated

    return localized


def get_docs_html(lang: str) -> HTMLResponse:
    config = DOCS_CONFIG[lang]
    html = get_swagger_ui_html(
        openapi_url=config["openapi_url"],
        title=config["title"],
        swagger_ui_parameters={"defaultModelsExpandDepth": -1},
    )
    content = html.body.decode("utf-8")
    switcher = f"""
    <style>
      .lang-switch {{
        position: fixed;
        top: 18px;
        right: 18px;
        z-index: 9999;
        padding: 8px 12px;
        border-radius: 999px;
        background: #111827;
        color: #ffffff;
        font-family: sans-serif;
        font-size: 14px;
        text-decoration: none;
        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
      }}
    </style>
    <script>
      window.addEventListener('load', function() {{
        var link = document.createElement('a');
        link.className = 'lang-switch';
        link.href = '{config["switch_href"]}';
        link.textContent = '{config["switch_label"]}';
        document.body.appendChild(link);
      }});
    </script>
    """
    return HTMLResponse(content.replace("</body>", f"{switcher}</body>"))


@app.get("/openapi.json", include_in_schema=False)
async def openapi_zh():
    return JSONResponse(build_localized_openapi("zh"))


@app.get("/openapi.en.json", include_in_schema=False)
async def openapi_en():
    return JSONResponse(build_localized_openapi("en"))


@app.get("/docs", include_in_schema=False)
async def docs_zh():
    return get_docs_html("zh")


@app.get("/docs/en", include_in_schema=False)
async def docs_en():
    return get_docs_html("en")


@app.get("/")
async def get_root():
    return schemas.Response()


@app.post("/audios")
async def audios(
    data: schemas.AudioGenerateRequest,
    token: str = Depends(get_token),
    accept: str = Header(default="application/json"),
):
    try:
        response = await generate_audio(
            data.dict(exclude_none=True),
            token,
            accept=accept,
        )
        if accept == "application/x-ndjson":
            return HTMLResponse(content=response, media_type="application/x-ndjson")
        return response
    except Exception as e:
        raise HTTPException(
            detail=str(e), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@app.post("/generate")
async def generate(
    data: schemas.CustomModeGenerateParam, token: str = Depends(get_token)
):
    try:
        resp = await generate_music_with_lyrics(data.dict(), token)
        return resp
    except Exception as e:
        raise HTTPException(
            detail=str(e), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@app.post("/generate/description-mode")
async def generate_with_song_description(
    data: schemas.DescriptionModeGenerateParam, token: str = Depends(get_token)
):
    try:
        resp = await generate_music_with_prompt(data.dict(), token)
        return resp
    except Exception as e:
        raise HTTPException(
            detail=str(e), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@app.post("/lyrics")
async def generate_lyrics_v2(
    data: schemas.LyricsGenerateRequest, token: str = Depends(get_token)
):
    try:
        return await generate_lyrics(data.prompt, token, model=data.model)
    except Exception as e:
        raise HTTPException(
            detail=str(e), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@app.get("/feed/{aid}")
async def fetch_feed(aid: str, token: str = Depends(get_token)):
    try:
        resp = await get_feed_by_clip_id(aid, token)
        return resp
    except Exception as e:
        raise HTTPException(
            detail=str(e), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@app.post("/generate/lyrics/")
async def generate_lyrics_post(
    data: schemas.GenerateLyricsParam, token: str = Depends(get_token)
):
    try:
        resp = await generate_lyrics(data.prompt, token)
        return resp
    except Exception as e:
        raise HTTPException(
            detail=str(e), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@app.get("/persona")
async def get_personas(
    user_id: str = Query(...),
    limit: int = Query(default=50),
    offset: int = Query(default=0),
    token: str = Depends(get_token),
):
    try:
        return await list_personas(user_id, token, limit=limit, offset=offset)
    except Exception as e:
        raise HTTPException(
            detail=str(e), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@app.post("/persona")
async def post_persona(
    data: schemas.PersonaCreateRequest, token: str = Depends(get_token)
):
    try:
        return await create_persona(data.dict(exclude_none=True), token)
    except Exception as e:
        raise HTTPException(
            detail=str(e), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@app.delete("/persona")
async def remove_persona(
    persona_id: str = Query(...),
    user_id: str = Query(...),
    token: str = Depends(get_token),
):
    try:
        return await delete_persona(persona_id, user_id, token)
    except Exception as e:
        raise HTTPException(
            detail=str(e), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@app.get("/lyrics/{lid}")
async def fetch_lyrics(lid: str, token: str = Depends(get_token)):
    try:
        resp = await get_lyrics(lid, token)
        return resp
    except Exception as e:
        raise HTTPException(
            detail=str(e), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@app.post("/generate/concat")
async def concat(data: schemas.ConcatParam, token: str = Depends(get_token)):
    try:
        resp = await concat_music(data.dict(), token)
        return resp
    except Exception as e:
        raise HTTPException(
            detail=str(e), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
