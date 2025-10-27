/**
 * Places数据结构迁移脚本
 * 从生产环境结构迁移到v0.1版本结构
 *
 * 使用方法:
 * node src/scripts/migrate-places-to-v0.1.js --env production --batch 1000 --dryRun
 */

const { MongoClient } = require('mongodb');

// 配置
const CONFIG = {
  dryRun: process.argv.includes('--dryRun'),
  batchSize: parseInt(process.argv.find(arg => arg.startsWith('--batch='))?.split('=')[1]) || 1000,
  mongoUrl: process.env.MONGODB_URL || 'mongodb://localhost:27017',
  dbName: process.env.DB_NAME || 'your_database',
};

// 统计信息
const stats = {
  total: 0,
  processed: 0,
  success: 0,
  failed: 0,
  skipped: 0,
  errors: [],
};

/**
 * 转换单个文档
 */
function transformDocument(doc) {
  const transformed = { ...doc };
  const now = new Date();
  const updateRecords = [];

  // 1. 添加版本号
  if (!transformed.version) {
    transformed.version = '0.1';
    updateRecords.push({
      attribute: 'version',
      value: '0.1',
      source: 'places_migration_v0.1',
      update_time: now,
    });
  }

  // 2. 初始化update_records
  if (!transformed.update_records) {
    transformed.update_records = [];
  }

  // 3. 删除location._id
  if (transformed.location && transformed.location._id) {
    delete transformed.location._id;
    updateRecords.push({
      attribute: 'location._id',
      value: null,
      source: 'places_migration_v0.1',
      update_time: now,
    });
  }

  // 4. 转换opening_hours从数组到对象
  if (Array.isArray(transformed.opening_hours)) {
    if (transformed.opening_hours.length === 0) {
      transformed.opening_hours = {};
    }
    updateRecords.push({
      attribute: 'opening_hours',
      value: transformed.opening_hours,
      source: 'places_migration_v0.1',
      update_time: now,
    });
  }

  // 5. 添加新字段（如果不存在）
  const newFields = {
    open_status: 1,
    opening_descriptions: null,
    open_time: null,
    close_time: null,
    multilingual_introduction: null,
    cost: null,
    currency: null,
    visit_duration: null,
    intensity_coefficient: null,
    out_place_id: null,
    tags: null,
  };

  Object.entries(newFields).forEach(([field, defaultValue]) => {
    if (!(field in transformed)) {
      transformed[field] = defaultValue;
      updateRecords.push({
        attribute: field,
        value: defaultValue,
        source: 'places_migration_v0.1',
        update_time: now,
      });
    }
  });

  // 6. 处理price_level转换为cost（可选）
  if (transformed.price_level !== undefined) {
    // 价格等级映射（可根据实际情况调整）
    const priceLevelMap = {
      1: 10,
      2: 30,
      3: 60,
      4: 100,
    };

    if (!transformed.cost && transformed.price_level in priceLevelMap) {
      transformed.cost = priceLevelMap[transformed.price_level];
      transformed.currency = 'USD'; // 根据country_iso_code设置
      updateRecords.push({
        attribute: 'cost',
        value: transformed.cost,
        source: 'places_migration_v0.1_from_price_level',
        update_time: now,
      });
      updateRecords.push({
        attribute: 'currency',
        value: transformed.currency,
        source: 'places_migration_v0.1_from_price_level',
        update_time: now,
      });
    }
  }

  // 7. 合并summary到introduction（如果需要）
  if (transformed.summary && transformed.introduction) {
    // 如果introduction已经包含summary，不重复添加
    if (!transformed.introduction.includes(transformed.summary)) {
      transformed.introduction = `${transformed.summary}\n\n${transformed.introduction}`;
      updateRecords.push({
        attribute: 'introduction',
        value: 'merged_from_summary',
        source: 'places_migration_v0.1',
        update_time: now,
      });
    }
  } else if (transformed.summary && !transformed.introduction) {
    transformed.introduction = transformed.summary;
    updateRecords.push({
      attribute: 'introduction',
      value: 'from_summary',
      source: 'places_migration_v0.1',
      update_time: now,
    });
  }

  // 8. 删除旧字段
  const fieldsToRemove = ['__v', 'price_level', 'summary'];
  fieldsToRemove.forEach(field => {
    if (field in transformed) {
      const oldValue = transformed[field];
      delete transformed[field];
      updateRecords.push({
        attribute: field,
        value: `removed_old_value_${oldValue}`,
        source: 'places_migration_v0.1',
        update_time: now,
      });
    }
  });

  // 9. 添加更新记录
  transformed.update_records = [
    ...transformed.update_records,
    ...updateRecords,
  ];

  // 10. 更新updated_at
  transformed.updated_at = now;

  return transformed;
}

/**
 * 迁移主函数
 */
async function migrate() {
  console.log('🚀 Places数据结构迁移开始');
  console.log('配置:', CONFIG);
  console.log('-----------------------------------\n');

  let client;

  try {
    // 连接数据库
    console.log('📡 连接数据库...');
    client = new MongoClient(CONFIG.mongoUrl);
    await client.connect();
    console.log('✅ 数据库连接成功\n');

    const db = client.db(CONFIG.dbName);
    const collection = db.collection('places');

    // 统计总数
    stats.total = await collection.countDocuments({
      version: { $exists: false }  // 只迁移未迁移的文档
    });

    console.log(`📊 待迁移文档总数: ${stats.total}\n`);

    if (stats.total === 0) {
      console.log('✅ 没有需要迁移的文档');
      return;
    }

    if (CONFIG.dryRun) {
      console.log('🔍 DRY RUN模式 - 不会实际修改数据\n');
    }

    // 分批处理
    let skip = 0;
    while (skip < stats.total) {
      const startTime = Date.now();

      console.log(`\n📦 处理批次 ${Math.floor(skip / CONFIG.batchSize) + 1}...`);
      console.log(`   范围: ${skip + 1} - ${Math.min(skip + CONFIG.batchSize, stats.total)}`);

      // 读取批次数据
      const documents = await collection
        .find({ version: { $exists: false } })
        .limit(CONFIG.batchSize)
        .toArray();

      if (documents.length === 0) {
        break;
      }

      // 转换文档
      const bulkOps = [];
      for (const doc of documents) {
        try {
          const transformed = transformDocument(doc);

          if (!CONFIG.dryRun) {
            bulkOps.push({
              updateOne: {
                filter: { _id: doc._id },
                update: { $set: transformed },
              },
            });
          }

          stats.success++;
        } catch (error) {
          stats.failed++;
          stats.errors.push({
            _id: doc._id,
            name: doc.name,
            error: error.message,
          });
          console.error(`   ❌ 转换失败: ${doc.name} (${doc._id})`, error.message);
        }
      }

      // 批量更新
      if (!CONFIG.dryRun && bulkOps.length > 0) {
        try {
          const result = await collection.bulkWrite(bulkOps, { ordered: false });
          console.log(`   ✅ 成功更新: ${result.modifiedCount} 条`);
        } catch (error) {
          console.error(`   ❌ 批量更新失败:`, error.message);
          stats.failed += bulkOps.length;
        }
      } else if (CONFIG.dryRun) {
        console.log(`   🔍 DRY RUN: 将更新 ${bulkOps.length} 条`);
      }

      stats.processed += documents.length;

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      const progress = ((stats.processed / stats.total) * 100).toFixed(2);
      console.log(`   ⏱️  耗时: ${elapsed}s | 进度: ${progress}%`);

      skip += CONFIG.batchSize;
    }

    // 打印统计信息
    console.log('\n');
    console.log('===================================');
    console.log('📊 迁移完成统计');
    console.log('===================================');
    console.log(`总计文档:   ${stats.total}`);
    console.log(`已处理:     ${stats.processed}`);
    console.log(`成功:       ${stats.success}`);
    console.log(`失败:       ${stats.failed}`);
    console.log(`跳过:       ${stats.skipped}`);
    console.log('===================================\n');

    if (stats.errors.length > 0) {
      console.log('❌ 错误详情:');
      stats.errors.slice(0, 10).forEach(err => {
        console.log(`   - ${err.name} (${err._id}): ${err.error}`);
      });
      if (stats.errors.length > 10) {
        console.log(`   ... 还有 ${stats.errors.length - 10} 个错误`);
      }
    }

    // 验证迁移结果
    if (!CONFIG.dryRun) {
      console.log('\n🔍 验证迁移结果...');
      const verifyResults = await verifyMigration(collection);
      console.log('验证结果:', verifyResults);
    }

  } catch (error) {
    console.error('❌ 迁移过程发生错误:', error);
    throw error;
  } finally {
    if (client) {
      await client.close();
      console.log('\n📡 数据库连接已关闭');
    }
  }
}

/**
 * 验证迁移结果
 */
async function verifyMigration(collection) {
  const checks = {
    hasVersion: await collection.countDocuments({ version: '0.1' }),
    hasUpdateRecords: await collection.countDocuments({ update_records: { $exists: true } }),
    noLocationId: await collection.countDocuments({ 'location._id': { $exists: false } }),
    noV: await collection.countDocuments({ __v: { $exists: false } }),
    noPriceLevel: await collection.countDocuments({ price_level: { $exists: false } }),
    noSummary: await collection.countDocuments({ summary: { $exists: false } }),
    total: await collection.countDocuments({}),
  };

  return {
    ...checks,
    allValid: Object.entries(checks).every(([key, value]) =>
      key === 'total' || value === checks.total
    ),
  };
}

// 运行迁移
if (require.main === module) {
  migrate()
    .then(() => {
      console.log('\n✅ 迁移脚本执行完成');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ 迁移脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { migrate, transformDocument };

