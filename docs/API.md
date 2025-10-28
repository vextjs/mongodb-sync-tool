# API 文档

## 配置对象

### 数据库连接配置

#### 远程数据库配置 (remote)

```javascript
{
    host: "prod.example.com",     // 主机地址
    port: "27017",                // 端口号
    username: "admin",            // 用户名（可选）
    password: "secret",           // 密码（可选）
    database: "mydb",             // 数据库名（可选）
    authSource: "admin",          // 认证数据库（默认：admin）
    options: {                    // 连接选项（可选）
        directConnection: true    // 直连模式（v2.0+ 默认启用）
    },
    
    // SSH 隧道配置（可选，v2.1+）
    ssh: {
        host: "jumpserver.example.com",  // SSH 主机地址
        port: 22,                        // SSH 端口（默认 22）
        username: "deployer",            // SSH 用户名
        password: "ssh-password",        // SSH 密码（可选）
        privateKey: "/path/to/key",      // SSH 私钥路径或内容（可选）
        passphrase: "key-passphrase"     // 私钥密码（可选）
    }
}
```

**重要说明：**
- `directConnection: true` - 从 v2.0 版本开始，远程数据库默认启用直连模式
- 直连模式适用于单节点 MongoDB，可以避免副本集相关的连接问题
- 如果连接副本集，请设置 `directConnection: false` 或不设置 options
- **SSH 隧道** - 从 v2.1 版本开始支持 SSH 隧道，适用于只能通过跳板机访问的场景
  - SSH 认证支持密码认证和私钥认证两种方式
  - `privateKey` 可以是文件路径，也可以是私钥内容字符串
  - 使用私钥认证时，`password` 参数可省略

#### 本地数据库配置 (local)

```javascript
{
    host: "localhost",            // 主机地址
    port: "27017",                // 端口号
    username: "",                 // 用户名（可选）
    password: "",                 // 密码（可选）
    database: "mydb_dev",         // 数据库名（可选）
    authSource: "admin",          // 认证数据库（默认：admin）
    
    // SSH 隧道配置（可选，v2.1+）
    ssh: {                        // 配置同 remote.ssh
        host: "jumpserver.example.com",
        port: 22,
        username: "deployer",
        password: "ssh-password"
    }
}
```

### 完整配置示例

```javascript
const config = {
    // 远程数据库
    remote: {
        host: "prod.example.com",
        port: "27017",
        username: "admin",
        password: "secret",
        database: "myapp",
        authSource: "admin",
        options: {
            directConnection: true  // 默认启用
        }
    },
    
    // 本地数据库
    local: {
        host: "localhost",
        port: "27017",
        database: "myapp_dev"
    },
    
    // 同步模式
    mode: "collection",           // collection | database | instance | incremental
    
    // 集合和数据库
    collections: ["users"],       // 指定集合列表
    databases: ["db1", "db2"],    // 指定数据库列表
    excludeCollections: ["temp"], // 排除集合
    excludeDatabases: ["test"],   // 排除数据库
    
    // 同步选项
    batchSize: 1000,              // 批量大小
    dropLocal: false,             // 是否删除本地数据
    dryRun: false,                // 模拟运行
    
    // 过滤条件
    filter: { status: "active" }, // MongoDB 查询条件
    
    // 增量同步选项
    timestampField: "updatedAt",  // 时间戳字段
    since: "2025-01-20"           // 起始时间
};
```

---

## 核心类

### SyncManager

同步管理器，统一管理各种同步模式。

#### 构造函数

```javascript
new SyncManager(config, logger)
```

**参数：**
- `config` (Object) - 配置对象
- `logger` (Logger) - 日志实例

#### 方法

##### execute()

执行同步操作。

```javascript
const result = await manager.execute();
```

**返回：** Promise<Object> - 同步结果

**结果对象：**
```javascript
{
    mode: "collection|database|instance|incremental",
    success: true|false,
    totalCount: 12345,  // 总记录数
    time: 10.5,         // 耗时（秒）
    // ... 其他字段根据模式而定
}
```

---

### CollectionSync

集合同步类。

#### 构造函数

```javascript
new CollectionSync(options)
```

**选项：**
```javascript
{
    logger: Logger,      // 日志实例
    batchSize: 1000,    // 批量大小
    dropLocal: false,   // 是否删除本地数据
    dryRun: false,      // 是否模拟运行
    filter: {}          // 过滤条件
}
```

#### 方法

##### sync(remoteDb, localDb, collectionName)

同步单个集合。

```javascript
const result = await collectionSync.sync(remoteDb, localDb, "users");
```

**返回：**
```javascript
{
    collection: "users",
    count: 1000,
    time: 2.5,
    speed: 400,  // docs/s
    success: true
}
```

---

### DatabaseSync

数据库同步类。

#### 构造函数

```javascript
new DatabaseSync(options)
```

**选项：**
```javascript
{
    logger: Logger,
    batchSize: 1000,
    dropLocal: false,
    dryRun: false,
    collections: [],           // 指定集合列表
    excludeCollections: [],    // 排除集合列表
    filter: {}
}
```

#### 方法

##### syncDatabase(remoteClient, localClient, databaseName)

同步单个数据库。

```javascript
const result = await databaseSync.syncDatabase(
    remoteClient,
    localClient,
    "mydb"
);
```

##### syncDatabases(remoteClient, localClient, databaseNames)

同步多个数据库。

```javascript
const result = await databaseSync.syncDatabases(
    remoteClient,
    localClient,
    ["db1", "db2", "db3"]
);
```

---

### InstanceSync

实例同步类（所有数据库）。

#### 构造函数

```javascript
new InstanceSync(options)
```

**选项：**
```javascript
{
    logger: Logger,
    batchSize: 1000,
    dropLocal: false,
    dryRun: false,
    excludeDatabases: [],  // 排除的数据库
    filter: {}
}
```

#### 方法

##### syncInstance(remoteClient, localClient)

同步整个实例。

```javascript
const result = await instanceSync.syncInstance(remoteClient, localClient);
```

---

### IncrementalSync

增量同步类。

#### 构造函数

```javascript
new IncrementalSync(options)
```

**选项：**
```javascript
{
    logger: Logger,
    batchSize: 1000,
    dryRun: false,
    timestampField: "updatedAt",  // 时间戳字段
    since: Date | string          // 起始时间
}
```

#### 方法

##### sync(remoteDb, localDb, collectionName)

增量同步集合。

```javascript
const result = await incrementalSync.sync(remoteDb, localDb, "users");
```

**返回：**
```javascript
{
    collection: "users",
    count: 150,
    inserted: 50,   // 新增记录数
    updated: 100,   // 更新记录数
    time: 1.2,
    success: true
}
```

---

## 工具类

### Logger

日志工具类。

#### 构造函数

```javascript
new Logger(options)
```

**选项：**
```javascript
{
    silent: false,   // 静默模式
    verbose: false   // 详细模式
}
```

#### 方法

```javascript
logger.info("信息")
logger.success("成功")
logger.warn("警告")
logger.error("错误")
logger.debug("调试信息")
logger.progress("进度信息")
logger.section("章节标题")
```

---

### Validator

参数校验工具。

#### 静态方法

##### validateConfig(config)

校验配置对象。

```javascript
const result = Validator.validateConfig(config);
// { valid: true|false, errors: [] }
```

##### validateCollectionName(name)

校验集合名称。

```javascript
const isValid = Validator.validateCollectionName("users");
```

##### validateDatabaseName(name)

校验数据库名称。

```javascript
const isValid = Validator.validateDatabaseName("mydb");
```

---

### UriBuilder

URI 构建工具。

#### 静态方法

##### build(config)

构建 MongoDB URI。

```javascript
const uri = UriBuilder.build({
    host: "localhost",
    port: "27017",
    username: "admin",
    password: "secret",
    database: "mydb",
    authSource: "admin",
    options: {
        directConnection: true,  // 直连模式
        ssl: false               // 其他连接选项
    }
});
// mongodb://admin:secret@localhost:27017/mydb?authSource=admin&directConnection=true&ssl=false
```

**参数说明：**
- `host` (string) - 主机地址
- `port` (string) - 端口号
- `username` (string, 可选) - 用户名
- `password` (string, 可选) - 密码
- `database` (string, 可选) - 数据库名
- `authSource` (string, 可选) - 认证数据库，默认 "admin"
- `options` (Object, 可选) - 额外的连接选项
  - `directConnection` (boolean) - 直连模式，适用于单节点 MongoDB
  - `ssl` (boolean) - 启用 SSL/TLS
  - 其他 MongoDB 连接选项...
```

##### maskPassword(uri)

隐藏 URI 中的密码（用于日志）。

```javascript
const masked = UriBuilder.maskPassword("mongodb://user:pass@host:27017/db");
// mongodb://user:****@host:27017/db
```

##### parse(uri)

解析 URI。

```javascript
const config = UriBuilder.parse("mongodb://user:pass@host:27017/db");
```

---

### Formatter

格式化工具。

#### 静态方法

##### formatNumber(num)

格式化数字（千分位）。

```javascript
Formatter.formatNumber(1234567);  // "1,234,567"
```

##### formatBytes(bytes)

格式化字节大小。

```javascript
Formatter.formatBytes(1024);  // "1 KB"
```

##### formatDuration(seconds)

格式化时间。

```javascript
Formatter.formatDuration(125);  // "2m 5s"
```

##### formatPercentage(current, total)

格式化百分比。

```javascript
Formatter.formatPercentage(50, 100);  // "50%"
```

##### formatSpeed(count, seconds)

格式化速度。

```javascript
Formatter.formatSpeed(1000, 2);  // "500 docs/s"
```

##### createProgressBar(current, total, width)

创建进度条。

```javascript
Formatter.createProgressBar(50, 100, 30);
// "[===============               ]"
```

---

## 配置对象结构

完整的配置对象结构：

```javascript
const config = {
    // 远程数据库配置
    remote: {
        host: "prod.example.com",
        port: "27017",
        username: "admin",
        password: "secret",
        database: "mydb",
        authSource: "admin"
    },

    // 本地数据库配置
    local: {
        host: "localhost",
        port: "27017",
        username: "",
        password: "",
        database: "mydb_dev",
        authSource: "admin"
    },

    // 同步模式：collection | database | instance | incremental
    mode: "database",

    // 集合列表（仅 collection 和 database 模式）
    collections: ["users", "orders"],

    // 数据库列表（仅 database 模式）
    databases: ["db1", "db2"],

    // 排除的集合
    excludeCollections: ["temp", "cache"],

    // 排除的数据库（仅 instance 模式）
    excludeDatabases: ["test", "backup"],

    // 同步选项
    batchSize: 1000,        // 批量大小
    dropLocal: false,       // 是否删除本地数据
    dryRun: false,          // 是否模拟运行
    verbose: false,         // 是否显示详细日志
    silent: false,          // 是否静默模式

    // 过滤条件（MongoDB 查询对象）
    filter: {
        status: "active",
        createdAt: { $gte: new Date("2025-01-01") }
    },

    // 增量同步选项（仅 incremental 模式）
    timestampField: "updatedAt",
    since: new Date("2025-01-20")
};
```

---

## 使用示例

### 基本使用

```javascript
const { SyncManager, Logger } = require("./src/index");

const config = {
    remote: {
        host: "prod.example.com",
        port: "27017",
        database: "mydb"
    },
    local: {
        host: "localhost",
        port: "27017",
        database: "mydb_dev"
    },
    mode: "database"
};

const logger = new Logger({ verbose: true });
const manager = new SyncManager(config, logger);

const result = await manager.execute();
console.log(result);
```

### 高级使用

```javascript
// 增量同步，带过滤条件
const config = {
    remote: { ... },
    local: { ... },
    mode: "incremental",
    collections: ["users"],
    timestampField: "updatedAt",
    since: "2025-01-20T00:00:00Z",
    filter: {
        status: "active"
    },
    batchSize: 2000,
    verbose: true
};

const manager = new SyncManager(config, new Logger());
await manager.execute();
```

---

## 错误处理

所有异步方法都可能抛出错误，建议使用 try-catch：

```javascript
try {
    const result = await manager.execute();
    if (result.success) {
        console.log("同步成功");
    } else {
        console.error("同步失败", result.error);
    }
} catch (error) {
    console.error("发生错误", error.message);
}
```

---

## 事件和回调

目前版本不支持事件和回调，计划在未来版本中添加。

---

## 性能建议

1. **批量大小**：根据文档大小调整 `batchSize`
   - 小文档（<1KB）：2000-5000
   - 中等文档（1-10KB）：1000-2000
   - 大文档（>10KB）：100-500

2. **并发控制**：单个同步任务是串行的，未来将支持并发

3. **内存管理**：使用流式处理，内存占用与批量大小相关

---

**最后更新**: 2025-01-21
