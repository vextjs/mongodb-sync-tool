/**
 * 示例：增量同步
 * 
 * 场景：只同步最近更新的数据，避免全量同步
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

        // 同步模式：增量同步
        mode: "incremental",

        // 指定要增量同步的集合（可选，不指定则同步所有）
        collections: ["users", "orders", "products"],

        // 增量同步配置
        timestampField: "updatedAt",  // 时间戳字段名
        since: "2025-01-20T00:00:00Z", // 起始时间（可选，不指定则自动检测）

        // 同步选项
        batchSize: 1000,
        dryRun: false
    };

    const logger = new Logger({ verbose: true });
    const manager = new SyncManager(config, logger);

    try {
        logger.section("开始增量同步");
        logger.info(`时间戳字段: ${config.timestampField}`);
        if (config.since) {
            logger.info(`起始时间: ${config.since}`);
        }

        const result = await manager.execute();

        if (result.success) {
            logger.section("增量同步完成");
            logger.success(`新增记录: ${result.totalInserted}`);
            logger.success(`更新记录: ${result.totalUpdated}`);
            logger.success(`耗时: ${result.time.toFixed(2)}s`);
        } else {
            logger.error("增量同步失败！");
            console.error(result);
        }
    } catch (error) {
        logger.error(`发生错误: ${error.message}`);
        console.error(error.stack);
    }
}

main();
