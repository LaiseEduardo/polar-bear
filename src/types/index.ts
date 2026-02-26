/**
 * Domain Type Definitions
 * Central type definitions for test data structures
 */

export interface User {
  username: string;
  email: string;
  password: string;
  bio?: string;
  image?: string;
}

export interface Article {
  title: string;
  description: string;
  body: string;
  tags: string[];
}

export interface Comment {
  body: string;
}
