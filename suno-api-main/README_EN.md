<div align="center">
<h1>SUNO API</h1>

[中文](./README.md) | English

A FastAPI-based Suno proxy service with the core APIs implemented.

Get `TOKEN` first: https://share.acedata.cloud/r/1uHHYC0HiL

Website: [Suno](https://suno.com/)

Repository: [suno-api](https://github.com/gochendong/suno-api)
</div>

## Features

1. Supports the latest `chirp-v5-5` model by default
2. Aligned with the latest `audios / lyrics / persona` APIs
3. Built-in bilingual Swagger docs, defaulting to Chinese
4. Keeps legacy compatibility routes such as `/generate`

## Documentation

- Chinese docs: `http://localhost:8000/docs`
- English docs: `http://localhost:8000/docs/en`

## Install

1. Prepare `TOKEN`

Get `TOKEN` first: https://share.acedata.cloud/r/1uHHYC0HiL

Get your Suno API token from upstream and create `.env` from `.env.example`:

```env
TOKEN=your_token_here
```

2. Start the service

```bash
docker-compose up --build -d
```

3. Access the service

- Service: `http://localhost:8000`
- Chinese docs: `http://localhost:8000/docs`

## Core APIs

- `POST /audios`
  Supports `generate`, `extend`, `upload_extend`, `cover`, `artist_consistency`, `replace_section`, `mashup`, `samples`, and more.

- `POST /lyrics`

- `GET /persona`
  List personas

- `POST /persona`
  Create persona

- `DELETE /persona`
  Delete persona

- `GET /feed/{aid}`
  Fetch the associated task result by cached clip id

## Legacy Compatibility Routes

- `POST /generate`
- `POST /generate/description-mode`
- `POST /generate/lyrics/`
- `POST /generate/concat`
- `GET /lyrics/{lid}`

New integrations should prefer `audios / lyrics / persona`.

## `POST /audios` Example

```json
{
  "action": "generate",
  "prompt": "A song for Christmas",
  "model": "chirp-v5-5",
  "custom": false
}
```

## License

[MIT](./LICENSE)

## Codex Station

https://sub.bulita.net/

For `0.1x` proxy access.

Supports `image2` image generation.
