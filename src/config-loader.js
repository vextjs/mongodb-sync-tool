/**
 * 配置加载器
 * 从环境变量和命令行参数加载配置
 */

require("dotenv").config();

class ConfigLoader {
    /**
     * 加载配置
     * @param {string[]} argv - 命令行参数
     * @returns {Object} 配置对象
     */
    static load(argv = process.argv.slice(2)) {
        const args = this._parseArgs(argv);

        const config = {
            // 远程数据库配置
            remote: {
                host: this._getConfig("REMOTE_HOST", "remote-host", args) || "localhost",
                port: this._getConfig("REMOTE_PORT", "remote-port", args) || "27017",
                username: this._getConfig("REMOTE_USER", "remote-user", args) || "",
                password: this._getConfig("REMOTE_PASS", "remote-pass", args) || "",
                database: this._getConfig("REMOTE_DB", "remote-db", args) || this._getConfig("", "db", args) || "",
                authSource: this._getConfig("REMOTE_AUTH_SOURCE", "remote-auth-source", args) || "admin",
                options: {
                    directConnection: true
                }
            },

            // 本地数据库配置
            local: {
                host: this._getConfig("LOCAL_HOST", "local-host", args) || "localhost",
                port: this._getConfig("LOCAL_PORT", "local-port", args) || "27017",
                username: this._getConfig("LOCAL_USER", "local-user", args) || "",
                password: this._getConfig("LOCAL_PASS", "local-pass", args) || "",
                database: this._getConfig("LOCAL_DB", "local-db", args) || this._getConfig("", "db", args) || "",
                authSource: this._getConfig("LOCAL_AUTH_SOURCE", "local-auth-source", args) || "admin"
            },

            // 同步模式
            mode: this._getMode(args),

            // 集合列表
            collections: this._getList("COLLECTIONS", "collections", args),

            // 数据库列表
            databases: this._getList("DATABASES", "databases", args),

            // 排除的集合
            excludeCollections: this._getList("EXCLUDE_COLLECTIONS", "exclude-collections", args),

            // 排除的数据库
            excludeDatabases: this._getList("EXCLUDE_DATABASES", "exclude-databases", args),

            // 同步选项
            batchSize: parseInt(this._getConfig("BATCH_SIZE", "batch-size", args) || "1000"),
            dropLocal: this._getConfig("DROP_LOCAL", "", args) === "true" || args.flags.includes("drop-local"),
            dryRun: this._getConfig("DRY_RUN", "", args) === "true" || args.flags.includes("dry-run"),
            verbose: args.flags.includes("verbose") || args.flags.includes("v"),
            silent: args.flags.includes("silent"),

            // 增量同步选项
            timestampField: this._getConfig("TIMESTAMP_FIELD", "timestamp-field", args) || "updatedAt",
            since: this._getConfig("SINCE", "since", args) || null,

            // 过滤条件（JSON 字符串）
            filter: this._parseFilter(this._getConfig("FILTER", "filter", args))
        };

        // 如果指定了 since，转换为 Date 对象
        if (config.since) {
            try {
                config.since = new Date(config.since);
            } catch (error) {
                throw new Error(`无效的时间格式: ${config.since}`);
            }
        }

        return config;
    }

    /**
     * 解析命令行参数
     * @private
     */
    static _parseArgs(argv) {
        const args = { options: {}, flags: [] };

        for (let i = 0; i < argv.length; i++) {
            const arg = argv[i];

            if (arg.startsWith("--")) {
                const key = arg.substring(2);
                const nextArg = argv[i + 1];

                // 如果下一个参数不是选项，则作为值
                if (nextArg && !nextArg.startsWith("--")) {
                    args.options[key] = nextArg;
                    i++;
                } else {
                    args.flags.push(key);
                }
            }
        }

        return args;
    }

    /**
     * 获取配置值（优先级：命令行 > 环境变量 > 默认值）
     * @private
     */
    static _getConfig(envKey, argKey, args) {
        if (argKey && args.options[argKey]) {
            return args.options[argKey];
        }
        if (envKey && process.env[envKey]) {
            return process.env[envKey];
        }
        return null;
    }

    /**
     * 获取列表配置（逗号分隔）
     * @private
     */
    static _getList(envKey, argKey, args) {
        const value = this._getConfig(envKey, argKey, args);
        if (!value) return [];
        return value.split(",").map(v => v.trim()).filter(Boolean);
    }

    /**
     * 确定同步模式
     * @private
     */
    static _getMode(args) {
        if (args.options.mode) {
            return args.options.mode;
        }
        if (args.flags.includes("incremental")) {
            return "incremental";
        }
        if (args.flags.includes("sync-all") || args.flags.includes("all-databases")) {
            return "instance";
        }
        if (args.options.databases || process.env.DATABASES) {
            return "database";
        }
        if (args.options.collections || process.env.COLLECTIONS) {
            return "collection";
        }
        // 默认为数据库模式
        return "database";
    }

    /**
     * 解析过滤条件
     * @private
     */
    static _parseFilter(filterStr) {
        if (!filterStr) return {};
        try {
            return JSON.parse(filterStr);
        } catch (error) {
            throw new Error(`无效的过滤条件 JSON: ${filterStr}`);
        }
    }
}

module.exports = ConfigLoader;
