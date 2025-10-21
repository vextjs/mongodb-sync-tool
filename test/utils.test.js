/**
 * 工具函数测试
 */

const assert = require("assert");
const Formatter = require("../src/utils/formatter");
const Validator = require("../src/utils/validator");
const UriBuilder = require("../src/utils/uri-builder");

console.log("\n测试：工具函数模块");

// 测试 Formatter
console.log("\n  测试 Formatter:");
try {
    assert.strictEqual(Formatter.formatNumber(1234567), "1,234,567", "数字格式化正确");
    assert.strictEqual(Formatter.formatBytes(1024), "1 KB", "字节格式化正确");
    assert.strictEqual(Formatter.formatDuration(65), "1m 5s", "时间格式化正确");
    assert.strictEqual(Formatter.formatPercentage(50, 100), "50%", "百分比格式化正确");
    console.log("    ✓ Formatter 所有测试通过");
} catch (error) {
    console.error("    ✗ Formatter 测试失败:", error.message);
    throw error;
}

// 测试 Validator
console.log("\n  测试 Validator:");
try {
    assert.strictEqual(Validator.validateCollectionName("users"), true, "有效集合名验证通过");
    assert.strictEqual(Validator.validateCollectionName("test$invalid"), false, "无效集合名验证通过");
    assert.strictEqual(Validator.validateDatabaseName("mydb"), true, "有效数据库名验证通过");
    assert.strictEqual(Validator.validateDatabaseName("my/db"), false, "无效数据库名验证通过");
    console.log("    ✓ Validator 所有测试通过");
} catch (error) {
    console.error("    ✗ Validator 测试失败:", error.message);
    throw error;
}

// 测试 UriBuilder
console.log("\n  测试 UriBuilder:");
try {
    const uri = UriBuilder.build({
        host: "localhost",
        port: "27017",
        database: "test"
    });
    assert.strictEqual(uri, "mongodb://localhost:27017/test", "URI 构建正确");

    const maskedUri = UriBuilder.maskPassword("mongodb://user:pass@host:27017/db");
    assert.strictEqual(maskedUri, "mongodb://user:****@host:27017/db", "密码隐藏正确");
    console.log("    ✓ UriBuilder 所有测试通过");
} catch (error) {
    console.error("    ✗ UriBuilder 测试失败:", error.message);
    throw error;
}

console.log("\n✅ 工具函数所有测试通过\n");
