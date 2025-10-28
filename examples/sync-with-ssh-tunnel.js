/**
 * 实际环境测试 - SSH 隧道同步
 * 注意：此文件包含真实凭证，请勿提交到代码仓库
 */

const { SyncManager, Logger } = require("../src/index");

async function main() {
    const config = {
        // 远程数据库配置
        remote: {
            host: "xxxxx",
            port: "28017",
            username: "root",
            password: "xxxx",
            database: "trip",
            authSource: "admin",
            options: {
                directConnection: true  // 直连模式，适用于单节点 MongoDB
            }
        },

        // 本地数据库配置
        local: {
            host: "127.0.0.1",              // MongoDB 内网地址（从SSH服务器视角）
            port: "28017",
            username: "huojianshi",
            password: "xxx",
            database: "trip",
            authSource: "admin",
            options: {
                directConnection: true
            },

            // SSH 隧道配置
            ssh: {
                host: "xxxx",      // SSH 跳板机地址
                port: 38449,                // SSH 端口
                username: "xxxx",     // SSH 用户名
                password: "xxxx"  // SSH 密码
            }
        },

        // 同步模式和选项
        mode: "collection",
        collections: [
            "feature_modules","feature_modules_form","feature_modules_temp","trip_departure_cities","trip_destinations","trip_types",
            "agent_configs","language_model_releases","system_prompts"
        ],
        batchSize: 1000,
        dropLocal: true,  // 删除本地数据后再同步
        dryRun: false
    };

    const logger = new Logger({ verbose: true });
    const manager = new SyncManager(config, logger);

    try {
        logger.section("开始通过 SSH 隧道同步数据");
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

        // 输出更详细的错误信息
        if (error.code) {
            console.error("\n错误代码:", error.code);
        }
        if (error.errno) {
            console.error("错误编号:", error.errno);
        }
        if (error.syscall) {
            console.error("系统调用:", error.syscall);
        }
    }
}

main();

