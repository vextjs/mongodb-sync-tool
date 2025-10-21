/**
 * 增量同步模块
 * 基于时间戳字段进行增量同步
 */

const CollectionSync = require("./collection-sync");
const Formatter = require("../utils/formatter");

class IncrementalSync {
    constructor(options = {}) {
        this.logger = options.logger;
        this.batchSize = options.batchSize || 1000;
        this.dryRun = options.dryRun || false;
        this.timestampField = options.timestampField || "updatedAt";
        this.since = options.since; // Date 对象或时间戳
    }

    /**
     * 增量同步集合
     * @param {Object} remoteDb - 远程数据库实例
     * @param {Object} localDb - 本地数据库实例
     * @param {string} collectionName - 集合名称
     * @returns {Promise<Object>} 同步结果
     */
    async sync(remoteDb, localDb, collectionName) {
        const startTime = Date.now();
        this.logger.info(`开始增量同步集合: ${collectionName}`);

        try {
            const remoteColl = remoteDb.collection(collectionName);
            const localColl = localDb.collection(collectionName);

            // 确定增量同步的起始时间
            const sinceTime = await this._getSinceTime(localColl);
            this.logger.info(`  增量同步起始时间: ${Formatter.formatDate(sinceTime)}`);

            // 构建增量查询条件
            const filter = {
                [this.timestampField]: { $gte: sinceTime }
            };

            // 统计需要同步的文档数量
            const totalDocs = await remoteColl.countDocuments(filter);
            this.logger.info(`  需要同步的文档数: ${Formatter.formatNumber(totalDocs)}`);

            if (totalDocs === 0) {
                this.logger.warn(`  集合 ${collectionName} 没有需要增量同步的数据`);
                return {
                    collection: collectionName,
                    count: 0,
                    inserted: 0,
                    updated: 0,
                    time: 0,
                    success: true
                };
            }

            // 执行增量同步
            const syncResult = await this._syncIncrementalData(
                remoteColl,
                localColl,
                filter,
                totalDocs
            );

            const duration = (Date.now() - startTime) / 1000;
            this.logger.success(
                `  集合 ${collectionName} 增量同步完成: ` +
                `新增 ${Formatter.formatNumber(syncResult.inserted)} 条，` +
                `更新 ${Formatter.formatNumber(syncResult.updated)} 条，` +
                `耗时 ${Formatter.formatDuration(duration)}`
            );

            return {
                collection: collectionName,
                count: syncResult.inserted + syncResult.updated,
                inserted: syncResult.inserted,
                updated: syncResult.updated,
                time: duration,
                success: true
            };
        } catch (error) {
            const duration = (Date.now() - startTime) / 1000;
            this.logger.error(`  集合 ${collectionName} 增量同步失败: ${error.message}`);
            return {
                collection: collectionName,
                count: 0,
                inserted: 0,
                updated: 0,
                time: duration,
                error: error.message,
                success: false
            };
        }
    }

    /**
     * 增量同步数据库
     * @param {Object} remoteClient - 远程客户端
     * @param {Object} localClient - 本地客户端
     * @param {string} databaseName - 数据库名称
     * @param {string[]} collections - 集合列表
     * @returns {Promise<Object>} 同步结果
     */
    async syncDatabase(remoteClient, localClient, databaseName, collections = []) {
        const startTime = Date.now();
        this.logger.section(`增量同步数据库: ${databaseName}`);

        try {
            const remoteDb = remoteClient.db(databaseName);
            const localDb = localClient.db(databaseName);

            // 获取要同步的集合
            let collectionsToSync = collections;
            if (collectionsToSync.length === 0) {
                const allCollections = await remoteDb.listCollections().toArray();
                collectionsToSync = allCollections.map(c => c.name);
            }

            this.logger.info(`需要增量同步 ${collectionsToSync.length} 个集合\n`);

            // 同步所有集合
            const results = [];
            for (const collName of collectionsToSync) {
                const result = await this.sync(remoteDb, localDb, collName);
                results.push(result);
                console.log("");
            }

            const duration = (Date.now() - startTime) / 1000;
            const totalInserted = results.reduce((sum, r) => sum + r.inserted, 0);
            const totalUpdated = results.reduce((sum, r) => sum + r.updated, 0);
            const successCount = results.filter(r => r.success).length;
            const failCount = results.filter(r => !r.success).length;

            this.logger.section(`数据库 ${databaseName} 增量同步汇总`);
            this.logger.info(`总集合数: ${results.length}`);
            this.logger.info(`成功: ${successCount}，失败: ${failCount}`);
            this.logger.info(`新增记录: ${Formatter.formatNumber(totalInserted)}`);
            this.logger.info(`更新记录: ${Formatter.formatNumber(totalUpdated)}`);
            this.logger.info(`总耗时: ${Formatter.formatDuration(duration)}`);

            return {
                database: databaseName,
                collections: results,
                totalInserted,
                totalUpdated,
                successCount,
                failCount,
                time: duration,
                success: failCount === 0
            };
        } catch (error) {
            const duration = (Date.now() - startTime) / 1000;
            this.logger.error(`数据库 ${databaseName} 增量同步失败: ${error.message}`);
            return {
                database: databaseName,
                collections: [],
                totalInserted: 0,
                totalUpdated: 0,
                time: duration,
                error: error.message,
                success: false
            };
        }
    }

    /**
     * 获取增量同步的起始时间
     * @private
     */
    async _getSinceTime(localColl) {
        // 如果指定了时间，使用指定时间
        if (this.since) {
            return this.since instanceof Date ? this.since : new Date(this.since);
        }

        // 否则查找本地集合中最新的时间戳
        try {
            const latestDoc = await localColl
                .find({})
                .sort({ [this.timestampField]: -1 })
                .limit(1)
                .toArray();

            if (latestDoc.length > 0 && latestDoc[0][this.timestampField]) {
                return latestDoc[0][this.timestampField];
            }
        } catch (error) {
            this.logger.debug(`  无法获取本地最新时间戳: ${error.message}`);
        }

        // 默认同步最近 7 天的数据
        const defaultDays = 7;
        const defaultSince = new Date();
        defaultSince.setDate(defaultSince.getDate() - defaultDays);
        this.logger.warn(`  未找到本地时间戳，默认同步最近 ${defaultDays} 天的数据`);
        return defaultSince;
    }

    /**
     * 执行增量数据同步
     * @private
     */
    async _syncIncrementalData(remoteColl, localColl, filter, totalDocs) {
        let inserted = 0;
        let updated = 0;
        let processed = 0;

        const cursor = remoteColl.find(filter).batchSize(this.batchSize);

        while (await cursor.hasNext()) {
            const doc = await cursor.next();

            if (!this.dryRun) {
                // 使用 replaceOne 实现 upsert（插入或更新）
                const result = await localColl.replaceOne(
                    { _id: doc._id },
                    doc,
                    { upsert: true }
                );

                if (result.upsertedCount > 0) {
                    inserted++;
                } else if (result.modifiedCount > 0) {
                    updated++;
                }
            } else {
                // 模拟运行时，检查文档是否存在
                const exists = await localColl.findOne({ _id: doc._id });
                if (exists) {
                    updated++;
                } else {
                    inserted++;
                }
            }

            processed++;

            // 显示进度
            if (processed % 100 === 0 || processed === totalDocs) {
                this.logger.progress(
                    `  增量同步进度: ${Formatter.formatNumber(processed)}/${Formatter.formatNumber(totalDocs)} ` +
                    `${Formatter.formatPercentage(processed, totalDocs)} ` +
                    `(新增: ${inserted}, 更新: ${updated})`
                );
            }
        }

        this.logger.clearProgress();
        return { inserted, updated };
    }
}

module.exports = IncrementalSync;
