/**
 * 示例：使用过滤条件同步
 * 
 * 场景：只同步符合特定条件的数据（例如：只同步活跃用户）
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

        // 指定集合
        collections: ["users"],

        // 过滤条件：只同步活跃用户
        filter: {
            status: "active",
            lastLoginAt: { $gte: new Date("2025-01-01") }
        },

        // 同步选项
        batchSize: 1000,
        dropLocal: true,
        dryRun: false
    };

    const logger = new Logger({ verbose: true });
    const manager = new SyncManager(config, logger);

    try {
        logger.section("开始过滤同步");
        logger.info("过滤条件: 只同步活跃用户（status=active 且最近登录）");

        const result = await manager.execute();

        if (result.success) {
            logger.success("过滤同步完成！");
            const totalCount = result.collections.reduce((sum, c) => sum + c.count, 0);
            logger.info(`同步记录数: ${totalCount}`);
        } else {
            logger.error("过滤同步失败！");
            console.error(result);
        }
    } catch (error) {
        logger.error(`发生错误: ${error.message}`);
        console.error(error.stack);
    }
}

main();
