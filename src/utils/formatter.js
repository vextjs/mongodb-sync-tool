/**
 * 格式化工具
 * 提供数字、时间等格式化功能
 */

class Formatter {
    /**
     * 格式化数字（添加千分位分隔符）
     * @param {number} num - 数字
     * @returns {string} 格式化后的字符串
     */
    static formatNumber(num) {
        if (num === null || num === undefined) return "0";
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    /**
     * 格式化字节大小
     * @param {number} bytes - 字节数
     * @returns {string} 格式化后的字符串
     */
    static formatBytes(bytes) {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
    }

    /**
     * 格式化时间（秒）
     * @param {number} seconds - 秒数
     * @returns {string} 格式化后的字符串
     */
    static formatDuration(seconds) {
        if (seconds < 60) {
            return `${seconds.toFixed(2)}s`;
        }
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        if (minutes < 60) {
            return `${minutes}m ${remainingSeconds}s`;
        }
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
    }

    /**
     * 格式化百分比
     * @param {number} current - 当前值
     * @param {number} total - 总值
     * @returns {string} 格式化后的百分比字符串
     */
    static formatPercentage(current, total) {
        if (total === 0) return "0%";
        const percentage = Math.floor((current / total) * 100);
        return `${percentage}%`;
    }

    /**
     * 格式化速度（文档/秒）
     * @param {number} count - 文档数
     * @param {number} seconds - 秒数
     * @returns {string} 格式化后的速度字符串
     */
    static formatSpeed(count, seconds) {
        if (seconds === 0) return "N/A";
        const speed = Math.floor(count / seconds);
        return `${this.formatNumber(speed)} docs/s`;
    }

    /**
     * 创建进度条
     * @param {number} current - 当前值
     * @param {number} total - 总值
     * @param {number} width - 进度条宽度
     * @returns {string} 进度条字符串
     */
    static createProgressBar(current, total, width = 30) {
        if (total === 0) return "[" + " ".repeat(width) + "]";
        const percentage = current / total;
        const filled = Math.floor(percentage * width);
        const empty = width - filled;
        return "[" + "=".repeat(filled) + " ".repeat(empty) + "]";
    }

    /**
     * 格式化时间戳为可读日期
     * @param {Date|number} timestamp - 时间戳
     * @returns {string} 格式化后的日期字符串
     */
    static formatDate(timestamp) {
        const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
        return date.toLocaleString("zh-CN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        });
    }
}

module.exports = Formatter;
