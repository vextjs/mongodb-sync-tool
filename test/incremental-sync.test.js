/**
 * 增量同步测试
 */

const assert = require("assert");
const IncrementalSync = require("../src/lib/incremental-sync");
const Logger = require("../src/utils/logger");

console.log("\n测试：IncrementalSync 模块");

// 测试 1：创建实例
try {
    const logger = new Logger({ silent: true });
    const sync = new IncrementalSync({ logger });
    assert.ok(sync, "IncrementalSync 实例创建成功");
    assert.strictEqual(sync.timestampField, "updatedAt", "默认时间戳字段正确");
    console.log("  ✓ 实例创建测试通过");
} catch (error) {
    console.error("  ✗ 实例创建测试失败:", error.message);
    throw error;
}

// 测试 2：自定义时间戳字段
try {
    const logger = new Logger({ silent: true });
    const sync = new IncrementalSync({
        logger,
        timestampField: "modifiedAt",
        since: new Date("2025-01-01")
    });
    assert.strictEqual(sync.timestampField, "modifiedAt", "自定义时间戳字段正确");
    assert.ok(sync.since instanceof Date, "since 时间配置正确");
    console.log("  ✓ 时间戳字段配置测试通过");
} catch (error) {
    console.error("  ✗ 时间戳字段配置测试失败:", error.message);
    throw error;
}

console.log("\n✅ IncrementalSync 所有测试通过\n");
