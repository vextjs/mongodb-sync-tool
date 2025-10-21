/**
 * 实例同步模块
 * 负责整个 MongoDB 实例（所有数据库）的同步
 */

const DatabaseSync = require("./database-sync");
const Formatter = require("../utils/formatter");

class InstanceSync {
    constructor(options = {}) {
        this.logger = options.logger;
        this.batchSize = options.batchSize || 1000;
        this.dropLocal = options.dropLocal || false;
        this.dryRun = options.dryRun || false;
        this.excludeDatabases = options.excludeDatabases || [];
        this.filter = options.filter || {};
    }

    /**
     * 同步整个 MongoDB 实例
     * @param {Object} remoteClient - 远程客户端
     * @param {Object} localClient - 本地客户端
     * @returns {Promise<Object>} 同步结果
     */
    async syncInstance(remoteClient, localClient) {
        const startTime = Date.now();
        this.logger.section("同步整个 MongoDB 实例");

        try {
            // 获取所有数据库
            const databases = await this._getDatabases(remoteClient);

            if (databases.length === 0) {
                this.logger.warn("没有找到需要同步的数据库");
                return {
                    databases: [],
                    totalDatabases: 0,
                    totalCount: 0,
                    time: 0,
                    success: true
                };
            }

            this.logger.info(`发现 ${databases.length} 个数据库: ${databases.join(", ")}\n`);

            // 同步所有数据库
            const databaseSync = new DatabaseSync({
                logger: this.logger,
                batchSize: this.batchSize,
                dropLocal: this.dropLocal,
                dryRun: this.dryRun,
                filter: this.filter
            });

            const result = await databaseSync.syncDatabases(
                remoteClient,
                localClient,
                databases
            );

            const duration = (Date.now() - startTime) / 1000;

            this.logger.section("实例同步完成");
            this.logger.success(
                `已同步 ${result.totalDatabases} 个数据库，` +
                `共 ${Formatter.formatNumber(result.totalCount)} 条记录，` +
                `耗时 ${Formatter.formatDuration(duration)}`
            );

            return {
                ...result,
                time: duration
            };
        } catch (error) {
            const duration = (Date.now() - startTime) / 1000;
            this.logger.error(`实例同步失败: ${error.message}`);
            return {
                databases: [],
                totalDatabases: 0,
                totalCount: 0,
                time: duration,
                error: error.message,
                success: false
            };
        }
    }

    /**
     * 获取要同步的数据库列表
     * @private
     */
    async _getDatabases(remoteClient) {
        const adminDb = remoteClient.db("admin");
        const result = await adminDb.admin().listDatabases();

        let databases = result.databases.map(db => db.name);

        // 过滤系统数据库
        const systemDatabases = ["admin", "local", "config"];
        databases = databases.filter(name => !systemDatabases.includes(name));

        // 过滤排除的数据库
        if (this.excludeDatabases.length > 0) {
            databases = databases.filter(
                name => !this.excludeDatabases.includes(name)
            );
        }

        return databases;
    }
}

module.exports = InstanceSync;
