# 后端部署说明（FEAT-002）

## 配置原则

- **GitHub Secrets 只放 SSH 连接信息**（CI 连服务器必需）。
- **数据库账号、端口、CORS 等运行时配置放在服务器本地 `.env`**，不写入仓库、不写入 GitHub Secrets。

## 一、服务器端准备（由服务器维护者执行）

1. 创建目录：
   ```bash
   mkdir -p /opt/lucky-picks/config /opt/lucky-picks/backend
   ```
2. 把仓库模板复制为配置文件并填写：
   ```bash
   cp /opt/lucky-picks/config/.env.example /opt/lucky-picks/config/.env
   chmod 600 /opt/lucky-picks/config/.env
   ```
   首次可由本机执行：
   ```bash
   scp backend/.env.example root@119.29.189.103:/opt/lucky-picks/config/.env
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

## 四、访问方式与 HTTPS

前端由 `scripts/serve_static.py` 提供静态文件，并把 `/api/*` 反向代理到本机后端
（默认 `SERVICE_PORT=1688`、`WEB_PORT=1689`），浏览器只访问同源地址，因此不再触发
混合内容拦截，也不需要配置 `VITE_API_BASE_URL`。

当前部署未启用 HTTPS。登录与注册只提交 SHA-256 密码摘要，不传明文密码；但摘要和
登录令牌仍可能被链路窃听。对外提供服务前，建议在反向代理层启用 TLS。

## 五、数据库认证失败（1045）排查

`pymysql.err.OperationalError: (1045, "Access denied for user ...")` 表示 MariaDB
拒绝了应用配置的账号密码，不是代码逻辑错误。按以下顺序检查服务器 `.env`：

1. `DB_USER`、`DB_PASSWORD`、`DB_HOST` 与 MariaDB 中实际账号一致；密码含 `@` 等
   特殊字符时，确认 `.env` 中的值未被 shell 或 URL 编码规则改写。
2. 登录数据库执行 `SELECT User, Host, plugin FROM mysql.user WHERE User='账号';`，
   确认应用的 `DB_HOST` 对应到正确的 Host 记录（`localhost` 与 `127.0.0.1` 可能是两条记录）。
3. 若 `plugin` 为 `unix_socket`，需改为密码插件：
   `ALTER USER '账号'@'localhost' IDENTIFIED VIA mysql_native_password USING PASSWORD('新密码');`
4. 修改后执行 `FLUSH PRIVILEGES;`，再用与后端相同的 host 和密码执行 `SELECT 1` 验证。

建议使用不含特殊字符的数据库密码，避免配置解析差异。

## 六、回滚

- 在服务器上 `git checkout <上一提交>` 后重新执行 `server_deploy.sh`；
- 或在 Actions 重新运行历史成功的部署工作流。
