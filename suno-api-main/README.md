<div align="center">
<h1>SUNO API</h1>

中文 | [English](./README_EN.md)

基于 FastAPI 的 Suno 代理服务，已补齐核心接口。

先获取 `TOKEN`: https://share.acedata.cloud/r/1uHHYC0HiL

官网: [Suno](https://suno.com/)

仓库: [suno-api](https://github.com/gochendong/suno-api)
</div>

## 功能

1. 默认支持最新 `chirp-v5-5` 模型
2. 对齐最新 `audios / lyrics / persona` 接口
3. 内置中英文 Swagger 文档，默认中文
4. 保留旧版 `/generate` 等兼容路由

## 文档

- 中文文档: `http://localhost:8000/docs`
- English Docs: `http://localhost:8000/docs/en`

## 安装

1. 准备 `TOKEN`

先访问并获取 `TOKEN`: https://share.acedata.cloud/r/1uHHYC0HiL

从上游获取 Suno API Token，并参考 `.env.example` 创建 `.env`:

```env
TOKEN=your_token_here
```

2. 启动服务

```bash
docker-compose up --build -d
```

3. 访问服务

- 服务地址: `http://localhost:8000`
- 中文文档: `http://localhost:8000/docs`

## 核心接口

- `POST /audios`
  支持 `generate`、`extend`、`upload_extend`、`cover`、`artist_consistency`、`replace_section`、`mashup`、`samples` 等动作。

- `POST /lyrics`
- `GET /persona`
  查询 persona 列表

- `POST /persona`
  创建 persona

- `DELETE /persona`
  删除 persona

- `GET /feed/{aid}`
  根据本地缓存的 clip id 查询关联任务结果

## 兼容旧路由

- `POST /generate`
- `POST /generate/description-mode`
- `POST /generate/lyrics/`
- `POST /generate/concat`
- `GET /lyrics/{lid}`

新接入建议优先使用 `audios / lyrics / persona`。

## `POST /audios` 示例

```json
{
  "action": "generate",
  "prompt": "A song for Christmas",
  "model": "chirp-v5-5",
  "custom": false
}
```

自定义歌词模式:

```json
{
  "action": "generate",
  "model": "chirp-v5-5",
  "custom": true,
  "title": "Snowfall Serenade",
  "style": "uplifting, orchestral with sleigh bells and warm strings",
  "lyric": "[Verse]\nSnowflakes falling like whispered dreams"
}
```

继续生成:

```json
{
  "action": "extend",
  "model": "chirp-v5-5",
  "audio_id": "existing-audio-id",
  "continue_at": 120.5,
  "custom": true,
  "lyric": "[Verse]\nContinue the story"
}
```

流式返回:

- 请求头传 `Accept: application/x-ndjson`

## 主要参数

- `action`: `generate | extend | upload_extend | upload_cover | concat | cover | artist_consistency | artist_consistency_vox | stems | all_stems | replace_section | underpainting | overpainting | remaster | mashup | samples`
- `model`: `chirp-v5-5 | chirp-v5 | chirp-v4-5-plus | chirp-v4-5 | chirp-v4 | chirp-v3-5 | chirp-v3-0`
- `prompt`: 灵感模式提示词
- `lyric`: 自定义模式歌词
- `custom`: 是否使用自定义模式
- `audio_id`: 续写、翻唱、拼接等动作依赖的音频 ID
- `persona_id`: 歌手风格 ID
- `callback_url`: 异步回调地址

## Referenced Projects

- [https://github.com/SunoAI-API/Suno-API](https://github.com/SunoAI-API/Suno-API)
- [https://github.com/gcui-art/suno-api](https://github.com/gcui-art/suno-api)

## License

[MIT](./LICENSE)

## Codex中转站

https://sub.bulita.net/

用于 `0.1` 倍率的中转调用。

支持 `image2` 图像生成。
