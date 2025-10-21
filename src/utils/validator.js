/**
 * 参数校验模块
 * 提供输入参数的校验功能
 */

class Validator {
    /**
     * 校验配置对象
     * @param {Object} config - 配置对象
     * @returns {Object} 校验结果 { valid: boolean, errors: string[] }
     */
    static validateConfig(config) {
        const errors = [];

        // 校验远程数据库配置
        if (!config.remote) {
            errors.push("缺少远程数据库配置 (remote)");
        } else {
            if (!config.remote.host) {
                errors.push("缺少远程主机地址 (remote.host)");
            }
            if (!config.remote.port) {
                errors.push("缺少远程端口 (remote.port)");
            }
        }

        // 校验本地数据库配置
        if (!config.local) {
            errors.push("缺少本地数据库配置 (local)");
        } else {
            if (!config.local.host) {
                errors.push("缺少本地主机地址 (local.host)");
            }
            if (!config.local.port) {
                errors.push("缺少本地端口 (local.port)");
            }
        }

        // 校验同步模式
        if (config.mode) {
            const validModes = ["collection", "database", "instance", "incremental"];
            if (!validModes.includes(config.mode)) {
                errors.push(`无效的同步模式: ${config.mode}，有效值: ${validModes.join(", ")}`);
            }
        }

        // 校验批量大小
        if (config.batchSize) {
            const batchSize = parseInt(config.batchSize);
            if (isNaN(batchSize) || batchSize <= 0) {
                errors.push("批量大小必须是正整数");
            }
            if (batchSize > 10000) {
                errors.push("批量大小不建议超过 10000");
            }
        }

        // 校验集合名称
        if (config.collections && config.collections.length > 0) {
            config.collections.forEach(name => {
                if (typeof name !== "string" || name.trim() === "") {
                    errors.push(`无效的集合名称: ${name}`);
                }
            });
        }

        // 校验数据库名称
        if (config.databases && config.databases.length > 0) {
            config.databases.forEach(name => {
                if (typeof name !== "string" || name.trim() === "") {
                    errors.push(`无效的数据库名称: ${name}`);
                }
            });
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * 校验连接 URI
     * @param {string} uri - MongoDB URI
     * @returns {boolean}
     */
    static validateUri(uri) {
        if (!uri || typeof uri !== "string") {
            return false;
        }
        return uri.startsWith("mongodb://") || uri.startsWith("mongodb+srv://");
    }

    /**
     * 校验集合名称
     * @param {string} name - 集合名称
     * @returns {boolean}
     */
    static validateCollectionName(name) {
        if (!name || typeof name !== "string") {
            return false;
        }
        // MongoDB 集合名称规则
        if (name.includes("$") && !name.startsWith("system.")) {
            return false;
        }
        if (name.includes("\0")) {
            return false;
        }
        return true;
    }

    /**
     * 校验数据库名称
     * @param {string} name - 数据库名称
     * @returns {boolean}
     */
    static validateDatabaseName(name) {
        if (!name || typeof name !== "string") {
            return false;
        }
        // MongoDB 数据库名称规则
        const invalidChars = /[/\\. "$*<>:|?]/;
        if (invalidChars.test(name)) {
            return false;
        }
        if (name.length > 64) {
            return false;
        }
        return true;
    }
}

module.exports = Validator;
