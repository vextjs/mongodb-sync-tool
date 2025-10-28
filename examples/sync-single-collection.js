/**
 * 示例：同步单个集合
 * 
 * 场景：只需要同步生产环境的 users 集合到本地
 */

const { SyncManager, Logger } = require("../src/index");

async function main() {
    const config = {

        // sit 数据库配置
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

        // uat 数据库配置
        local: {
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

        // 同步模式
        mode: "collection",

        // 指定要同步的集合
        collections: [
            "feature_modules","feature_modules_form","feature_modules_temp","trip_departure_cities","trip_destinations","trip_types",
            "agent_configs","language_model_releases","system_prompts"
        ],

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
