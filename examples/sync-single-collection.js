/**
 * 示例：同步单个集合
 * 
 * 场景：只需要同步生产环境的 users 集合到本地
 */

const { SyncManager, Logger } = require("../src/index");

async function main() {
    const config = {
        // 远程数据库（生产环境）
        remote: {
            host: "prod.example.com",
            port: "27017",
            username: "admin",
            password: "secret",
            database: "myapp",
            authSource: "admin",
            options: {
                directConnection: true  // 直连模式，适用于单节点 MongoDB
            }
        },

        // 本地数据库
        local: {
            host: "localhost",
            port: "27017",
            database: "myapp_dev"
        },

        // 同步模式
        mode: "collection",

        // 指定要同步的集合
        collections: ["users"],

        // 同步选项
        batchSize: 1000,
        dropLocal: true,  // 删除本地旧数据
        dryRun: false     // 实际执行
    };

    const logger = new Logger({ verbose: true });
    const manager = new SyncManager(config, logger);

    try {
        logger.section("开始同步 users 集合");
        const result = await manager.execute();

        if (result.success) {
            logger.success("同步完成！");
            console.log(JSON.stringify(result, null, 2));
        } else {
            logger.error("同步失败！");
            console.error(result.error);
        }
    } catch (error) {
        logger.error(`发生错误: ${error.message}`);
        console.error(error.stack);
    }
}

main();
