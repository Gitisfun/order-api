import { test, describe } from 'node:test';
import assert from 'node:assert';
import { formatOrderNumber } from './index.js';

describe('formatOrderNumber', () => {
  test('should format a single digit number correctly', () => {
    const result = formatOrderNumber(1);
    const now = new Date();
    const expectedYear = now.getFullYear().toString().slice(-2);
    const expectedMonth = (now.getMonth() + 1).toString().padStart(2, '0');
    
    assert.strictEqual(result, `ORD-${expectedYear}${expectedMonth}-000001`);
  });

  test('should format a three digit number correctly', () => {
    const result = formatOrderNumber(123);
    const now = new Date();
    const expectedYear = now.getFullYear().toString().slice(-2);
    const expectedMonth = (now.getMonth() + 1).toString().padStart(2, '0');
    
    assert.strictEqual(result, `ORD-${expectedYear}${expectedMonth}-000123`);
  });

  test('should format a six digit number correctly', () => {
    const result = formatOrderNumber(999999);
    const now = new Date();
    const expectedYear = now.getFullYear().toString().slice(-2);
    const expectedMonth = (now.getMonth() + 1).toString().padStart(2, '0');
    
    assert.strictEqual(result, `ORD-${expectedYear}${expectedMonth}-999999`);
  });

  test('should format a number with exactly 6 digits', () => {
    const result = formatOrderNumber(123456);
    const now = new Date();
    const expectedYear = now.getFullYear().toString().slice(-2);
    const expectedMonth = (now.getMonth() + 1).toString().padStart(2, '0');
    
    assert.strictEqual(result, `ORD-${expectedYear}${expectedMonth}-123456`);
  });

  test('should format a large number correctly', () => {
    const result = formatOrderNumber(1234567);
    const now = new Date();
    const expectedYear = now.getFullYear().toString().slice(-2);
    const expectedMonth = (now.getMonth() + 1).toString().padStart(2, '0');
    
    assert.strictEqual(result, `ORD-${expectedYear}${expectedMonth}-1234567`);
  });

  test('should always start with ORD prefix', () => {
    const result = formatOrderNumber(42);
    assert.strictEqual(result.startsWith('ORD-'), true);
  });

  test('should have correct format structure', () => {
    const result = formatOrderNumber(123);
    // Format: ORD-YYMM-NNNNNN
    const pattern = /^ORD-\d{4}-\d+$/;
    assert.strictEqual(pattern.test(result), true);
  });

  test('should throw error for zero', () => {
    assert.throws(() => {
      formatOrderNumber(0);
    }, {
      name: 'Error',
      message: 'Input must be a positive integer'
    });
  });

  test('should throw error for negative number', () => {
    assert.throws(() => {
      formatOrderNumber(-1);
    }, {
      name: 'Error',
      message: 'Input must be a positive integer'
    });
  });

  test('should throw error for non-integer number', () => {
    assert.throws(() => {
      formatOrderNumber(123.45);
    }, {
      name: 'Error',
      message: 'Input must be a positive integer'
    });
  });

  test('should throw error for string input', () => {
    assert.throws(() => {
      formatOrderNumber('123');
    }, {
      name: 'Error',
      message: 'Input must be a positive integer'
    });
  });

  test('should throw error for null', () => {
    assert.throws(() => {
      formatOrderNumber(null);
    }, {
      name: 'Error',
      message: 'Input must be a positive integer'
    });
  });

  test('should throw error for undefined', () => {
    assert.throws(() => {
      formatOrderNumber(undefined);
    }, {
      name: 'Error',
      message: 'Input must be a positive integer'
    });
  });
});

