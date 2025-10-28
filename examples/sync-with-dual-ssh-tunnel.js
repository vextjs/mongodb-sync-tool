/**
 * 双向 SSH 隧道示例
 * 场景：远程和本地数据库都需要通过 SSH 隧道访问
 */

const { SyncManager, Logger } = require("../src/index");

async function main() {
    const config = {
        // 远程数据库配置 + SSH 隧道
        remote: {
            host: "10.0.1.100",              // MongoDB 在远程 SSH 服务器上的地址
            port: "27017",
            username: "remote_user",
            password: "remote_mongo_pass",
            database: "production_db",
            authSource: "admin",
            options: {
                directConnection: true
            },

            // 远程 SSH 隧道配置
            ssh: {
                host: "remote-jumpserver.example.com",  // 远程跳板机
                port: 22,
                username: "remote_ssh_user",
                password: "remote_ssh_pass"

                // 或使用私钥认证
                // privateKey: "/path/to/remote-key",
                // passphrase: "remote-key-password"
            }
        },

        // 本地数据库配置 + SSH 隧道
        local: {
            host: "10.0.2.50",               // MongoDB 在本地 SSH 服务器上的地址
            port: "27017",
            username: "local_user",
            password: "local_mongo_pass",
            database: "staging_db",
            authSource: "admin",

            // 本地 SSH 隧道配置
            ssh: {
                host: "local-jumpserver.example.com",   // 本地跳板机
                port: 22,
                username: "local_ssh_user",
                password: "local_ssh_pass"

                // 或使用私钥认证
                // privateKey: "/path/to/local-key",
                // passphrase: "local-key-password"
            }
        },

        // 同步模式和选项
        mode: "collection",
        collections: ["users", "orders", "products"],
        batchSize: 1000,
        dropLocal: false,  // 不删除本地数据，增量同步
        dryRun: false
    };

    const logger = new Logger({ verbose: true });
    const manager = new SyncManager(config, logger);

    try {
        logger.section("开始通过双向 SSH 隧道同步数据");
        console.log("\n配置说明：");
        console.log("  远程: " + config.remote.ssh.host + " -> " + config.remote.host);
        console.log("  本地: " + config.local.ssh.host + " -> " + config.local.host);
        console.log("");

        const result = await manager.execute();

        if (result.success) {
            logger.success("同步完成！");
            console.log("\n结果详情:");
            console.log(JSON.stringify(result, null, 2));
        } else {
            logger.error("同步失败！");
            if (result.error) {
                console.error("错误信息:", result.error);
            }
        }
    } catch (error) {
        logger.error(`发生错误: ${error.message}`);
        console.error("\n完整错误堆栈:");
        console.error(error.stack);
    }
}

main();

