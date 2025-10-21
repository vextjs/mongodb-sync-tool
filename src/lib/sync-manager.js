/**
 * 同步管理器
 * 统一管理各种同步模式
 */

const { MongoClient } = require("mongodb");
const CollectionSync = require("./collection-sync");
const DatabaseSync = require("./database-sync");
const InstanceSync = require("./instance-sync");
const IncrementalSync = require("./incremental-sync");
const UriBuilder = require("../utils/uri-builder");
const Validator = require("../utils/validator");

class SyncManager {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
        this.remoteClient = null;
        this.localClient = null;
    }

    /**
     * 执行同步
     * @returns {Promise<Object>} 同步结果
     */
    async execute() {
        try {
            // 校验配置
            const validation = Validator.validateConfig(this.config);
            if (!validation.valid) {
                throw new Error(`配置错误:\n  - ${validation.errors.join("\n  - ")}`);
            }

            // 连接数据库
            await this._connect();

            // 根据模式执行同步
            let result;
            switch (this.config.mode) {
                case "collection":
                    result = await this._syncCollection();
                    break;
                case "database":
                    result = await this._syncDatabase();
                    break;
                case "instance":
                    result = await this._syncInstance();
                    break;
                case "incremental":
                    result = await this._syncIncremental();
                    break;
                default:
                    throw new Error(`不支持的同步模式: ${this.config.mode}`);
            }

            return result;
        } catch (error) {
            this.logger.error(`同步失败: ${error.message}`);
            throw error;
        } finally {
            await this._disconnect();
        }
    }

    /**
     * 连接数据库
     * @private
     */
    async _connect() {
        const remoteUri = UriBuilder.build(this.config.remote);
        const localUri = UriBuilder.build(this.config.local);

        this.logger.info("正在连接远程数据库...");
        this.logger.debug(`远程 URI: ${UriBuilder.maskPassword(remoteUri)}`);
        this.remoteClient = new MongoClient(remoteUri);
        await this.remoteClient.connect();
        this.logger.success("远程数据库连接成功");

        this.logger.info("正在连接本地数据库...");
        this.logger.debug(`本地 URI: ${UriBuilder.maskPassword(localUri)}`);
        this.localClient = new MongoClient(localUri);
        await this.localClient.connect();
        this.logger.success("本地数据库连接成功\n");
    }

    /**
     * 断开连接
     * @private
     */
    async _disconnect() {
        if (this.remoteClient) {
            await this.remoteClient.close();
            this.logger.debug("远程数据库连接已关闭");
        }
        if (this.localClient) {
            await this.localClient.close();
            this.logger.debug("本地数据库连接已关闭");
        }
    }

    /**
     * 同步集合模式
     * @private
     */
    async _syncCollection() {
        if (!this.config.remote.database || !this.config.collections || this.config.collections.length === 0) {
            throw new Error("集合同步模式需要指定数据库和集合");
        }

        const remoteDb = this.remoteClient.db(this.config.remote.database);
        const localDb = this.localClient.db(this.config.local.database);

        const collectionSync = new CollectionSync({
            logger: this.logger,
            batchSize: this.config.batchSize,
            dropLocal: this.config.dropLocal,
            dryRun: this.config.dryRun,
            filter: this.config.filter || {}
        });

        const results = [];
        for (const collName of this.config.collections) {
            const result = await collectionSync.sync(remoteDb, localDb, collName);
            results.push(result);
            console.log("");
        }

        return {
            mode: "collection",
            collections: results,
            success: results.every(r => r.success)
        };
    }

    /**
     * 同步数据库模式
     * @private
     */
    async _syncDatabase() {
        const databaseSync = new DatabaseSync({
            logger: this.logger,
            batchSize: this.config.batchSize,
            dropLocal: this.config.dropLocal,
            dryRun: this.config.dryRun,
            collections: this.config.collections || [],
            excludeCollections: this.config.excludeCollections || [],
            filter: this.config.filter || {}
        });

        // 如果指定了多个数据库
        if (this.config.databases && this.config.databases.length > 0) {
            return await databaseSync.syncDatabases(
                this.remoteClient,
                this.localClient,
                this.config.databases
            );
        }

        // 单个数据库
        if (!this.config.remote.database) {
            throw new Error("数据库同步模式需要指定数据库名称");
        }

        const result = await databaseSync.syncDatabase(
            this.remoteClient,
            this.localClient,
            this.config.remote.database
        );

        return {
            mode: "database",
            ...result
        };
    }

    /**
     * 同步实例模式
     * @private
     */
    async _syncInstance() {
        const instanceSync = new InstanceSync({
            logger: this.logger,
            batchSize: this.config.batchSize,
            dropLocal: this.config.dropLocal,
            dryRun: this.config.dryRun,
            excludeDatabases: this.config.excludeDatabases || [],
            filter: this.config.filter || {}
        });

        const result = await instanceSync.syncInstance(
            this.remoteClient,
            this.localClient
        );

        return {
            mode: "instance",
            ...result
        };
    }

    /**
     * 增量同步模式
     * @private
     */
    async _syncIncremental() {
        const incrementalSync = new IncrementalSync({
            logger: this.logger,
            batchSize: this.config.batchSize,
            dryRun: this.config.dryRun,
            timestampField: this.config.timestampField || "updatedAt",
            since: this.config.since
        });

        // 如果指定了数据库
        if (this.config.remote.database) {
            const result = await incrementalSync.syncDatabase(
                this.remoteClient,
                this.localClient,
                this.config.remote.database,
                this.config.collections || []
            );

            return {
                mode: "incremental",
                ...result
            };
        }

        throw new Error("增量同步模式需要指定数据库名称");
    }
}

module.exports = SyncManager;
