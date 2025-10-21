/**
 * 示例：同步多个数据库
 * 
 * 场景：需要同步生产环境的多个数据库到本地
 */

const { SyncManager, Logger } = require("../src/index");

async function main() {
    const config = {
        // 远程数据库（生产环境）
        remote: {
            host: "192.168.9.18",
            port: "28018",
            username: "admin",
            password: "P9SHt6DbsUY.7t5",
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

        // 同步模式
        mode: "database",

        // 指定要同步的数据库
        databases: ["user",],

        // 排除某些集合（可选）
        excludeCollections: ["temp", "cache"],

        // 同步选项
        batchSize: 2000,
        dropLocal: false,  // 不删除本地数据，进行增量更新
        dryRun: false
    };

    const logger = new Logger({ verbose: true });
    const manager = new SyncManager(config, logger);

    try {
        logger.section("开始同步多个数据库");
        const result = await manager.execute();

        if (result.success) {
            logger.success(`成功同步 ${result.totalDatabases} 个数据库！`);
            logger.info(`总记录数: ${result.totalCount}`);
            logger.info(`耗时: ${result.time.toFixed(2)}s`);
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
