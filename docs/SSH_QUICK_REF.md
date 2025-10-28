# SSH 隧道快速参考

## 基本配置

```javascript
const config = {
    remote: {
        host: "internal-mongodb",  // MongoDB 内网地址
        port: "27017",
        database: "mydb",
        
        ssh: {
            host: "jumpserver",    // SSH 跳板机
            username: "deployer",
            password: "pass"       // 或使用 privateKey
        }
    },
    local: { host: "localhost", port: "27017", database: "mydb" },
    mode: "collection",
    collections: ["users"]
};
```

## 三种认证方式

### 1. 密码认证
```javascript
ssh: {
    host: "jumpserver.com",
    username: "user",
    password: "password"
}
```

### 2. 私钥文件
```javascript
ssh: {
    host: "jumpserver.com",
    username: "user",
    privateKey: "/path/to/key",
    passphrase: "optional"
}
```

### 3. 私钥内容
```javascript
ssh: {
    host: "jumpserver.com",
    username: "user",
    privateKey: "-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
}
```

## 运行示例

```bash
node examples/sync-with-ssh-tunnel.js
```

## 完整文档

详见：`docs/SSH_TUNNEL.md`

