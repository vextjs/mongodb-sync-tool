# 本地数据库 SSH 隧道配置指南

## 使用场景

当本地数据库也需要通过 SSH 隧道访问时（例如：本地数据库在另一个服务器上，需要通过跳板机访问），你可以为 `local` 配置添加 `ssh` 选项。

---

## 配置方式

### 方案 1: 本地直连 + 远程SSH（最常见）

```javascript
const config = {
    remote: {
        host: "127.0.0.1",       // 远程MongoDB（从SSH服务器视角）
        port: "27017",
        database: "mydb",
        ssh: {
            host: "remote-ssh.example.com",
            port: 22,
            username: "user",
            password: "pass"
        }
    },
    local: {
        host: "localhost",        // 本地MongoDB直连
        port: "27017",
        database: "mydb"
        // 无需 ssh 配置
    }
};
```

**适用场景**: 远程数据库需要SSH，本地数据库在当前机器上

---

### 方案 2: 双向SSH隧道

```javascript
const config = {
    remote: {
        host: "10.0.1.100",      // 远程MongoDB（从远程SSH服务器视角）
        port: "27017",
        database: "prod_db",
        ssh: {
            host: "remote-ssh.example.com",
            port: 22,
            username: "remote_user",
            password: "remote_pass"
        }
    },
    local: {
        host: "10.0.2.50",       // 本地MongoDB（从本地SSH服务器视角）
        port: "27017",
        database: "dev_db",
        ssh: {
            host: "local-ssh.example.com",
            port: 22,
            username: "local_user",
            password: "local_pass"
        }
    }
};
```

**适用场景**: 两边数据库都需要通过SSH访问

---

## 详细配置说明

### 本地数据库 SSH 配置参数

```javascript
local: {
    host: "mongodb-host",        // MongoDB地址（从SSH服务器视角）
    port: "27017",               // MongoDB端口
    username: "mongo_user",      // MongoDB用户名（可选）
    password: "mongo_pass",      // MongoDB密码（可选）
    database: "dbname",          // 数据库名
    authSource: "admin",         // 认证数据库（可选，默认admin）
    
    // SSH 隧道配置
    ssh: {
        host: "ssh-server",      // SSH服务器地址
        port: 22,                // SSH端口（默认22）
        username: "ssh_user",    // SSH用户名
        
        // 认证方式1: 密码
        password: "ssh_pass"
        
        // 认证方式2: 私钥文件
        // privateKey: "/path/to/key",
        // passphrase: "key_password"  // 如果私钥有密码
        
        // 认证方式3: 私钥内容
        // privateKey: "-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
    }
}
```

---

## 工作原理

### 单向SSH（远程）
```
本地应用 ──直连──> 本地MongoDB
         ──SSH隧道──> 远程MongoDB
```

### 双向SSH
```
本地应用 ──SSH隧道1──> 本地MongoDB
         ──SSH隧道2──> 远程MongoDB
```

**执行流程**:
1. 创建远程SSH隧道 → 127.0.0.1:随机端口1
2. 创建本地SSH隧道 → 127.0.0.1:随机端口2
3. 通过两个本地端口分别连接远程和本地MongoDB
4. 执行数据同步
5. 关闭所有隧道和连接

---

## 实际示例

### 示例1: 本地MongoDB在另一台服务器

```javascript
// 场景: 本地测试环境的MongoDB在测试服务器上
const config = {
    remote: {
        host: "127.0.0.1",
        port: "27017",
        database: "production",
        ssh: {
            host: "prod-jumpserver.company.com",
            port: 22,
            username: "deploy",
            password: "prod_ssh_pass"
        }
    },
    local: {
        host: "192.168.1.100",    // 测试服务器内网IP
        port: "27017",
        database: "test",
        ssh: {
            host: "test-jumpserver.company.com",
            port: 22,
            username: "tester",
            password: "test_ssh_pass"
        }
    },
    mode: "collection",
    collections: ["users"]
};
```

### 示例2: 使用私钥认证

```javascript
const config = {
    remote: {
        host: "10.0.1.50",
        port: "27017",
        database: "myapp",
        ssh: {
            host: "bastion1.company.com",
            username: "deployer",
            privateKey: "/home/user/.ssh/prod_key",
            passphrase: "key_password"
        }
    },
    local: {
        host: "10.0.2.100",
        port: "27017",
        database: "myapp_staging",
        ssh: {
            host: "bastion2.company.com",
            username: "developer",
            privateKey: "/home/user/.ssh/staging_key"
            // 如果私钥没有密码，不需要passphrase
        }
    },
    mode: "database",
    batchSize: 2000
};
```

---

## 运行示例

```bash
# 查看双向SSH隧道示例
cat examples/sync-with-dual-ssh-tunnel.js

# 修改配置后运行
node examples/sync-with-dual-ssh-tunnel.js
```

---

## 注意事项

### 1. 主机地址说明
- **remote.host**: 从远程SSH服务器的视角看MongoDB的地址
  - 如果MongoDB和SSH在同一台机器: `127.0.0.1` 或 `localhost`
  - 如果MongoDB在SSH服务器可访问的内网: 使用内网IP

- **local.host**: 从本地SSH服务器的视角看MongoDB的地址
  - 同样遵循上述规则

### 2. 端口冲突
工具会自动分配本地随机端口，无需担心端口冲突。

### 3. 性能考虑
- 双向SSH会增加网络延迟
- 建议在网络条件好的环境执行
- 可以适当调整 `batchSize` 参数优化性能

### 4. 安全建议
- 优先使用私钥认证，避免密码认证
- 私钥文件权限应设置为 600
- 不要将包含真实凭证的文件提交到代码仓库
- 使用环境变量或配置文件管理敏感信息

### 5. 故障排查
如果SSH隧道失败，检查：
- SSH服务器地址和端口是否正确
- SSH用户名和密码是否正确
- MongoDB地址是否正确（注意是从SSH服务器视角）
- 网络连接是否正常
- 防火墙是否允许SSH连接

---

## 环境变量配置（推荐）

为了安全，建议使用环境变量：

```javascript
// .env 文件
REMOTE_SSH_HOST=remote-ssh.example.com
REMOTE_SSH_USER=deployer
REMOTE_SSH_PASS=secret1

LOCAL_SSH_HOST=local-ssh.example.com
LOCAL_SSH_USER=developer
LOCAL_SSH_PASS=secret2

// 代码中
require('dotenv').config();

const config = {
    remote: {
        // ...
        ssh: {
            host: process.env.REMOTE_SSH_HOST,
            username: process.env.REMOTE_SSH_USER,
            password: process.env.REMOTE_SSH_PASS
        }
    },
    local: {
        // ...
        ssh: {
            host: process.env.LOCAL_SSH_HOST,
            username: process.env.LOCAL_SSH_USER,
            password: process.env.LOCAL_SSH_PASS
        }
    }
};
```

---

## 测试连接

在正式同步前，可以使用测试工具验证SSH连接：

```bash
# 测试SSH连接
node examples/test-ssh-connection.js
```

---

## 更多帮助

- 查看完整文档: [docs/SSH_TUNNEL.md](../docs/SSH_TUNNEL.md)
- 查看API文档: [docs/API.md](../docs/API.md)
- 查看快速参考: [docs/SSH_QUICK_REF.md](../docs/SSH_QUICK_REF.md)

