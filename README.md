# MongoDB 数据库同步工具 v2.1

一个功能强大、灵活可配置的 MongoDB 数据库同步工具，支持集合、数据库、实例级别的同步，支持增量同步和 SSH 隧道连接。

## ✨ 功能特性

### 核心功能
- ✅ **多级别同步**：支持集合、数据库、实例（全部数据库）级别同步
- ✅ **增量同步**：基于时间戳字段的增量同步，避免全量同步开销
- ✅ **过滤同步**：支持自定义过滤条件，只同步符合条件的数据
- ✅ **SSH 隧道**：支持通过 SSH 隧道安全连接 MongoDB（v2.1+）🆕
- ✅ **索引同步**：自动同步索引结构
- ✅ **批量优化**：批量插入提升性能
- ✅ **模拟运行**：dry-run 模式，不实际写入数据

### 体验优化
- ✅ **实时进度**：显示详细的同步进度和进度条
- ✅ **彩色日志**：分级日志输出，易于识别
- ✅ **错误容错**：单个集合失败不影响其他集合
- ✅ **性能统计**：显示同步速度、耗时等统计信息

### 配置灵活
- ✅ **多种配置方式**：支持环境变量、命令行参数、代码配置
- ✅ **多种认证方式**：支持密码、私钥等多种 SSH 认证方式（v2.1+）🆕
- ✅ **排除选项**：可排除特定集合和数据库
- ✅ **参数校验**：完整的输入参数校验
- ✅ **模块化架构**：代码结构清晰，易于扩展

## 📦 安装

```bash
cd mongodb-sync-tool
npm install
```

## 🚀 快速开始

### 1. 配置连接信息

复制并编辑配置文件：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# 远程数据库
REMOTE_HOST=prod.example.com
REMOTE_PORT=27017
REMOTE_USER=admin
REMOTE_PASS=secret
REMOTE_DB=myapp

# 本地数据库
LOCAL_HOST=localhost
LOCAL_PORT=27017
LOCAL_DB=myapp_dev

# 同步选项
COLLECTIONS=users,orders
BATCH_SIZE=1000
DROP_LOCAL=false
```

### 2. 运行同步

```bash
# 使用 .env 配置
npm run sync

# 或使用命令行参数
npm run sync -- --db myapp --collections users,orders
```

## 📖 使用指南

### 同步模式

#### 1. 集合同步（Collection Sync）

同步一个或多个指定的集合：

```bash
# 同步单个集合
npm run sync -- --db myapp --collections users

# 同步多个集合
npm run sync -- --db myapp --collections users,orders,products
```

#### 2. 数据库同步（Database Sync）

同步整个数据库的所有集合：

```bash
# 同步单个数据库
npm run sync -- --db myapp

# 同步多个数据库
npm run sync -- --databases myapp,analytics,logs
```

#### 3. 实例同步（Instance Sync）

同步整个 MongoDB 实例的所有数据库：

```bash
# 同步所有数据库
npm run sync -- --sync-all --remote-host prod.example.com

# 排除特定数据库
npm run sync -- --sync-all --exclude-databases test,temp
```

#### 4. 增量同步（Incremental Sync）

只同步最近更新的数据：

```bash
# 自动检测本地最新时间戳
npm run sync -- --db myapp --incremental

# 指定起始时间
npm run sync -- --db myapp --incremental --since "2025-01-20"

# 自定义时间戳字段
npm run sync -- --db myapp --incremental --timestamp-field modifiedAt
```

### 高级功能

#### 使用 SSH 隧道连接

从 v2.1 版本开始，支持通过 SSH 隧道连接远程 MongoDB，适用于只能通过跳板机访问的场景。

**方式 1: 使用密码认证**

```javascript
const config = {
    remote: {
        host: "internal-mongodb.example.com",  // MongoDB 内网地址
        port: "27017",
        username: "admin",
        password: "mongo-password",
        database: "myapp",
        
        // SSH 隧道配置
        ssh: {
            host: "jumpserver.example.com",  // SSH 跳板机
            port: 22,
            username: "deployer",
            password: "ssh-password"
        }
    },
    local: { host: "localhost", port: "27017", database: "myapp_dev" },
    mode: "collection",
    collections: ["users"]
};
```

**方式 2: 使用私钥认证**

```javascript
const config = {
    remote: {
        host: "internal-mongodb.example.com",
        port: "27017",
        database: "myapp",
        
        ssh: {
            host: "jumpserver.example.com",
            port: 22,
            username: "deployer",
            privateKey: "/home/user/.ssh/id_rsa",  // 私钥路径
            passphrase: "key-password"              // 可选
        }
    },
    // ...其他配置
};
```

**方式 3: 使用私钥内容**

```javascript
const config = {
    remote: {
        // ...
        ssh: {
            host: "jumpserver.example.com",
            username: "deployer",
            privateKey: `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
-----END RSA PRIVATE KEY-----`
        }
    }
};
```

**运行示例：**

```bash
node examples/sync-with-ssh-tunnel.js
```

**方式 4: 本地数据库也使用SSH隧道**

如果本地数据库也需要通过SSH访问，只需在 `local` 配置中添加 `ssh` 对象：

```javascript
const config = {
    remote: {
        host: "10.0.1.100",
        port: "27017",
        database: "production",
        ssh: {
            host: "remote-bastion.company.com",
            username: "deployer",
            password: "remote_ssh_pass"
        }
    },
    local: {
        host: "10.0.2.50",       // 从本地SSH服务器视角的MongoDB地址
        port: "27017",
        database: "staging",
        ssh: {                    // 添加本地SSH配置
            host: "local-bastion.company.com",
            username: "developer",
            password: "local_ssh_pass"
        }
    },
    mode: "collection",
    collections: ["users"]
};
```

**双向SSH隧道示例：**

```bash
# 查看完整示例
node examples/sync-with-dual-ssh-tunnel.js

# 详细配置说明
cat docs/LOCAL_SSH_CONFIG.md
```

#### 使用过滤条件

只同步符合特定条件的数据：

```bash
# 使用命令行参数
npm run sync -- --db myapp --collections users --filter '{"status":"active"}'
```

或在代码中使用：

```javascript
const { SyncManager, Logger } = require("./src/index");

const config = {
    remote: { 
        host: "prod.example.com", 
        port: "27017", 
        database: "myapp",
        options: {
            directConnection: true  // 直连模式（默认已启用）
        }
    },
    local: { host: "localhost", port: "27017", database: "myapp_dev" },
    mode: "collection",
    collections: ["users"],
    filter: {
        status: "active",
        createdAt: { $gte: new Date("2025-01-01") }
    }
};

const manager = new SyncManager(config, new Logger());
await manager.execute();
```

#### 排除集合和数据库

```bash
# 排除特定集合
npm run sync -- --db myapp --exclude-collections temp,cache

# 排除特定数据库
npm run sync -- --sync-all --exclude-databases test,backup
```

#### 模拟运行

测试配置但不实际写入数据：

```bash
npm run sync -- --db myapp --dry-run
```

## 📚 示例代码

项目提供了完整的使用示例，位于 `examples/` 目录：

```bash
# 查看所有示例
ls examples/

# 运行示例
npm run example:collection    # 同步单个集合
npm run example:database      # 同步多个数据库
npm run example:instance      # 同步整个实例
npm run example:incremental   # 增量同步

# 通过 SSH 隧道同步
node examples/sync-with-ssh-tunnel.js
```

## 🧪 测试

```bash
# 运行所有测试
npm test

# 运行特定测试
npm run test:collection
npm run test:database
npm run test:incremental
```

## 📋 命令行参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| **连接配置** |||
| `--db <name>` | 数据库名称（远程和本地相同） | - |
| `--remote-host <host>` | 远程主机 | localhost |
| `--remote-port <port>` | 远程端口 | 27017 |
| `--remote-user <user>` | 远程用户名 | - |
| `--remote-pass <pass>` | 远程密码 | - |
| `--remote-db <name>` | 远程数据库名 | - |
| `--local-host <host>` | 本地主机 | localhost |
| `--local-port <port>` | 本地端口 | 27017 |
| `--local-db <name>` | 本地数据库名 | - |
| **同步模式** |||
| `--mode <mode>` | 同步模式（collection/database/instance/incremental） | database |
| `--incremental` | 增量同步（快捷方式） | - |
| `--sync-all` | 同步整个实例（快捷方式） | - |
| **同步选项** |||
| `--collections <list>` | 指定集合（逗号分隔） | - |
| `--databases <list>` | 指定数据库（逗号分隔） | - |
| `--exclude-collections <list>` | 排除集合 | - |
| `--exclude-databases <list>` | 排除数据库 | - |
| `--batch-size <size>` | 批量大小 | 1000 |
| `--drop-local` | 删除本地数据 | false |
| `--dry-run` | 模拟运行 | false |
| `--filter <json>` | 过滤条件（JSON） | - |
| **增量同步** |||
| `--timestamp-field <name>` | 时间戳字段 | updatedAt |
| `--since <date>` | 起始时间 | - |
| **其他** |||
| `--verbose, -v` | 详细日志 | false |
| `--silent` | 静默模式 | false |
| `--help, -h` | 显示帮助 | - |

## 📂 项目结构

```
mongodb-sync-tool/
├── src/                        # 源代码
│   ├── index.js               # 主入口
│   ├── config-loader.js       # 配置加载器
│   ├── lib/                   # 核心库
│   │   ├── sync-manager.js    # 同步管理器
│   │   ├── collection-sync.js # 集合同步
│   │   ├── database-sync.js   # 数据库同步
│   │   ├── instance-sync.js   # 实例同步
│   │   └── incremental-sync.js# 增量同步
│   └── utils/                 # 工具函数
│       ├── logger.js          # 日志工具
│       ├── validator.js       # 参数校验
│       ├── uri-builder.js     # URI 构建
│       └── formatter.js       # 格式化工具
├── test/                      # 测试目录
├── examples/                  # 示例目录
├── docs/                      # 文档目录
├── .env.example              # 配置示例
├── package.json              # 项目配置
├── README.md                 # 本文档
├── CHANGELOG.md              # 更新日志
├── STATUS.md                 # 项目状态
└── QUICKSTART.md             # 快速开始

```

## ⚙️ 配置说明

### 环境变量

在 `.env` 文件中配置：

```env
# 注意：远程连接默认启用 directConnection=true（直连模式）
# 远程数据库
REMOTE_HOST=主机地址
REMOTE_PORT=端口号
REMOTE_USER=用户名
REMOTE_PASS=密码
REMOTE_DB=数据库名
REMOTE_AUTH_SOURCE=认证数据库（默认：admin）

# 本地数据库
LOCAL_HOST=主机地址
LOCAL_PORT=端口号
LOCAL_USER=用户名（可选）
LOCAL_PASS=密码（可选）
LOCAL_DB=数据库名
LOCAL_AUTH_SOURCE=认证数据库（默认：admin）

# 同步选项
MODE=同步模式（collection/database/instance/incremental）
COLLECTIONS=集合列表（逗号分隔）
DATABASES=数据库列表（逗号分隔）
EXCLUDE_COLLECTIONS=排除的集合（逗号分隔）
EXCLUDE_DATABASES=排除的数据库（逗号分隔）
BATCH_SIZE=批量大小（默认：1000）
DROP_LOCAL=是否删除本地数据（true/false）
DRY_RUN=是否模拟运行（true/false）

# 增量同步
TIMESTAMP_FIELD=时间戳字段名（默认：updatedAt）
SINCE=起始时间（ISO 格式）

# 过滤条件
FILTER=过滤条件（JSON 字符串）
```

## ⚠️ 注意事项

1. **备份数据**：同步前建议备份重要数据
2. **权限要求**：需要远程读取和本地写入权限
3. **网络连接**：确保能访问远程数据库
4. **生产环境**：慎用 `--drop-local` 参数
5. **密码安全**：不要提交包含密码的 `.env` 文件到代码仓库
6. **大数据量**：数据量大时适当调整 `batch-size`
7. **增量同步**：需要集合有时间戳字段（如 `updatedAt`）

## 🐛 故障排查

### 连接失败
- 检查网络连接和防火墙设置
- 确认主机地址和端口正确
- 检查 MongoDB 服务是否运行

### 认证失败
- 确认用户名和密码正确
- 确认 `authSource` 配置正确
- 确认用户有足够的权限

### 同步速度慢
- 增加 `batch-size` 值（如 2000-5000）
- 检查网络带宽
- 只同步必要的集合
- 考虑使用过滤条件减少数据量

### 内存占用高
- 减小 `batch-size` 值
- 分批同步大集合
- 使用增量同步而非全量同步

## 📈 性能优化建议

1. **批量大小**：根据文档大小调整，小文档可增大至 5000
2. **并发同步**：未来版本将支持并行同步多个集合
3. **网络优化**：使用高带宽网络连接
4. **索引优化**：同步完成后再创建索引
5. **增量同步**：定期使用增量同步而非全量同步

## 📄 文档

- [API 文档](./docs/API.md)
- [SSH 隧道使用指南](./docs/SSH_TUNNEL.md) ⭐ 新增
- [快速开始](./QUICKSTART.md)
- [更新日志](./CHANGELOG.md)
- [项目状态](./STATUS.md)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📜 许可证

MIT License

## 📮 联系方式

如有问题，请提交 Issue 或联系维护者。

---

**版本**: v2.1.0  
**最后更新**: 2025-10-28
