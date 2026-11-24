# 后端部署说明（FEAT-002）

## 配置原则

- **GitHub Secrets 只放 SSH 连接信息**（CI 连服务器必需）。
- **数据库账号、端口、CORS 等运行时配置放在服务器本地 `.env`**，不写入仓库、不写入 GitHub Secrets。

## 一、服务器端准备（由服务器维护者执行）

1. 创建目录：
   ```bash
   mkdir -p /opt/lucky-picks/backend
   ```
2. 把仓库模板复制为配置文件并填写：
   ```bash
   cp /opt/lucky-picks/backend/.env.example /opt/lucky-picks/backend/.env
   chmod 600 /opt/lucky-picks/backend/.env
   ```
   首次可由本机执行：
   ```bash
   scp backend/.env.example root@119.29.189.103:/opt/lucky-picks/backend/.env
   ```
3. `.env` 必填项见模板；脚本会自动加载它，不会把内容打印到日志。

## 二、GitHub Secrets（仓库 Settings → Secrets → Actions）

| 名称 | 值 |
|---|---|
| `SSH_HOST` | `119.29.189.103` |
| `SSH_USER` | `root` |
| `SSH_PASSWORD` | root 密码 |
| `SSH_PORT` | `22`（非默认端口才需填写） |

## 三、部署流程

1. 推送 `backend/**` 到 `main` 触发 `.github/workflows/deploy-backend.yml`；
2. CI 通过 SSH 调用服务器上的 `backend/scripts/server_deploy.sh`；
3. 脚本做：检查 `.env` → clone/pull 仓库 → 建虚拟环境装依赖 → 重启 uvicorn（`API_PORT`，默认 1688）→ 健康检查 `/health`。

也可在 Actions 页面手动 `workflow_dispatch` 触发。

## 四、HTTPS 要求（前端调用前提）

GitHub Pages 是 HTTPS，浏览器会拦截页面发起的 `http://IP:1688` 请求（混合内容）。
上线前必须为后端准备 HTTPS 入口，二选一：

1. 域名 + nginx 反代 + Let's Encrypt（推荐）：把 `api.你的域名` A 记录指向 `119.29.189.103`，nginx 反代到 `127.0.0.1:1688`；
2. 已有 HTTPS 反代/网关地址，直接指向后端端口。

准备好后，在 Pages 构建的 Repository Variables 中配置 `VITE_API_BASE_URL=https://api.你的域名`，重新部署前端即可从「离线模式」切换到真实后端。

## 五、回滚

- 在服务器上 `git checkout <上一提交>` 后重新执行 `server_deploy.sh`；
- 或在 Actions 重新运行历史成功的部署工作流。
