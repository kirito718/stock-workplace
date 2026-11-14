#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-4173}"
ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"

echo "投研台正在启动：http://127.0.0.1:${PORT}"
echo "工作目录：${ROOT_DIR}"
echo "按 Ctrl+C 停止服务"
cd "$ROOT_DIR"
if command -v node >/dev/null 2>&1; then
  exec env PORT="$PORT" node server.mjs
fi
echo "提示：未检测到 Node，回退为静态服务器（公开来源代理不可用）"
exec python3 -m http.server "$PORT" --bind 0.0.0.0
