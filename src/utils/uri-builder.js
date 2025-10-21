/**
 * URI 构建工具
 * 根据配置构建 MongoDB 连接字符串
 */

class UriBuilder {
    /**
     * 构建 MongoDB URI
     * @param {Object} config - 数据库配置
     * @param {string} config.host - 主机地址
     * @param {string} config.port - 端口
     * @param {string} config.username - 用户名（可选）
     * @param {string} config.password - 密码（可选）
     * @param {string} config.database - 数据库名（可选）
     * @param {string} config.authSource - 认证数据库（默认：admin）
     * @param {Object} config.options - 其他连接选项（可选）
     * @returns {string} MongoDB URI
     */
    static build(config) {
        if (!config || !config.host || !config.port) {
            throw new Error("缺少必要的连接参数 (host 和 port)");
        }

        // 构建认证部分
        let auth = "";
        if (config.username && config.password) {
            auth = `${encodeURIComponent(config.username)}:${encodeURIComponent(config.password)}@`;
        }

        // 构建主机和端口
        const hostPort = `${config.host}:${config.port}`;

        // 构建数据库名
        const database = config.database || "";

        // 构建查询参数
        const params = [];
        if (config.username) {
            const authSource = config.authSource || "admin";
            params.push(`authSource=${authSource}`);
        }
        if (config.options) {
            Object.keys(config.options).forEach(key => {
                params.push(`${key}=${config.options[key]}`);
            });
        }

        const queryString = params.length > 0 ? `?${params.join("&")}` : "";

        return `mongodb://${auth}${hostPort}/${database}${queryString}`;
    }

    /**
     * 从 URI 中隐藏密码（用于日志输出）
     * @param {string} uri - MongoDB URI
     * @returns {string} 隐藏密码后的 URI
     */
    static maskPassword(uri) {
        if (!uri) return "";
        return uri.replace(/:([^@]+)@/, ":****@");
    }

    /**
     * 解析 URI
     * @param {string} uri - MongoDB URI
     * @returns {Object} 解析后的配置对象
     */
    static parse(uri) {
        if (!uri || typeof uri !== "string") {
            throw new Error("无效的 URI");
        }

        const result = {
            host: null,
            port: null,
            username: null,
            password: null,
            database: null,
            authSource: null,
            options: {}
        };

        try {
            // 移除协议前缀
            let cleanUri = uri.replace(/^mongodb:\/\//, "");

            // 提取认证信息
            if (cleanUri.includes("@")) {
                const [authPart, ...rest] = cleanUri.split("@");
                cleanUri = rest.join("@");

                if (authPart.includes(":")) {
                    const [username, password] = authPart.split(":");
                    result.username = decodeURIComponent(username);
                    result.password = decodeURIComponent(password);
                }
            }

            // 分离查询参数
            let [hostPart, queryPart] = cleanUri.split("?");

            // 提取数据库名
            if (hostPart.includes("/")) {
                const parts = hostPart.split("/");
                hostPart = parts[0];
                result.database = parts[1];
            }

            // 提取主机和端口
            if (hostPart.includes(":")) {
                const [host, port] = hostPart.split(":");
                result.host = host;
                result.port = port;
            } else {
                result.host = hostPart;
                result.port = "27017";
            }

            // 解析查询参数
            if (queryPart) {
                queryPart.split("&").forEach(param => {
                    const [key, value] = param.split("=");
                    if (key === "authSource") {
                        result.authSource = value;
                    } else {
                        result.options[key] = value;
                    }
                });
            }

            return result;
        } catch (error) {
            throw new Error(`URI 解析失败: ${error.message}`);
        }
    }
}

module.exports = UriBuilder;
