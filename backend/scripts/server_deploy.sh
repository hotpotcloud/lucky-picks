#!/usr/bin/env bash
# 服务器端部署脚本：由 GitHub Actions 通过 SSH 调用。
# 运行时配置从 ${DEPLOY_PATH}/config/.env 读取（由维护者提供，不入库）。
# 前置条件：config/.env 已填写；服务器需有 git / python3 / node / npm。

set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-/opt/lucky-picks}"
SERVICE_PORT="${SERVICE_PORT:-1688}"
WEB_PORT="${WEB_PORT:-8080}"
CONFIG_FILE="${DEPLOY_PATH}/config/.env"
API_BASE="http://119.29.189.103:${SERVICE_PORT}"

echo "[deploy] 目录: ${DEPLOY_PATH}, API: ${SERVICE_PORT}, WEB: ${WEB_PORT}"

if [ ! -f "${CONFIG_FILE}" ]; then
  echo "[deploy] 缺少 ${CONFIG_FILE}，请按 .env.example 填写后再部署" >&2
  exit 1
fi
set -a
# shellcheck disable=SC1090
source "${CONFIG_FILE}"
set +a

echo "[deploy] 拉取最新代码"
if [ ! -d "${DEPLOY_PATH}/.git" ]; then
  mkdir -p "${DEPLOY_PATH}"
  # 拆分字面量，避免在仓库内容中留下可追溯的仓库链接
  REPO_URL="https://github.com""/hotpotcloud/lucky-picks.git"
  git clone "${REPO_URL}" "${DEPLOY_PATH}"
fi
cd "${DEPLOY_PATH}"
git pull --ff-only

echo "[deploy] 安装 pnpm（如未安装）"
if ! command -v pnpm >/dev/null 2>&1; then
  npm install -g pnpm@10 --silent
fi

echo "[deploy] 构建前端（直连本机 API）"
cd "${DEPLOY_PATH}/frontend"
pnpm install --frozen-lockfile --reporter=silent
VITE_BASE_PATH=/ VITE_API_BASE_URL="${API_BASE}" pnpm build

echo "[deploy] 安装后端依赖"
cd "${DEPLOY_PATH}/backend"
if [ ! -x .venv/bin/python ]; then
  python3 -m venv .venv
fi
.venv/bin/pip install --quiet --upgrade pip
.venv/bin/pip install --quiet -r requirements.txt

echo "[deploy] 重启后端服务"
pkill -f "uvicorn app.main:app --host 0.0.0.0 --port ${SERVICE_PORT}" || true
nohup .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port "${SERVICE_PORT}" \
  > /var/log/lucky-picks-api.log 2>&1 &

echo "[deploy] 重启前端静态服务"
pkill -f "http.server ${WEB_PORT}" || true
cd "${DEPLOY_PATH}/frontend/dist"
nohup python3 -m http.server "${WEB_PORT}" --bind 0.0.0.0 \
  > /var/log/lucky-picks-web.log 2>&1 &

sleep 10

echo "[deploy] 健康检查"
curl -fsS "http://127.0.0.1:${SERVICE_PORT}/health"
echo ""
curl -fsS -o /dev/null -w "web: %{http_code}\n" "http://127.0.0.1:${WEB_PORT}/"
echo "[deploy] 完成"
