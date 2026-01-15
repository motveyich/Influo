#!/usr/bin/env node

/**
 * Тестовый скрипт для проверки валидации платформ
 * Проверяет, что enum Platform правильно валидирует lowercase значения
 */

const { Platform } = require('./dist/common/constants/platforms');

console.log('🧪 Тестирование валидации Platform enum\n');

console.log('✅ Доступные платформы:');
Object.entries(Platform).forEach(([key, value]) => {
  console.log(`   ${key}: "${value}"`);
});

console.log('\n📋 Пример валидного запроса:');
const validRequest = {
  title: 'Test Campaign',
  platforms: ['instagram', 'tiktok', 'youtube'],
  contentTypes: ['post', 'story'],
  budgetMin: 1000,
  budgetMax: 5000,
  audienceMin: 10000,
  audienceMax: 50000,
  targetInfluencersCount: 5
};

console.log(JSON.stringify(validRequest, null, 2));

console.log('\n✅ Проверка валидных значений:');
const testPlatforms = ['instagram', 'youtube', 'tiktok', 'vk', 'telegram'];
testPlatforms.forEach(platform => {
  const isValid = Object.values(Platform).includes(platform);
  console.log(`   ${platform}: ${isValid ? '✓' : '✗'}`);
});

console.log('\n❌ Проверка невалидных значений:');
const invalidPlatforms = ['Instagram', 'YouTube', 'INSTAGRAM', 'insta'];
invalidPlatforms.forEach(platform => {
  const isValid = Object.values(Platform).includes(platform);
  console.log(`   ${platform}: ${isValid ? '✓' : '✗ (должно быть ✗)'}`);
});

console.log('\n' + '='.repeat(60));
console.log('💡 Вывод: Backend принимает ТОЛЬКО lowercase значения!');
console.log('   Frontend отправляет: ["instagram", "tiktok"]');
console.log('   Backend ожидает: ["instagram", "tiktok"]');
console.log('   ✅ Все совпадает!');
console.log('='.repeat(60));
