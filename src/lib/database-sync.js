/**
 * 数据库同步模块
 * 负责单个或多个数据库的同步
 */

const CollectionSync = require("./collection-sync");
const Formatter = require("../utils/formatter");

class DatabaseSync {
    constructor(options = {}) {
        this.logger = options.logger;
        this.batchSize = options.batchSize || 1000;
        this.dropLocal = options.dropLocal || false;
        this.dryRun = options.dryRun || false;
        this.collections = options.collections || [];
        this.excludeCollections = options.excludeCollections || [];
        this.filter = options.filter || {};
    }

    /**
     * 同步单个数据库
     * @param {Object} remoteClient - 远程客户端
     * @param {Object} localClient - 本地客户端
     * @param {string} databaseName - 数据库名称
     * @returns {Promise<Object>} 同步结果
     */
    async syncDatabase(remoteClient, localClient, databaseName) {
        const startTime = Date.now();
        this.logger.section(`同步数据库: ${databaseName}`);

        try {
            const remoteDb = remoteClient.db(databaseName);
            const localDb = localClient.db(databaseName);

            // 获取要同步的集合列表
            const collectionsToSync = await this._getCollections(remoteDb);

            if (collectionsToSync.length === 0) {
                this.logger.warn(`数据库 ${databaseName} 没有需要同步的集合`);
                return {
                    database: databaseName,
                    collections: [],
                    totalCount: 0,
                    time: 0,
                    success: true
                };
            }

            this.logger.info(`发现 ${collectionsToSync.length} 个集合: ${collectionsToSync.join(", ")}\n`);

            // 同步所有集合
            const results = [];
            for (const collName of collectionsToSync) {
                const collectionSync = new CollectionSync({
                    logger: this.logger,
                    batchSize: this.batchSize,
                    dropLocal: this.dropLocal,
                    dryRun: this.dryRun,
                    filter: this.filter
                });

                const result = await collectionSync.sync(remoteDb, localDb, collName);
                results.push(result);
                console.log(""); // 集合之间空行
            }

            const duration = (Date.now() - startTime) / 1000;
            const totalCount = results.reduce((sum, r) => sum + r.count, 0);
            const successCount = results.filter(r => r.success).length;
            const failCount = results.filter(r => !r.success).length;

            this.logger.section(`数据库 ${databaseName} 同步汇总`);
            this.logger.info(`总集合数: ${results.length}`);
            this.logger.info(`成功: ${successCount}，失败: ${failCount}`);
            this.logger.info(`总记录数: ${Formatter.formatNumber(totalCount)}`);
            this.logger.info(`总耗时: ${Formatter.formatDuration(duration)}`);

            if (failCount > 0) {
                this.logger.warn("\n以下集合同步失败：");
                results.filter(r => !r.success).forEach(r => {
                    this.logger.error(`  - ${r.collection}: ${r.error}`);
                });
            }

            return {
                database: databaseName,
                collections: results,
                totalCount,
                successCount,
                failCount,
                time: duration,
                success: failCount === 0
            };
        } catch (error) {
            const duration = (Date.now() - startTime) / 1000;
            this.logger.error(`数据库 ${databaseName} 同步失败: ${error.message}`);
            return {
                database: databaseName,
                collections: [],
                totalCount: 0,
                time: duration,
                error: error.message,
                success: false
            };
        }
    }

    /**
     * 同步多个数据库
     * @param {Object} remoteClient - 远程客户端
     * @param {Object} localClient - 本地客户端
     * @param {string[]} databaseNames - 数据库名称列表
     * @returns {Promise<Object>} 同步结果
     */
    async syncDatabases(remoteClient, localClient, databaseNames) {
        const startTime = Date.now();
        this.logger.section(`同步多个数据库 (共 ${databaseNames.length} 个)`);

        const results = [];
        for (const dbName of databaseNames) {
            const result = await this.syncDatabase(remoteClient, localClient, dbName);
            results.push(result);
            console.log("\n"); // 数据库之间空行
        }

        const duration = (Date.now() - startTime) / 1000;
        const totalCount = results.reduce((sum, r) => sum + r.totalCount, 0);
        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;

        this.logger.section("总体同步汇总");
        this.logger.info(`总数据库数: ${results.length}`);
        this.logger.info(`成功: ${successCount}，失败: ${failCount}`);
        this.logger.info(`总记录数: ${Formatter.formatNumber(totalCount)}`);
        this.logger.info(`总耗时: ${Formatter.formatDuration(duration)}`);

        return {
            databases: results,
            totalDatabases: results.length,
            totalCount,
            successCount,
            failCount,
            time: duration,
            success: failCount === 0
        };
    }

    /**
     * 获取要同步的集合列表
     * @private
     */
    async _getCollections(remoteDb) {
        let collections;

        // 如果指定了集合列表
        if (this.collections.length > 0) {
            collections = this.collections;
        } else {
            // 获取所有集合
            const allCollections = await remoteDb.listCollections().toArray();
            collections = allCollections.map(c => c.name);
        }

        // 过滤排除的集合
        if (this.excludeCollections.length > 0) {
            collections = collections.filter(
                name => !this.excludeCollections.includes(name)
            );
        }

        // 过滤系统集合
        collections = collections.filter(name => !name.startsWith("system."));

        return collections;
    }
}

module.exports = DatabaseSync;
