/**
 * 日志工具模块
 * 提供统一的日志输出接口
 */

class Logger {
    constructor(options = {}) {
        this.silent = options.silent || false;
        this.verbose = options.verbose || false;
    }

    info(msg) {
        if (!this.silent) {
            console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`);
        }
    }

    success(msg) {
        if (!this.silent) {
            console.log(`\x1b[32m[SUCCESS]\x1b[0m ${msg}`);
        }
    }

    warn(msg) {
        if (!this.silent) {
            console.log(`\x1b[33m[WARN]\x1b[0m ${msg}`);
        }
    }

    error(msg) {
        console.error(`\x1b[31m[ERROR]\x1b[0m ${msg}`);
    }

    debug(msg) {
        if (this.verbose && !this.silent) {
            console.log(`\x1b[90m[DEBUG]\x1b[0m ${msg}`);
        }
    }

    progress(msg) {
        if (!this.silent) {
            process.stdout.write(`\r\x1b[36m[PROGRESS]\x1b[0m ${msg}`);
        }
    }

    clearProgress() {
        if (!this.silent) {
            process.stdout.write("\r\x1b[K");
        }
    }

    section(title) {
        if (!this.silent) {
            const line = "=".repeat(50);
            console.log(`\n${line}`);
            console.log(title);
            console.log(`${line}\n`);
        }
    }
}

module.exports = Logger;
