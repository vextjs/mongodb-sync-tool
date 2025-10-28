# Changelog

所有重要的变更都将记录在这个文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### 计划中
- [ ] 支持并行同步多个集合
- [ ] 支持断点续传
- [ ] 支持数据压缩传输
- [ ] Web UI 界面

## [2.1.0] - 2025-10-28

### 新增
- ✅ 支持 SSH 隧道连接 MongoDB
  - 支持密码认证
  - 支持私钥认证
  - 支持私钥密码保护
  - 远程和本地数据库均可使用 SSH 隧道
  - 双向SSH隧道支持（同时为远程和本地配置SSH）
- ✅ 新增 `SshTunnel` 工具类（基于 tunnel-ssh）
- ✅ 新增 `SshTunnelV2` 工具类（基于 ssh2，更稳定）
- ✅ 新增 SSH 隧道使用示例
  - `examples/sync-with-ssh-tunnel.js` - 单向SSH隧道示例
  - `examples/sync-with-dual-ssh-tunnel.js` - 双向SSH隧道示例
  - `examples/test-real-ssh.js` - 实际环境测试脚本
  - `examples/test-ssh-connection.js` - SSH连接测试工具

### 改进
- ✅ 优化 `SyncManager` 连接逻辑，自动处理 SSH 隧道
- ✅ 增强错误处理，自动清理 SSH 隧道资源
- ✅ 改进SSH连接错误提示，提供详细的故障排查建议
- ✅ 使用 ssh2 库重新实现SSH隧道，提升稳定性和可靠性

### 依赖
- ✅ 新增 `tunnel-ssh` - SSH 隧道核心库
- ✅ 新增 `ssh2-promise` - SSH 连接支持
- ✅ 新增 `ssh2` - 更底层的SSH实现（通过依赖自动安装）

### 文档
- ✅ 更新 README.md 添加 SSH 隧道使用说明
- ✅ 更新 API.md 添加 SSH 配置参数说明
- ✅ 新增 `docs/SSH_TUNNEL.md` - 完整的SSH隧道使用指南
- ✅ 新增 `docs/LOCAL_SSH_CONFIG.md` - 本地数据库SSH隧道配置指南
- ✅ 新增 `docs/SSH_QUICK_REF.md` - SSH快速参考
- ✅ 更新 QUICKSTART.md 添加SSH隧道场景
- ✅ 新增详细的使用示例和三种认证方式说明

### 测试
- ✅ 新增 SSH 隧道单元测试 (`test/ssh-tunnel.test.js`)
- ✅ 实际环境测试通过（成功同步72条记录）
- ✅ 验证了密码认证和私钥认证方式

## [2.0.1] - 2025-10-21

### 改进
- ✅ 远程数据库连接默认启用 `directConnection=true` 参数
- ✅ 优化单节点 MongoDB 的连接稳定性
- ✅ 更新所有示例代码，添加 options 配置说明
- ✅ 完善 API 文档中的配置对象说明

### 文档
- ✅ 在所有示例文件中添加 `directConnection` 配置注释
- ✅ 更新 README.md 配置说明
- ✅ 更新 API.md 添加完整的连接配置文档

## [2.0.0] - 2025-01-21

### 新增
- ✅ 支持集合级别同步
- ✅ 支持数据库级别同步
- ✅ 支持实例级别同步（所有数据库）
- ✅ 支持增量同步（基于时间戳字段）
- ✅ 支持过滤条件同步
- ✅ 支持排除特定集合和数据库
- ✅ 完整的测试覆盖
- ✅ 详细的使用示例
- ✅ 模块化代码结构
- ✅ 详细的进度显示和日志
- ✅ 自动同步索引
- ✅ 批量优化性能
- ✅ 错误容错机制
- ✅ 模拟运行（dry-run）模式

### 改进
- ✅ 重构为模块化架构
- ✅ 改进日志输出格式
- ✅ 增强参数校验
- ✅ 优化内存使用
- ✅ 提升同步速度

### 文档
- ✅ 完整的 README
- ✅ API 文档
- ✅ 快速开始指南
- ✅ 使用示例

## [1.0.0] - 2025-01-20

### Added
- 初始版本
- 基本的集合同步功能
- 环境变量配置
- 命令行参数支持
