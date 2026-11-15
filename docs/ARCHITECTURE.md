# 投研台渐进式 Nuxt 架构

## 决策

采用 Nuxt 全栈渐进迁移。根目录 MVP 保持可运行，`apps/web/` 是第一个 vertical slice，不与现有静态版本抢入口。

## 第一阶段边界

- `apps/web/server/api/health.get.ts`：服务健康检查
- `apps/web/server/api/cninfo/stocks.get.ts`：同源代理巨潮股票目录
- `apps/web/server/api/cninfo/announcements.post.ts`：同源代理公告查询
- 下一步迁移：公告标准化、研究日志、今日行动和数据源状态

## 后续数据层

1. PostgreSQL + Drizzle：用户、研究日志、行动状态和公告缓存
2. Redis 或托管队列：公告刷新、重试、提醒和去重
3. AI 服务只接收带来源、发布时间和原文链接的事件

## 迁移规则

- 每次只迁移一个用户流程，根目录 MVP 继续作为回退版本
- 真实来源失败必须显式显示状态，不回填虚构行情
- API 先稳定契约，再替换 UI；所有公开来源保留 source、publishedAt、url 和 parserStatus
