/**
 * SSH 隧道管理工具 - 使用 ssh2 实现
 * 更可靠的SSH隧道实现
 */

const { Client } = require("ssh2");
const net = require("net");

class SshTunnelV2 {
    constructor(logger) {
        this.logger = logger;
        this.sshClient = null;
        this.tcpServer = null;
        this.localPort = null;
    }

    /**
     * 创建 SSH 隧道
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
            throw new Error("SSH 认证失败：需要提供 password 或 privateKey");
        }

        return new Promise((resolve, reject) => {
            this.sshClient = new Client();

            // SSH 连接配置
            const sshOptions = {
                host: sshConfig.host,
                port: sshConfig.port || 22,
                username: sshConfig.username,
            };

            // 添加认证信息
            if (sshConfig.password) {
                sshOptions.password = sshConfig.password;
            }

            if (sshConfig.privateKey) {
                const fs = require("fs");
                const path = require("path");

                // 判断是文件路径还是密钥内容
                if (
                    sshConfig.privateKey.includes("-----BEGIN") ||
                    !sshConfig.privateKey.includes("/")
                ) {
                    sshOptions.privateKey = sshConfig.privateKey;
                } else {
                    const keyPath = path.resolve(sshConfig.privateKey);
                    if (!fs.existsSync(keyPath)) {
                        throw new Error(`SSH 私钥文件不存在: ${keyPath}`);
                    }
                    sshOptions.privateKey = fs.readFileSync(keyPath, "utf8");
                }

                if (sshConfig.passphrase) {
                    sshOptions.passphrase = sshConfig.passphrase;
                }
            }

            this.logger?.info(
                `正在创建 SSH 隧道: ${sshOptions.username}@${sshOptions.host}:${sshOptions.port}`
            );
            this.logger?.info(`目标地址: ${targetHost}:${targetPort}`);

            // SSH 连接事件处理
            this.sshClient
                .on("ready", () => {
                    this.logger?.success("SSH 连接成功");

                    // 创建本地 TCP 服务器
                    this.tcpServer = net.createServer((clientSocket) => {
                        this.logger?.debug(
                            `收到本地连接请求，转发到 ${targetHost}:${targetPort}`
                        );

                        // 通过 SSH 转发到目标服务器
                        this.sshClient.forwardOut(
                            clientSocket.remoteAddress,
                            clientSocket.remotePort,
                            targetHost,
                            targetPort,
                            (err, stream) => {
                                if (err) {
                                    this.logger?.error(
                                        `端口转发失败: ${err.message}`
                                    );
                                    clientSocket.end();
                                    return;
                                }

                                // 双向数据传输
                                clientSocket.pipe(stream).pipe(clientSocket);

                                clientSocket.on("error", (err) => {
                                    this.logger?.debug(
                                        `客户端连接错误: ${err.message}`
                                    );
                                });

                                stream.on("error", (err) => {
                                    this.logger?.debug(
                                        `SSH流错误: ${err.message}`
                                    );
                                });
                            }
                        );
                    });

                    // 监听本地端口
                    this.tcpServer.listen(localPort, "127.0.0.1", () => {
                        this.localPort = this.tcpServer.address().port;
                        this.logger?.success(
                            `SSH 隧道创建成功，本地端口: ${this.localPort}`
                        );

                        resolve({
                            localHost: "127.0.0.1",
                            localPort: this.localPort,
                        });
                    });

                    this.tcpServer.on("error", (err) => {
                        this.logger?.error(`本地服务器错误: ${err.message}`);
                        reject(err);
                    });
                })
                .on("error", (err) => {
                    const errorMsg = err.message || err.toString() || "未知错误";
                    const errorLevel = err.level || "unknown";

                    this.logger?.error(`SSH 连接失败: ${errorMsg}`);
                    this.logger?.error(`错误级别: ${errorLevel}`);

                    if (err.code === "ECONNREFUSED") {
                        this.logger?.error("提示: SSH服务器拒绝连接，请检查：");
                        this.logger?.error("  1. SSH服务器地址和端口是否正确");
                        this.logger?.error("  2. 网络连接是否正常");
                        this.logger?.error("  3. 防火墙是否允许连接");
                    } else if (err.level === "client-authentication") {
                        this.logger?.error("提示: SSH认证失败，请检查用户名和密码");
                    } else if (err.code === "ENOTFOUND") {
                        this.logger?.error(
                            "提示: 无法解析主机名，请检查SSH服务器地址"
                        );
                    } else if (err.code === "ETIMEDOUT") {
                        this.logger?.error(
                            "提示: 连接超时，请检查网络和防火墙设置"
                        );
                    }

                    reject(err);
                })
                .connect(sshOptions);
        });
    }

    /**
     * 关闭 SSH 隧道
     */
    async close() {
        if (this.tcpServer) {
            await new Promise((resolve) => {
                this.tcpServer.close(() => {
                    this.logger?.info("本地TCP服务器已关闭");
                    resolve();
                });
            });
            this.tcpServer = null;
        }

        if (this.sshClient) {
            this.sshClient.end();
            this.logger?.success("SSH 隧道已关闭");
            this.sshClient = null;
        }

        this.localPort = null;
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
        return (
            this.sshClient !== null &&
            this.tcpServer !== null &&
            this.localPort !== null
        );
    }
}

module.exports = SshTunnelV2;

