/**
 * 示例：同步整个 MongoDB 实例
 * 
 * 场景：需要完整复制整个生产环境到本地
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
            authSource: "admin",
            options: {
                directConnection: true  // 直连模式，适用于单节点 MongoDB
            }
        },

        // 本地数据库
        local: {
            host: "localhost",
            port: "27017"
        },

        // 同步模式：实例级别
        mode: "instance",

        // 排除某些数据库（可选）
        excludeDatabases: ["test", "temp", "backup"],

        // 同步选项
        batchSize: 1000,
        dropLocal: true,   // 完整重建本地数据
        dryRun: false
    };

    const logger = new Logger({ verbose: true });
    const manager = new SyncManager(config, logger);

    try {
        logger.section("开始同步整个 MongoDB 实例");
        logger.warn("⚠️  这将同步所有数据库，可能需要较长时间...");

        const result = await manager.execute();

        if (result.success) {
            logger.section("同步完成统计");
            logger.success(`数据库数: ${result.totalDatabases}`);
            logger.success(`总记录数: ${result.totalCount}`);
            logger.success(`耗时: ${result.time.toFixed(2)}s`);
            logger.success(`成功: ${result.successCount}, 失败: ${result.failCount}`);
        } else {
            logger.error("同步失败！");
            console.error(result);
        }
    } catch (error) {
        logger.error(`发生错误: ${error.message}`);
        console.error(error.stack);
    }
}

main();
