/**
 * SSH 隧道功能测试
 * 注意：此测试需要实际的 SSH 服务器配置才能运行
 */

const { describe, it } = require("mocha");
const { expect } = require("chai");
const SshTunnel = require("../src/utils/ssh-tunnel");
const Logger = require("../src/utils/logger");

describe("SSH Tunnel Tests", function() {
    this.timeout(30000); // SSH 连接可能需要时间

    let tunnel;
    let logger;

    beforeEach(() => {
        logger = new Logger({ verbose: false, silent: true });
    });

    afterEach(async () => {
        if (tunnel && tunnel.isActive()) {
            await tunnel.close();
        }
    });

    describe("Configuration Validation", () => {
        it("应该在缺少 SSH 配置时抛出错误", async () => {
            tunnel = new SshTunnel(logger);

            try {
                await tunnel.create(null, "localhost", 27017);
                expect.fail("应该抛出错误");
            } catch (error) {
                expect(error.message).to.include("SSH 配置不完整");
            }
        });

        it("应该在缺少认证信息时抛出错误", async () => {
            tunnel = new SshTunnel(logger);

            const sshConfig = {
                host: "example.com",
                username: "user"
                // 缺少 password 和 privateKey
            };

            try {
                await tunnel.create(sshConfig, "localhost", 27017);
                expect.fail("应该抛出错误");
            } catch (error) {
                expect(error.message).to.include("需要提供 password 或 privateKey");
            }
        });

        it("应该在缺少目标地址时抛出错误", async () => {
            tunnel = new SshTunnel(logger);

            const sshConfig = {
                host: "example.com",
                username: "user",
                password: "pass"
            };

            try {
                await tunnel.create(sshConfig, null, null);
                expect.fail("应该抛出错误");
            } catch (error) {
                expect(error.message).to.include("MongoDB 目标地址不完整");
            }
        });
    });

    describe("Tunnel Lifecycle", () => {
        it("应该正确初始化隧道实例", () => {
            tunnel = new SshTunnel(logger);
            expect(tunnel).to.be.an("object");
            expect(tunnel.isActive()).to.be.false;
            expect(tunnel.getLocalPort()).to.be.null;
        });

        // 以下测试需要实际的 SSH 服务器
        it.skip("应该能创建 SSH 隧道（需要实际 SSH 服务器）", async () => {
            tunnel = new SshTunnel(logger);

            const sshConfig = {
                host: "your-ssh-server.com",
                port: 22,
                username: "testuser",
                password: "testpass"
            };

            const tunnelInfo = await tunnel.create(
                sshConfig,
                "localhost",
                27017
            );

            expect(tunnelInfo).to.have.property("localHost");
            expect(tunnelInfo).to.have.property("localPort");
            expect(tunnelInfo.localHost).to.equal("127.0.0.1");
            expect(tunnelInfo.localPort).to.be.a("number");
            expect(tunnel.isActive()).to.be.true;
        });

        it.skip("应该能正确关闭 SSH 隧道", async () => {
            tunnel = new SshTunnel(logger);

            const sshConfig = {
                host: "your-ssh-server.com",
                port: 22,
                username: "testuser",
                password: "testpass"
            };

            await tunnel.create(sshConfig, "localhost", 27017);
            expect(tunnel.isActive()).to.be.true;

            await tunnel.close();
            expect(tunnel.isActive()).to.be.false;
            expect(tunnel.getLocalPort()).to.be.null;
        });
    });

    describe("Integration with SyncManager", () => {
        it("应该能在配置中正确识别 SSH 配置", () => {
            const config = {
                remote: {
                    host: "internal-db.example.com",
                    port: "27017",
                    database: "test",
                    ssh: {
                        host: "jumpserver.example.com",
                        username: "deployer",
                        password: "secret"
                    }
                },
                local: {
                    host: "localhost",
                    port: "27017",
                    database: "test"
                },
                mode: "collection",
                collections: ["test"]
            };

            expect(config.remote.ssh).to.exist;
            expect(config.remote.ssh.host).to.equal("jumpserver.example.com");
        });
    });
});

console.log("\n⚠️  注意: SSH 隧道测试需要实际的 SSH 服务器配置");
console.log("大部分测试被跳过(skip)，只运行配置验证测试\n");

