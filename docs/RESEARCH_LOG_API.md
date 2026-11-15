# 研究日志服务端切片

## 目标

将当前浏览器 `localStorage` 研究日志迁移为用户隔离的 canonical server state，同时保留离线回退。服务端不接受匿名跨用户读取，也不把演示数据写入生产表。

## 数据模型

### `research_entries`

- `user_id`：认证用户标识
- `id`：客户端稳定 ID，唯一约束为 `(user_id, id)`
- `code`：证券代码，可为空
- `title`：公告/研究标题
- `event_type`：标准化事件类型
- `source`：来源名称
- `url`：原文 URL
- `thesis`：用户观点
- `risk`：用户风险记录
- `follow_up_date`：复核日期，可为空
- `created_at`、`updated_at`：服务端时间戳

### `action_state`

- `user_id`
- `action_id`：`news:<announcement-id>` 或 `log:<research-id>`
- `completed_at`：完成时间，可为空
- 唯一约束为 `(user_id, action_id)`

## API 契约（第一版）

- `GET /api/research/logs`：按 `created_at DESC` 返回当前用户日志
- `POST /api/research/logs`：幂等创建；重复 `id` 返回现有记录
- `PATCH /api/research/logs/:id`：只允许更新 `thesis`、`risk`、`followUpDate`
- `DELETE /api/research/logs/:id`：删除当前用户自己的记录
- `GET /api/research/actions`：返回当前用户未完成行动
- `POST /api/research/actions/:id/complete`：写入完成时间

所有响应保留 `source`、`publishedAt`、`url` 等来源字段；服务端错误使用稳定的 `code`，不把数据库错误原文返回给客户端。

## localStorage 一次性迁移

1. 登录后请求服务端日志。
2. 若服务端为空且本地存在日志，展示“导入本机研究日志”按钮，不静默上传。
3. 导入使用原 `id`，逐条幂等 `POST`，成功后记录迁移版本。
4. 迁移失败保留本地数据，并显示失败条数与重试入口。
5. 服务端可用后，新的写入以服务端为准；离线时继续写本地队列，恢复后按 `id` 重放。

## 实现顺序

1. PostgreSQL + Drizzle schema 与迁移/回滚脚本。
2. 认证中间件和 `user_id` 注入，拒绝匿名跨用户访问。
3. Nuxt Nitro CRUD 路由与契约测试。
4. 前端 repository 层：server-first、localStorage fallback、一次性导入。
5. canonical state 稳定后，再接提醒 worker，避免提醒读取过时的浏览器状态。
