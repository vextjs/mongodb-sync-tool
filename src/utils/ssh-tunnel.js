/**
 * SSH 隧道管理工具
 * 支持通过 SSH 隧道安全连接到远程 MongoDB
 */

const { createTunnel } = require("tunnel-ssh");

class SshTunnel {
    constructor(logger) {
        this.logger = logger;
        this.tunnel = null;
        this.localPort = null;
    }

    /**
     * 创建 SSH 隧道
     * @param {Object} sshConfig - SSH 配置
     * @param {string} sshConfig.host - SSH 主机地址
     * @param {number} sshConfig.port - SSH 端口（默认 22）
     * @param {string} sshConfig.username - SSH 用户名
     * @param {string} sshConfig.password - SSH 密码（可选）
     * @param {string} sshConfig.privateKey - SSH 私钥路径或内容（可选）
     * @param {string} sshConfig.passphrase - 私钥密码（可选）
     * @param {string} targetHost - MongoDB 目标主机（从 SSH 服务器视角）
     * @param {number} targetPort - MongoDB 目标端口
     * @param {number} localPort - 本地监听端口（可选，默认随机）
     * @returns {Promise<Object>} 隧道信息 { localHost, localPort }
     */
    async create(sshConfig, targetHost, targetPort, localPort = 0) {
        if (!sshConfig || !sshConfig.host || !sshConfig.username) {
            throw new Error("SSH 配置不完整，需要 host 和 username");
        }

        if (!targetHost || !targetPort) {
            throw new Error("MongoDB 目标地址不完整");
        }

        // 验证认证方式
        if (!sshConfig.password && !sshConfig.privateKey) {
            throw new Error(
                "SSH 认证失败：需要提供 password 或 privateKey"
            );
        }

        // 构建 SSH 配置
        const tunnelConfig = {
            autoClose: false,
            host: sshConfig.host,
            port: sshConfig.port || 22,
            username: sshConfig.username,
            dstHost: targetHost,
            dstPort: targetPort,
            localHost: "127.0.0.1",
            localPort: localPort,
        };

        // 添加认证信息
        if (sshConfig.password) {
            tunnelConfig.password = sshConfig.password;
        }

        if (sshConfig.privateKey) {
            const fs = require("fs");
            const path = require("path");

            // 判断是文件路径还是密钥内容
            if (
                sshConfig.privateKey.includes("-----BEGIN") ||
                !sshConfig.privateKey.includes("/")
            ) {
                tunnelConfig.privateKey = sshConfig.privateKey;
            } else {
                // 读取私钥文件
                const keyPath = path.resolve(sshConfig.privateKey);
                if (!fs.existsSync(keyPath)) {
                    throw new Error(`SSH 私钥文件不存在: ${keyPath}`);
                }
                tunnelConfig.privateKey = fs.readFileSync(keyPath, "utf8");
            }

            if (sshConfig.passphrase) {
                tunnelConfig.passphrase = sshConfig.passphrase;
            }
        }

        try {
            this.logger?.info(
                `正在创建 SSH 隧道: ${sshConfig.username}@${sshConfig.host}:${sshConfig.port || 22}`
            );
            this.logger?.info(
                `目标地址: ${targetHost}:${targetPort}`
            );

            // 调试信息
            this.logger?.debug(`SSH隧道配置:`);
            this.logger?.debug(`  - SSH服务器: ${tunnelConfig.host}:${tunnelConfig.port}`);
            this.logger?.debug(`  - 用户名: ${tunnelConfig.username}`);
            this.logger?.debug(`  - 认证方式: ${tunnelConfig.password ? '密码' : '私钥'}`);
            this.logger?.debug(`  - 目标地址: ${tunnelConfig.dstHost}:${tunnelConfig.dstPort}`);
            this.logger?.debug(`  - 本地监听: ${tunnelConfig.localHost}:${tunnelConfig.localPort || '随机'}`);

            // 创建隧道
            const [server, connection] = await createTunnel(
                tunnelConfig,
                null,
                (server, connection) => [server, connection]
            );

            this.tunnel = { server, connection };
            this.localPort = server.address().port;

            this.logger?.success(
                `SSH 隧道创建成功，本地端口: ${this.localPort}`
            );

            return {
                localHost: "127.0.0.1",
                localPort: this.localPort,
            };
        } catch (error) {
            const errorMsg = error.message || error.toString() || "未知错误";
            const errorCode = error.code ? ` (${error.code})` : "";
            this.logger?.error(`SSH 隧道创建失败: ${errorMsg}${errorCode}`);

            // 输出更详细的调试信息
            if (error.level) {
                this.logger?.error(`错误级别: ${error.level}`);
            }
            if (error.code === "ECONNREFUSED") {
                this.logger?.error("提示: SSH服务器拒绝连接，请检查：");
                this.logger?.error("  1. SSH服务器地址和端口是否正确");
                this.logger?.error("  2. 网络连接是否正常");
                this.logger?.error("  3. 防火墙是否允许连接");
            } else if (error.code === "ENOTFOUND") {
                this.logger?.error("提示: 无法解析主机名，请检查SSH服务器地址");
            } else if (error.code === "ETIMEDOUT") {
                this.logger?.error("提示: 连接超时，请检查网络和防火墙设置");
            }

            throw error;
        }
    }

    /**
     * 关闭 SSH 隧道
     */
    async close() {
        if (!this.tunnel) {
            return;
        }

        try {
            this.logger?.info("正在关闭 SSH 隧道...");

            if (this.tunnel.connection) {
                this.tunnel.connection.end();
            }

            if (this.tunnel.server) {
                await new Promise((resolve) => {
                    this.tunnel.server.close(() => resolve());
                });
            }

            this.tunnel = null;
            this.localPort = null;

            this.logger?.success("SSH 隧道已关闭");
        } catch (error) {
            this.logger?.error(`关闭 SSH 隧道时出错: ${error.message}`);
            throw error;
        }
    }

    /**
     * 获取本地端口
     */
    getLocalPort() {
        return this.localPort;
    }

    /**
     * 检查隧道是否活跃
     */
    isActive() {
        return this.tunnel !== null && this.localPort !== null;
    }
}

module.exports = SshTunnel;

