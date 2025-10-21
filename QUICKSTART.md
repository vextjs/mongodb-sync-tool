# 快速开始指南

> 5 分钟快速上手 MongoDB 同步工具

## 📦 1. 安装依赖

```bash
cd mongodb-sync-tool
npm install
```

安装完成后，确保已安装 `mongodb` 和 `dotenv` 包。

## ⚙️ 2. 配置连接信息

复制并编辑配置文件：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的数据库信息：

```env
# 远程数据库（生产环境）
REMOTE_HOST=your-production-host.com
REMOTE_PORT=27017
REMOTE_USER=your-username
REMOTE_PASS=your-password
REMOTE_DB=your-database

# 本地数据库
LOCAL_HOST=localhost
LOCAL_PORT=27017
LOCAL_DB=your-database

# 要同步的集合（逗号分隔，留空则同步所有）
COLLECTIONS=users,orders,products
```

## 🚀 3. 运行同步

### 方式一：使用 npm scripts（推荐）

```bash
# 测试连接（模拟运行）
npm run sync -- --dry-run

# 开始同步
npm run sync

# 同步并删除本地旧数据
npm run sync -- --drop-local
```

### 方式二：直接运行

```bash
# 使用新版入口
node src/index.js

# 或使用旧版兼容入口
node sync-mongodb.js
```

## 💡 常见场景

### 场景 1：生产环境完整同步到本地

```bash
# 编辑 .env 配置好连接信息后执行
npm run sync -- --drop-local
```

### 场景 2：只同步特定集合

```bash
npm run sync -- --collections users,orders
```

### 场景 3：同步多个数据库

```bash
npm run sync -- --databases myapp,analytics,logs
```

### 场景 4：同步整个实例

```bash
npm run sync -- --sync-all --exclude-databases test,temp
```

### 场景 5：增量同步

```bash
npm run sync -- --db myapp --incremental --since "2025-01-20"
```

### 场景 6：使用过滤条件

```bash
npm run sync -- --db myapp --collections users --filter '{"status":"active"}'
```

### 场景 7：不使用 .env，纯命令行

```bash
npm run sync -- \
  --remote-host prod.example.com \
  --remote-user admin \
  --remote-pass secret \
  --db myapp \
  --collections users,orders
```

## 🔍 运行示例代码

项目提供了多个示例，可以直接运行学习：

```bash
# 同步单个集合
npm run example:collection

# 同步多个数据库
npm run example:database

# 同步整个实例
npm run example:instance

# 增量同步
npm run example:incremental
```

## 🧪 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试
npm run test:collection
npm run test:database
npm run test:incremental
```

## 📖 查看帮助

```bash
npm run help

# 或
node src/index.js --help
```

## 🎯 同步模式对比

| 模式 | 使用场景 | 命令示例 |
|------|----------|----------|
| **集合同步** | 只需要特定集合 | `--db myapp --collections users,orders` |
| **数据库同步** | 同步整个数据库 | `--db myapp` |
| **多数据库** | 同步多个数据库 | `--databases db1,db2,db3` |
| **实例同步** | 完整复制环境 | `--sync-all` |
| **增量同步** | 只同步更新 | `--db myapp --incremental` |

## ⚠️ 注意事项

1. **首次使用建议先 `--dry-run`** 测试配置
2. **生产环境慎用 `--drop-local`**，会删除本地数据
3. **增量同步需要集合有时间戳字段**（如 `updatedAt`）
4. **大数据量同步时**，适当调整 `--batch-size`
5. **不要提交 `.env` 文件**到代码仓库

## 📚 下一步

- **完整文档**: [README.md](./README.md)
- **API 文档**: [docs/API.md](./docs/API.md)
- **更新日志**: [CHANGELOG.md](./CHANGELOG.md)
- **项目状态**: [STATUS.md](./STATUS.md)
- **示例代码**: [examples/](./examples/)

## 🆘 遇到问题？

1. 查看 [README.md - 故障排查](./README.md#-故障排查) 章节
2. 使用 `--verbose` 查看详细日志
3. 检查网络连接和数据库权限
4. 提交 Issue 获取帮助

---

**祝使用愉快！** 🎉
