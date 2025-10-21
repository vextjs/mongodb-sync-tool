/**
 * 测试运行器
 * 运行所有测试用例
 */

console.log("\n==================== MongoDB 同步工具 - 测试套件 ====================\n");

const tests = [
    "./collection-sync.test.js",
    "./database-sync.test.js",
    "./incremental-sync.test.js",
    "./utils.test.js"
];

let passedTests = 0;
let failedTests = 0;

async function runTests() {
    for (const testFile of tests) {
        try {
            console.log(`\n▶ 运行测试: ${testFile}`);
            require(testFile);
            passedTests++;
            console.log(`✅ 通过\n`);
        } catch (error) {
            failedTests++;
            console.error(`❌ 失败: ${error.message}\n`);
            if (process.argv.includes("--verbose")) {
                console.error(error.stack);
            }
        }
    }

    console.log("\n==================== 测试总结 ====================");
    console.log(`总测试数: ${tests.length}`);
    console.log(`✅ 通过: ${passedTests}`);
    console.log(`❌ 失败: ${failedTests}`);
    console.log(`覆盖率: ${Math.floor(passedTests / tests.length * 100)}%`);
    console.log("==================================================\n");

    process.exit(failedTests > 0 ? 1 : 0);
}

runTests();
