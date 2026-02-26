import { faker } from '@faker-js/faker';
import type { Article, User } from '../types';

/**
 * Test Data Generator
 * Utility functions to generate realistic test data
 */

/**
 * Generate random user data
 */
export const generateUser = (prefix?: string): User => {
  const timestamp = Date.now();
  const randomString = faker.string.alphanumeric(5).toLowerCase();
  return {
    username: `${prefix ? prefix + '_' : 'user_'}${faker.internet.userName().toLowerCase().replace(/\./g, '')}_${timestamp}`,
    email: `test${timestamp}@${randomString}.example.com`,
    password: 'Test@123456',
    bio: faker.lorem.sentence(),
    image: faker.image.avatar(),
  };
};

/**
 * Generate random article data
 */
export const generateArticle = (): Article => {
  return {
    title: faker.lorem.sentence().substring(0, 50).trim(),
    description: faker.lorem.sentences(2).substring(0, 100),
    body: faker.lorem.paragraphs(3),
    tags: [faker.word.sample(), faker.word.sample(), faker.word.sample()],
  };
};

/**
 * Generate random comment
 */
export const generateComment = (): string => {
  return faker.lorem.sentence();
};
