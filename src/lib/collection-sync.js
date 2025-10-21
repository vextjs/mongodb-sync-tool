/**
 * 集合同步模块
 * 负责单个集合的数据同步
 */

const Formatter = require("../utils/formatter");

class CollectionSync {
    constructor(options = {}) {
        this.logger = options.logger;
        this.batchSize = options.batchSize || 1000;
        this.dropLocal = options.dropLocal || false;
        this.dryRun = options.dryRun || false;
        this.filter = options.filter || {};
    }

    /**
     * 同步单个集合
     * @param {Object} remoteDb - 远程数据库实例
     * @param {Object} localDb - 本地数据库实例
     * @param {string} collectionName - 集合名称
     * @returns {Promise<Object>} 同步结果
     */
    async sync(remoteDb, localDb, collectionName) {
        const startTime = Date.now();
        this.logger.info(`开始同步集合: ${collectionName}`);

        try {
            const remoteColl = remoteDb.collection(collectionName);
            const localColl = localDb.collection(collectionName);

            // 统计远程集合文档数量
            const totalDocs = await remoteColl.countDocuments(this.filter);
            this.logger.info(`  远程文档数: ${Formatter.formatNumber(totalDocs)}`);

            if (totalDocs === 0) {
                this.logger.warn(`  集合 ${collectionName} 为空，跳过同步`);
                return {
                    collection: collectionName,
                    count: 0,
                    time: 0,
                    success: true
                };
            }

            // 删除本地集合（如果配置了）
            if (this.dropLocal && !this.dryRun) {
                try {
                    await localColl.drop();
                    this.logger.info(`  已删除本地集合: ${collectionName}`);
                } catch (err) {
                    // 集合不存在时会报错，忽略
                    if (err.code !== 26) {
                        throw err;
                    }
                }
            }

            // 分批同步数据
            const syncResult = await this._syncData(
                remoteColl,
                localColl,
                totalDocs
            );

            // 同步索引
            if (!this.dryRun) {
                await this._syncIndexes(remoteColl, localColl);
            }

            const duration = (Date.now() - startTime) / 1000;
            this.logger.success(
                `  集合 ${collectionName} 同步完成: ${Formatter.formatNumber(syncResult.count)} 条记录，` +
                `耗时 ${Formatter.formatDuration(duration)}，` +
                `速度 ${Formatter.formatSpeed(syncResult.count, duration)}`
            );

            return {
                collection: collectionName,
                count: syncResult.count,
                time: duration,
                speed: syncResult.count / duration,
                success: true
            };
        } catch (error) {
            const duration = (Date.now() - startTime) / 1000;
            this.logger.error(`  集合 ${collectionName} 同步失败: ${error.message}`);
            return {
                collection: collectionName,
                count: 0,
                time: duration,
                error: error.message,
                success: false
            };
        }
    }

    /**
     * 同步数据
     * @private
     */
    async _syncData(remoteColl, localColl, totalDocs) {
        let syncedCount = 0;
        const cursor = remoteColl.find(this.filter).batchSize(this.batchSize);
        let batch = [];

        while (await cursor.hasNext()) {
            const doc = await cursor.next();
            batch.push(doc);

            if (batch.length >= this.batchSize) {
                if (!this.dryRun) {
                    await localColl.insertMany(batch, { ordered: false });
                }
                syncedCount += batch.length;

                // 显示进度
                this.logger.progress(
                    `  同步进度: ${Formatter.formatNumber(syncedCount)}/${Formatter.formatNumber(totalDocs)} ` +
                    `${Formatter.formatPercentage(syncedCount, totalDocs)} ` +
                    `${Formatter.createProgressBar(syncedCount, totalDocs)}`
                );

                batch = [];
            }
        }

        // 插入剩余数据
        if (batch.length > 0) {
            if (!this.dryRun) {
                await localColl.insertMany(batch, { ordered: false });
            }
            syncedCount += batch.length;
        }

        this.logger.clearProgress();
        return { count: syncedCount };
    }

    /**
     * 同步索引
     * @private
     */
    async _syncIndexes(remoteColl, localColl) {
        try {
            const indexes = await remoteColl.indexes();
            let syncedIndexes = 0;

            for (const index of indexes) {
                // 跳过默认的 _id 索引
                if (index.name === "_id_") {
                    continue;
                }

                try {
                    // 删除索引规范中的 v 和 ns 字段
                    const { v, ns, ...indexSpec } = index;
                    await localColl.createIndex(index.key, indexSpec);
                    this.logger.debug(`  已创建索引: ${index.name}`);
                    syncedIndexes++;
                } catch (err) {
                    // 索引已存在时忽略错误
                    if (err.code !== 85 && err.code !== 86) {
                        this.logger.warn(`  索引创建失败 ${index.name}: ${err.message}`);
                    }
                }
            }

            if (syncedIndexes > 0) {
                this.logger.info(`  已同步 ${syncedIndexes} 个索引`);
            }
        } catch (error) {
            this.logger.warn(`  索引同步失败: ${error.message}`);
        }
    }
}

module.exports = CollectionSync;
