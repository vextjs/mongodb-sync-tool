/**
 * 数据库同步测试
 */

const assert = require("assert");
const DatabaseSync = require("../src/lib/database-sync");
const Logger = require("../src/utils/logger");

console.log("\n测试：DatabaseSync 模块");

// 测试 1：创建实例
try {
    const logger = new Logger({ silent: true });
    const sync = new DatabaseSync({ logger });
    assert.ok(sync, "DatabaseSync 实例创建成功");
    console.log("  ✓ 实例创建测试通过");
} catch (error) {
    console.error("  ✗ 实例创建测试失败:", error.message);
    throw error;
}

// 测试 2：集合过滤配置
try {
    const logger = new Logger({ silent: true });
    const sync = new DatabaseSync({
        logger,
        collections: ["users", "orders"],
        excludeCollections: ["temp"]
    });
    assert.deepStrictEqual(sync.collections, ["users", "orders"], "集合列表配置正确");
    assert.deepStrictEqual(sync.excludeCollections, ["temp"], "排除集合配置正确");
    console.log("  ✓ 集合过滤配置测试通过");
} catch (error) {
    console.error("  ✗ 集合过滤配置测试失败:", error.message);
    throw error;
}

console.log("\n✅ DatabaseSync 所有测试通过\n");
