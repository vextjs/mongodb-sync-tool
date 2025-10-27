/**
 * 检查Places集合中两种结构的差异
 * 用于分析生产环境和新版本的数据结构区别
 */

db = db.getSiblingDB('your_database');

print('======================================');
print('Places 数据结构差异分析');
print('======================================\n');

// 1. 统计两种版本的数量
print('1️⃣  版本分布:');
print('-----------------------------------');
const withVersion = db.places.countDocuments({version: {$exists: true}});
const withoutVersion = db.places.countDocuments({version: {$exists: false}});
const total = db.places.countDocuments({});
print(`新版本(v0.1):    ${withVersion} 条 (${(withVersion/total*100).toFixed(2)}%)`);
print(`生产版本(旧):    ${withoutVersion} 条 (${(withoutVersion/total*100).toFixed(2)}%)`);
print(`总计:           ${total} 条\n`);

// 2. 检查特征字段
print('2️⃣  特征字段分布:');
print('-----------------------------------');

const fieldStats = [
  {name: 'version', desc: '版本号(新)'},
  {name: 'update_records', desc: '更新记录(新)'},
  {name: 'opening_descriptions', desc: '营业时间描述(新)'},
  {name: 'open_status', desc: '营业状态(新)'},
  {name: 'tags', desc: '标签(新)'},
  {name: 'cost', desc: '费用(新)'},
  {name: 'visit_duration', desc: '游览时长(新)'},
  {name: '__v', desc: 'Mongoose版本(旧)'},
  {name: 'price_level', desc: '价格等级(旧)'},
  {name: 'summary', desc: '摘要(旧)'},
];

fieldStats.forEach(field => {
  const count = db.places.countDocuments({[field.name]: {$exists: true}});
  const percent = total > 0 ? (count/total*100).toFixed(2) : '0.00';
  print(`${field.desc.padEnd(25)} ${count.toString().padStart(8)} 条 (${percent}%)`);
});
print('');

// 3. 检查opening_hours类型
print('3️⃣  opening_hours 结构:');
print('-----------------------------------');
const openingHoursArray = db.places.countDocuments({opening_hours: {$type: 'array'}});
const openingHoursObject = db.places.countDocuments({opening_hours: {$type: 'object', $ne: []}});
const openingHoursNull = db.places.countDocuments({opening_hours: null});
print(`数组类型(旧):    ${openingHoursArray} 条`);
print(`对象类型(新):    ${openingHoursObject} 条`);
print(`null值:         ${openingHoursNull} 条\n`);

// 4. 检查location._id
print('4️⃣  location._id 存在性:');
print('-----------------------------------');
const hasLocationId = db.places.countDocuments({'location._id': {$exists: true}});
const noLocationId = db.places.countDocuments({'location._id': {$exists: false}});
print(`有_id(旧):       ${hasLocationId} 条`);
print(`无_id(新):       ${noLocationId} 条\n`);

// 5. 抽样对比
print('5️⃣  数据样本对比:');
print('-----------------------------------');

print('\n【生产版本样本】');
const oldSample = db.places.findOne({version: {$exists: false}});
if (oldSample) {
  print(`名称: ${oldSample.name}`);
  print(`字段: ${Object.keys(oldSample).join(', ')}`);
  print(`字段数: ${Object.keys(oldSample).length}`);
} else {
  print('未找到生产版本数据');
}

print('\n【新版本样本】');
const newSample = db.places.findOne({version: {$exists: true}});
if (newSample) {
  print(`名称: ${newSample.name}`);
  print(`字段: ${Object.keys(newSample).join(', ')}`);
  print(`字段数: ${Object.keys(newSample).length}`);
  if (newSample.update_records) {
    print(`更新记录数: ${newSample.update_records.length}`);
  }
} else {
  print('未找到新版本数据');
}

// 6. 需要迁移的数据量统计
print('\n6️⃣  迁移影响评估:');
print('-----------------------------------');
const needMigration = db.places.countDocuments({version: {$exists: false}});
print(`需要迁移: ${needMigration} 条`);
if (needMigration > 0) {
  const estimatedTime = Math.ceil(needMigration / 1000) * 3; // 假设每1000条需3秒
  print(`预计耗时: 约 ${estimatedTime} 秒 (${(estimatedTime/60).toFixed(1)} 分钟)`);
}
print('');

// 7. 字段差异详细列表
print('7️⃣  详细字段差异:');
print('-----------------------------------');
print('\n新增字段 (第一种有，第二种无):');
const newFields = [
  'version', 'update_records', 'opening_descriptions', 'open_status',
  'open_time', 'close_time', 'multilingual_introduction', 'cost',
  'currency', 'visit_duration', 'intensity_coefficient', 'out_place_id', 'tags'
];
newFields.forEach(field => {
  const count = db.places.countDocuments({[field]: {$exists: true}});
  if (count > 0) print(`  ✓ ${field}: ${count} 条`);
  else print(`  ✗ ${field}: 0 条 (待添加)`);
});

print('\n删除字段 (第二种有，第一种无):');
const removeFields = ['__v', 'price_level', 'summary'];
removeFields.forEach(field => {
  const count = db.places.countDocuments({[field]: {$exists: true}});
  if (count > 0) print(`  ⚠ ${field}: ${count} 条 (需删除)`);
  else print(`  ✓ ${field}: 0 条 (已清理)`);
});

print('\n======================================');
print('分析完成');
print('======================================\n');

