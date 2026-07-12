# MAIS-MVP Vercel Deployment Slimming Guide

Date: 2026-05-28

Owner session: S10

## 目的

本教程用于在不上 Vercel Pro、也不连接 GitHub 仓库的前提下，先把 MAIS-MVP 的 Vercel CLI 上传包压到更合理的范围。核心做法是在项目根目录添加 `.vercelignore`，让 Vercel 只上传运行 Next.js 网站需要的文件。

Vercel 官方文档说明：

- `.vercelignore` 放在项目根目录，用来排除部署上传文件，行为类似 `.gitignore`，但只影响 Vercel 部署上传。
- Vercel CLI 部署源码上传在 Hobby 计划下有 100 MB 限制，源码文件数上限为 15,000。
- 参考文档：
  - https://vercel.com/docs/deployments/vercel-ignore
  - https://vercel.com/docs/limits
  - https://vercel.com/docs/cli/deploy

## `.gitignore` 和 `.vercelignore` 的区别

`.gitignore` 控制哪些文件不进入本地 Git 历史，例如 `.env.local`、`.next/`、`node_modules/`。

`.vercelignore` 控制哪些文件不上传到 Vercel，例如 `coordination/`、`tests/`、`.tmp/`、本地报告和 Playwright 输出。

两者可以有重叠，但目的不同：

- Git 关心版本历史是否干净。
- Vercel 关心部署包是否小、是否安全、是否只包含运行必需文件。

## 本次排除策略

根目录 `.vercelignore` 已排除以下类别：

- 本地 Git 和 Vercel 状态：`.git/`、`.vercel/`
- 依赖和构建产物：`node_modules/`、`.next/`、`out/`、`dist/`、`build/`、`.turbo/`
- 协作、QA、报告、测试：`coordination/`、`tests/`、`test-results/`、`playwright-report/`、`.playwright-cli/`、`video-plan/`
- 本地生成输出：`.local/`、`.tmp/`、`tmp/`、`temp/`、`output/`、`outputs/`、`coverage/`、`.cache/`
- 日志、本地文件和私密配置：`*.log`、`*.tsbuildinfo`、`.DS_Store`、`.Rhistory`、`default accounts.md`、`.env`、`.env.*`、`*.local`

注意：`.env.example` 和 `.env.local.example` 保留为可上传的安全模板；真实 `.env.local` 不会上传。

## 运行时 JSON 数据位置

部署时不能上传整个 `coordination/`，但部分线上页面和题库逻辑确实需要由 QA 流程产出的 JSON 数据。为避免 Vercel 构建时找不到模块，运行时必需的 15 个 JSON/lesson 包已复制到：

```text
data/generated-content/
```

线上代码应从 `data/generated-content/` import 这些运行时数据；`coordination/content-qa/` 继续作为 QA、生成过程、审查报告和工作中间产物的归档区，不作为部署依赖。

如果以后有新的题库 JSON 要进入线上运行，请按同一原则处理：

1. 把最小运行时 JSON 复制到 `data/generated-content/`。
2. 更新 `data/*.ts` 的 import 路径。
3. 保持 `.vercelignore` 排除 `coordination/`。
4. 运行 `npm run type-check` 和 `npm run build`。

## 为什么要排除这些目录

当前本地体积中，主要不应进入部署包的目录包括：

| 路径 | 当前体积 | 原因 |
| --- | ---: | --- |
| `.next/` | 2.3 GB | 本地构建产物，Vercel 会重新构建 |
| `coordination/` | 994 MB | 会话日志、QA、报告、研究资料，不是线上运行依赖 |
| `node_modules/` | 527 MB | Vercel 会根据 `package-lock.json` 安装 |
| `.local/` | 337 MB | 本地 RAG/API/缓存资料 |
| `.tmp/` | 231 MB | 临时编译和测试输出 |
| `output/` | 277 MB | 本地生成输出，不是线上必需源码 |
| `.playwright-cli/` | 36 MB | 本地浏览器测试日志 |
| `test-results/` | 7.3 MB | 测试结果，不应部署 |
| `tests/` | 1.0 MB | 测试源文件，不是线上运行入口 |

## 本地 CLI 部署流程

先在本地做静态检查和生产构建：

```bash
npm run type-check
npm run build
```

### Production 持久化提醒

下次一起用 Vercel 部署网页时，必须先提醒 owner 检查 durable storage。`www.mais.hk` 的真实注册、`/api/me`、dashboard 和重新登录不能只依赖 Vercel serverless 上的 SQLite `/tmp` fallback。

部署前后都要做这组检查：

1. Vercel Production 和 Preview 环境变量名里应有 `HK_MATH_STORAGE_PROVIDER=postgres`。
2. Vercel Production 和 Preview 环境变量名里应有 server-only `POSTGRES_URL`，但不要在日志、报告、截图或聊天里写出真实值。
3. 设置或更新这些变量后，必须重新部署 Production。
4. 重新部署后，用 approved admin smoke credential 验证 `/api/admin/storage/health` 返回 `provider: "postgres"`、`status: "durable-ready"`、`durableReady: true`。
5. 再跑一次 production registration persistence smoke：注册新学生 -> `/api/me` -> dashboard -> logout/login -> `/api/me`，全部应稳定 200。

截至 2026-06-05，这个 gate 仍未关闭：S19 的只读检查显示 Production/Preview 缺少 `POSTGRES_URL` 和 `HK_MATH_STORAGE_PROVIDER`，Neon Marketplace 安装被 `integration_terms_acceptance_required` 卡住。下次部署前，要先让 owner 接受 Neon Marketplace terms，或通过安全渠道提供已有 Postgres connection string。

首次使用 Vercel CLI：

```bash
npx vercel login
npx vercel link
```

创建 Preview 部署：

```bash
npx vercel deploy --archive=tgz
```

确认 Preview 正常后再部署 Production：

```bash
npx vercel deploy --prod --archive=tgz
```

`--archive=tgz` 会把上传内容打包压缩，适合当前这种文件数量和体积都偏大的项目。它不是根治办法，真正的根治仍然是减少上传内容。

## 如何排查部署体积

查看根目录各项体积：

```bash
du -sh .[!.]* * 2>/dev/null | sort -h | tail -n 40
```

重点看这些目录是否仍然很大：

```bash
du -sh public data app components lib package.json package-lock.json next.config.ts 2>/dev/null
```

如果 Vercel 仍提示源码超过 Hobby 100 MB 限制，优先检查 `public/`。当前 `public/lesson-illustrations` 约 305 MB，`public/ease_question_assets` 约 57 MB。它们是真正可能继续阻塞 Hobby 部署的线上静态资源。

## 如果仍超过 100 MB

不要直接升级 Pro。下一步按顺序处理：

1. 统计 `public/` 内最大目录和最大图片。
2. 将 `public/lesson-illustrations` 的 PNG/JPG 批量压缩为 WebP 或 AVIF。
3. 只保留 MVP 首屏和核心课程需要的图片。
4. 把大批量课程图片迁移到对象存储或 CDN，只在代码中保留 URL。
5. 重新运行 `npm run build` 和 `npx vercel deploy --archive=tgz`。

## 当前边界

本次任务只处理部署上传瘦身：

- 不改功能代码。
- 不压缩或迁移图片。
- 不连接 GitHub remote。
- 不执行实际 Vercel 部署。
- 不读取或写入真实 `.env.local` secret。
