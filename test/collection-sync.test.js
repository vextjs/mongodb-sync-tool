/**
 * 集合同步测试
 */

const assert = require("assert");
const CollectionSync = require("../src/lib/collection-sync");
const Logger = require("../src/utils/logger");

console.log("\n测试：CollectionSync 模块");

// 测试 1：创建实例
try {
    const logger = new Logger({ silent: true });
    const sync = new CollectionSync({ logger, batchSize: 100 });
    assert.ok(sync, "CollectionSync 实例创建成功");
    assert.strictEqual(sync.batchSize, 100, "批量大小设置正确");
    console.log("  ✓ 实例创建测试通过");
} catch (error) {
    console.error("  ✗ 实例创建测试失败:", error.message);
    throw error;
}

// 测试 2：配置选项
try {
    const logger = new Logger({ silent: true });
    const sync = new CollectionSync({
        logger,
        batchSize: 500,
        dropLocal: true,
        dryRun: true
    });
    assert.strictEqual(sync.batchSize, 500, "批量大小配置正确");
    assert.strictEqual(sync.dropLocal, true, "dropLocal 配置正确");
    assert.strictEqual(sync.dryRun, true, "dryRun 配置正确");
    console.log("  ✓ 配置选项测试通过");
} catch (error) {
    console.error("  ✗ 配置选项测试失败:", error.message);
    throw error;
}

// 测试 3：默认配置
try {
    const logger = new Logger({ silent: true });
    const sync = new CollectionSync({ logger });
    assert.strictEqual(sync.batchSize, 1000, "默认批量大小正确");
    assert.strictEqual(sync.dropLocal, false, "默认不删除本地数据");
    assert.strictEqual(sync.dryRun, false, "默认非模拟运行");
    console.log("  ✓ 默认配置测试通过");
} catch (error) {
    console.error("  ✗ 默认配置测试失败:", error.message);
    throw error;
}

console.log("\n✅ CollectionSync 所有测试通过\n");
