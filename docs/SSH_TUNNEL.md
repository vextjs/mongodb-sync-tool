# SSH 隧道功能说明

## 功能概述

从 v2.1.0 版本开始，mongodb-sync-tool 支持通过 SSH 隧道连接 MongoDB 数据库。这个功能特别适用于以下场景：

- 生产环境 MongoDB 只能通过跳板机访问
- 需要穿透防火墙访问内网数据库
- 安全合规要求使用堡垒机连接
- 开发环境需要连接远程内网数据库

## 技术实现

### 核心依赖
- `tunnel-ssh`: 提供 SSH 隧道核心功能
- `ssh2-promise`: 提供 SSH 连接支持

### 工作原理

```
┌─────────────┐      SSH 隧道       ┌─────────────┐      MongoDB      ┌─────────────┐
│   本地应用   │ ─────────────────> │  跳板机      │ ──────────────> │   MongoDB    │
│  (客户端)   │  localhost:随机端口 │ (SSH Server) │   内网连接       │  (内网地址)  │
└─────────────┘                     └─────────────┘                  └─────────────┘
```

1. 在本地创建 SSH 隧道，监听随机端口
2. 通过 SSH 连接到跳板机
3. 跳板机转发流量到内网 MongoDB
4. 应用通过 localhost:随机端口 连接 MongoDB

## 使用方法

### 方式 1: 密码认证（最简单）

```javascript
const config = {
    remote: {
        host: "internal-mongodb.example.com",  // MongoDB 内网地址
        port: "27017",
        username: "mongo_user",
        password: "mongo_pass",
        database: "myapp",
        
        ssh: {
            host: "jumpserver.example.com",    // SSH 跳板机
            port: 22,                          // SSH 端口
            username: "deployer",              // SSH 用户名
            password: "ssh_password"           // SSH 密码
        }
    },
    local: { host: "localhost", port: "27017", database: "myapp_dev" },
    mode: "collection",
    collections: ["users"]
};
```

### 方式 2: 私钥文件认证（推荐）

```javascript
const config = {
    remote: {
        // ...MongoDB 配置
        ssh: {
            host: "jumpserver.example.com",
            port: 22,
            username: "deployer",
            privateKey: "/home/user/.ssh/id_rsa",  // 私钥路径
            passphrase: "key_password"             // 私钥密码（可选）
        }
    },
    // ...其他配置
};
```

### 方式 3: 私钥内容认证

```javascript
const fs = require("fs");
const privateKeyContent = fs.readFileSync("/path/to/key", "utf8");

const config = {
    remote: {
        // ...MongoDB 配置
        ssh: {
            host: "jumpserver.example.com",
            username: "deployer",
            privateKey: privateKeyContent  // 直接传入私钥内容
        }
    },
    // ...其他配置
};
```

### 方式 4: 本地数据库也使用 SSH

```javascript
const config = {
    remote: {
        host: "remote-mongodb.example.com",
        port: "27017",
        database: "myapp",
        ssh: { /* SSH 配置 */ }
    },
    local: {
        host: "local-mongodb.example.com",
        port: "27017",
        database: "myapp_dev",
        ssh: {
            host: "local-jumpserver.example.com",
            username: "deployer",
            password: "ssh_pass"
        }
    },
    mode: "collection",
    collections: ["users"]
};
```

## 配置参数说明

### SSH 配置对象

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `host` | String | ✅ | SSH 服务器地址 |
| `port` | Number | ❌ | SSH 端口，默认 22 |
| `username` | String | ✅ | SSH 用户名 |
| `password` | String | 条件必填* | SSH 密码 |
| `privateKey` | String | 条件必填* | 私钥路径或内容 |
| `passphrase` | String | ❌ | 私钥密码（私钥加密时需要） |

\* `password` 和 `privateKey` 至少提供一个

## 完整示例

```javascript
const { SyncManager, Logger } = require("mongodb-sync-tool");

async function syncWithSsh() {
    const config = {
        // 远程数据库 + SSH 隧道
        remote: {
            host: "10.0.1.100",              // MongoDB 内网 IP
            port: "27017",
            username: "admin",
            password: "mongo_secret",
            database: "production_db",
            authSource: "admin",
            options: {
                directConnection: true
            },
            
            // SSH 隧道配置
            ssh: {
                host: "bastion.company.com",  // 堡垒机地址
                port: 22,
                username: "deploy_user",
                privateKey: "/home/user/.ssh/production_key",
                passphrase: "key_password"
            }
        },
        
        // 本地数据库
        local: {
            host: "localhost",
            port: "27017",
            database: "dev_db"
        },
        
        // 同步配置
        mode: "collection",
        collections: ["users", "orders", "products"],
        batchSize: 1000,
        dropLocal: true,
        dryRun: false
    };

    const logger = new Logger({ verbose: true });
    const manager = new SyncManager(config, logger);

    try {
        console.log("开始通过 SSH 隧道同步数据...\n");
        const result = await manager.execute();
        
        if (result.success) {
            console.log("\n✅ 同步完成！");
            console.log(JSON.stringify(result, null, 2));
        } else {
            console.error("\n❌ 同步失败！");
            console.error(result.error);
        }
    } catch (error) {
        console.error("\n💥 发生错误:", error.message);
        console.error(error.stack);
    }
}

syncWithSsh();
```

## 运行示例

```bash
# 运行官方示例
node examples/sync-with-ssh-tunnel.js

# 运行测试
npm run test:ssh
```

## 常见问题

### 1. SSH 连接超时

**原因**: 网络问题或 SSH 服务器无法访问

**解决方案**:
```bash
# 测试 SSH 连接
ssh -p 22 username@jumpserver.example.com

# 检查网络和防火墙设置
ping jumpserver.example.com
```

### 2. 私钥权限错误

**错误信息**: `EACCES: permission denied` 或 `bad permissions`

**解决方案**:
```bash
# 修改私钥文件权限
chmod 600 ~/.ssh/id_rsa
```

### 3. MongoDB 连接被拒绝

**原因**: SSH 隧道创建成功，但 MongoDB 连接失败

**检查项**:
- MongoDB 地址是否正确（从跳板机视角）
- MongoDB 是否允许跳板机 IP 访问
- MongoDB 认证信息是否正确

### 4. 内存占用过高

**原因**: 大量数据通过隧道传输

**解决方案**:
```javascript
// 减小批量大小
config.batchSize = 500;

// 或分批同步
config.collections = ["users"];  // 先同步一个集合
```

### 5. 隧道意外断开

**解决方案**: 工具会自动清理资源，重新运行即可

## 安全建议

### ✅ 推荐做法
- 使用私钥认证，避免密码认证
- 私钥文件设置严格权限 (600)
- 不要在代码中硬编码密码
- 使用环境变量或配置文件管理敏感信息
- 定期轮换 SSH 密钥

### ❌ 避免做法
- 不要将私钥提交到代码仓库
- 不要使用弱密码
- 不要在生产环境使用明文密码
- 不要将配置文件提交到公开仓库

### 示例：使用环境变量

```javascript
// .env 文件
SSH_HOST=jumpserver.example.com
SSH_USER=deployer
SSH_PASS=secret
SSH_KEY=/path/to/key

// 代码中读取
require("dotenv").config();

const config = {
    remote: {
        // ...
        ssh: {
            host: process.env.SSH_HOST,
            username: process.env.SSH_USER,
            password: process.env.SSH_PASS,
            privateKey: process.env.SSH_KEY
        }
    }
};
```

## 性能考虑

### 带宽限制
SSH 隧道会受网络带宽影响，建议：
- 非高峰期执行大批量同步
- 适当调整 `batchSize` 参数
- 使用过滤条件减少数据量

### 延迟影响
跨地域隧道延迟较高，建议：
- 增量同步优于全量同步
- 分批次同步大集合
- 考虑在跳板机上运行工具

## 技术限制

1. **并发连接**: 每次同步只创建一个 SSH 隧道
2. **隧道端口**: 自动分配随机端口，无需手动配置
3. **超时设置**: 默认 30 秒连接超时
4. **重连机制**: 暂不支持自动重连，需手动重试

## 下一步

- 查看 [完整 API 文档](./API.md)
- 参考 [示例代码](../examples/)
- 阅读 [快速开始指南](../QUICKSTART.md)

