#!/usr/bin/env node

/**
 * MongoDB 数据库同步工具 - 主入口
 * 
 * 功能：
 * - 支持集合、数据库、实例级别同步
 * - 支持增量同步
 * - 支持过滤条件
 * - 完整的错误处理和日志
 * 
 * 使用方法：
 *   node src/index.js [选项]
 *   npm run sync -- [选项]
 */

const SyncManager = require("./lib/sync-manager");
const ConfigLoader = require("./config-loader");
const Logger = require("./utils/logger");
const Formatter = require("./utils/formatter");

// 显示帮助信息
function showHelp() {
    console.log(`
MongoDB 数据库同步工具 v2.0

使用方法:
  node src/index.js [选项]

同步模式:
  --mode <mode>            同步模式: collection | database | instance | incremental
  --incremental            增量同步模式（快捷方式）
  --sync-all               同步整个实例（快捷方式）

连接配置:
  --db <name>              数据库名称（远程和本地使用相同名称）
  --remote-db <name>       远程数据库名称
  --local-db <name>        本地数据库名称
  --remote-host <host>     远程主机（默认：localhost）
  --remote-port <port>     远程端口（默认：27017）
  --remote-user <user>     远程用户名
  --remote-pass <pass>     远程密码
  --local-host <host>      本地主机（默认：localhost）
  --local-port <port>      本地端口（默认：27017）
  --local-user <user>      本地用户名
  --local-pass <pass>      本地密码

同步选项:
  --collections <list>     指定集合（逗号分隔）
  --databases <list>       指定数据库（逗号分隔）
  --exclude-collections    排除的集合（逗号分隔）
  --exclude-databases      排除的数据库（逗号分隔）
  --batch-size <size>      批量大小（默认：1000）
  --drop-local             同步前删除本地数据
  --dry-run                模拟运行，不实际写入
  --filter <json>          过滤条件（JSON 格式）

增量同步选项:
  --timestamp-field <name> 时间戳字段名（默认：updatedAt）
  --since <date>           同步起始时间（ISO 格式或时间戳）

其他选项:
  --verbose, -v            显示详细日志
  --silent                 静默模式
  --help, -h               显示帮助信息

环境变量:
  可在 .env 文件中配置所有选项（使用大写和下划线命名）
  例如: REMOTE_HOST, REMOTE_PORT, COLLECTIONS 等

示例:

  # 1. 同步整个数据库
  node src/index.js --db mydb --remote-host prod.example.com \\
    --remote-user admin --remote-pass secret

  # 2. 只同步指定集合
  node src/index.js --db mydb --collections users,orders

  # 3. 同步多个数据库
  node src/index.js --databases db1,db2,db3 --remote-host prod.example.com

  # 4. 同步整个实例
  node src/index.js --sync-all --remote-host prod.example.com \\
    --exclude-databases test,temp

  # 5. 增量同步
  node src/index.js --db mydb --incremental --since "2025-01-01"

  # 6. 使用过滤条件同步
  node src/index.js --db mydb --collections users \\
    --filter '{"status":"active"}'

  # 7. 模拟运行
  node src/index.js --db mydb --dry-run

更多信息: https://github.com/your-repo/mongodb-sync-tool
`);
}

// 显示配置摘要
function showConfigSummary(config) {
    console.log("\n" + "=".repeat(60));
    console.log("同步配置摘要");
    console.log("=".repeat(60));
    console.log(`同步模式: ${config.mode}`);
    console.log(`远程: ${config.remote.host}:${config.remote.port}`);
    console.log(`本地: ${config.local.host}:${config.local.port}`);

    if (config.remote.database) {
        console.log(`数据库: ${config.remote.database}`);
    }
    if (config.databases.length > 0) {
        console.log(`数据库列表: ${config.databases.join(", ")}`);
    }
    if (config.collections.length > 0) {
        console.log(`集合列表: ${config.collections.join(", ")}`);
    }
    if (config.excludeCollections.length > 0) {
        console.log(`排除集合: ${config.excludeCollections.join(", ")}`);
    }
    if (config.excludeDatabases.length > 0) {
        console.log(`排除数据库: ${config.excludeDatabases.join(", ")}`);
    }

    console.log(`批量大小: ${config.batchSize}`);
    console.log(`删除本地: ${config.dropLocal ? "是" : "否"}`);
    console.log(`模拟运行: ${config.dryRun ? "是" : "否"}`);

    if (config.mode === "incremental") {
        console.log(`时间戳字段: ${config.timestampField}`);
        if (config.since) {
            console.log(`起始时间: ${Formatter.formatDate(config.since)}`);
        }
    }

    if (Object.keys(config.filter).length > 0) {
        console.log(`过滤条件: ${JSON.stringify(config.filter)}`);
    }

    console.log("=".repeat(60) + "\n");
}

// 主函数
async function main() {
    try {
        const args = process.argv.slice(2);

        // 显示帮助
        if (args.includes("--help") || args.includes("-h")) {
            showHelp();
            process.exit(0);
        }

        // 加载配置
        const config = ConfigLoader.load(args);

        // 创建日志器
        const logger = new Logger({
            silent: config.silent,
            verbose: config.verbose
        });

        // 显示配置摘要
        if (!config.silent) {
            showConfigSummary(config);
        }

        // 模拟运行提示
        if (config.dryRun) {
            logger.warn("⚠️  模拟运行模式，不会实际写入数据\n");
        }

        // 创建同步管理器并执行
        const manager = new SyncManager(config, logger);
        const result = await manager.execute();

        // 显示最终结果
        if (result.success) {
            logger.section("✅ 同步完成");
            if (result.totalCount !== undefined) {
                logger.success(`共同步 ${Formatter.formatNumber(result.totalCount)} 条记录`);
            }
            if (result.time !== undefined) {
                logger.success(`总耗时: ${Formatter.formatDuration(result.time)}`);
            }
            process.exit(0);
        } else {
            logger.section("❌ 同步失败");
            if (result.error) {
                logger.error(result.error);
            }
            process.exit(1);
        }
    } catch (error) {
        console.error(`\n❌ 发生错误: ${error.message}`);
        if (process.argv.includes("--verbose") || process.argv.includes("-v")) {
            console.error("\n详细错误信息:");
            console.error(error.stack);
        }
        process.exit(1);
    }
}

// 执行主函数
if (require.main === module) {
    main();
}

module.exports = { SyncManager, ConfigLoader, Logger };
