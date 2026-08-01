from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


class Response(BaseModel):
    code: Optional[int] = 0
    msg: Optional[str] = "success"
    data: Optional[Any] = None


ModelType = Literal[
    "chirp-v5-5",
    "chirp-v5",
    "chirp-v4-5-plus",
    "chirp-v4-5",
    "chirp-v4",
    "chirp-v3-5",
    "chirp-v3-0",
]

AudioAction = Literal[
    "generate",
    "extend",
    "upload_extend",
    "upload_cover",
    "concat",
    "cover",
    "artist_consistency",
    "artist_consistency_vox",
    "stems",
    "all_stems",
    "replace_section",
    "underpainting",
    "overpainting",
    "remaster",
    "mashup",
    "samples",
]


class AudioGenerateRequest(BaseModel):
    action: AudioAction = Field(
        default="generate",
        description="生成动作类型，默认 generate。",
    )
    prompt: Optional[str] = Field(
        default=None,
        description="灵感模式提示词。",
        examples=["A song for Christmas"],
    )
    model: ModelType = Field(
        default="chirp-v5-5",
        description="生成模型版本。",
    )
    lyric: Optional[str] = Field(
        default=None,
        description="自定义模式歌词内容。",
    )
    custom: bool = Field(
        default=False,
        description="是否使用自定义歌词模式。",
    )
    instrumental: bool = Field(
        default=False,
        description="是否生成纯音乐。",
    )
    title: Optional[str] = Field(
        default=None,
        description="歌曲标题。",
    )
    style: Optional[str] = Field(
        default=None,
        description="歌曲风格。",
    )
    style_negative: Optional[str] = Field(
        default=None,
        description="不希望出现的风格。",
    )
    audio_weight: Optional[float] = Field(
        default=None,
        description="参考音频权重，范围 0-1。",
    )
    audio_id: Optional[str] = Field(
        default=None,
        description="参考或续写歌曲的音频 ID。",
    )
    overpainting_start: Optional[float] = Field(
        default=None,
        description="补人声起始时间，单位秒。",
    )
    overpainting_end: Optional[float] = Field(
        default=None,
        description="补人声结束时间，单位秒。",
    )
    underpainting_start: Optional[float] = Field(
        default=None,
        description="补伴奏起始时间，单位秒。",
    )
    underpainting_end: Optional[float] = Field(
        default=None,
        description="补伴奏结束时间，单位秒。",
    )
    persona_id: Optional[str] = Field(
        default=None,
        description="歌手风格 persona ID。",
    )
    continue_at: Optional[float] = Field(
        default=None,
        description="续写时间点，单位秒。",
        examples=[213.5],
    )
    style_influence: Optional[float] = Field(
        default=None,
        description="style_influence 高级参数。",
    )
    replace_section_start: Optional[float] = Field(
        default=None,
        description="替换片段起始时间。",
    )
    replace_section_end: Optional[float] = Field(
        default=None,
        description="替换片段结束时间。",
    )
    vocal_gender: Optional[Literal["m", "f"]] = Field(
        default=None,
        description="人声性别控制，m 男声，f 女声。",
    )
    weirdness: Optional[float] = Field(
        default=None,
        description="weirdness 高级参数。",
    )
    lyric_prompt: Optional[str] = Field(
        default=None,
        description="自动生成歌词时使用的提示词。",
    )
    callback_url: Optional[str] = Field(
        default=None,
        description="异步回调地址。",
    )
    samples_start: Optional[float] = Field(
        default=None,
        description="采样起始时间。",
    )
    samples_end: Optional[float] = Field(
        default=None,
        description="采样结束时间。",
    )
    mashup_audio_ids: Optional[list[str]] = Field(
        default=None,
        description="mashup 动作使用的多个音频 ID。",
    )
    variation_category: Optional[Literal["high", "normal", "subtle"]] = Field(
        default=None,
        description="v5+ 支持的 variation 分类。",
    )


class LyricsGenerateRequest(BaseModel):
    prompt: str = Field(
        ...,
        description="歌词生成提示词。",
    )
    model: Literal["default", "remi-v1"] = Field(
        default="default",
        description="歌词生成模型。",
    )


class PersonaCreateRequest(BaseModel):
    audio_id: Optional[str] = Field(
        default=None,
        description="已生成歌曲的音频 ID。",
    )
    vox_audio_id: Optional[str] = Field(
        default=None,
        description="新版 persona-v2-vox 的音频 ID。",
    )
    name: str = Field(
        ...,
        description="persona 名称。",
    )
    description: Optional[str] = Field(
        default=None,
        description="persona 描述。",
    )
    vocal_start: Optional[float] = Field(
        default=None,
        description="人声片段起始时间。",
    )
    vocal_end: Optional[float] = Field(
        default=None,
        description="人声片段结束时间。",
    )


class PersonaListQuery(BaseModel):
    user_id: str = Field(..., description="用户 ID。")
    limit: int = Field(default=50, description="返回数量上限。")
    offset: int = Field(default=0, description="分页偏移量。")


class PersonaDeleteQuery(BaseModel):
    user_id: str = Field(..., description="用户 ID。")
    persona_id: str = Field(..., description="待删除的 persona ID。")


class FeedQuery(BaseModel):
    task_id: str = Field(..., description="任务 ID。")


class CustomModeGenerateParam(BaseModel):
    """Backward compatible payload for custom mode generation."""

    prompt: str = Field(..., description="lyrics")
    mv: str = Field(
        default="chirp-v5",
        description="model version, default: chirp-v5",
        examples=["chirp-v5"],
    )
    title: str = Field(..., description="song title")
    tags: str = Field(..., description="style of music")
    continue_at: Optional[float] = Field(
        default=None,
        description="continue a new clip from a previous song, format number",
        examples=[120],
    )
    continue_clip_id: Optional[str] = None


class DescriptionModeGenerateParam(BaseModel):
    """Backward compatible payload for description mode generation."""

    gpt_description_prompt: str
    make_instrumental: bool = False
    mv: str = Field(
        default="chirp-v5",
        description="model version, default: chirp-v5",
        examples=["chirp-v5"],
    )
    prompt: str = Field(
        default="",
        description="Placeholder, keep it as an empty string, do not modify it",
    )


class ConcatParam(BaseModel):
    """Backward compatible payload for song concatenation."""

    clip_id: str
    is_infill: bool = False


class GenerateLyricsParam(BaseModel):
    prompt: str = Field(..., description="lyrics")
