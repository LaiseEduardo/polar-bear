# RealWorld Polar Bear Framework

A clean, maintainable test automation framework for the [RealWorld demo application](https://demo.realworld.how) using Playwright and TypeScript.

[![Playwright Tests](https://github.com/LaiseEduardo/polar-bear/actions/workflows/playwright.yml/badge.svg)](https://github.com/LaiseEduardo/polar-bear/actions/workflows/playwright.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Playwright](https://img.shields.io/badge/Playwright-1.41-green)](https://playwright.dev/)

---

## 📋 Requirements

### Required

- **Node.js**: v18.5.0+ ([Download](https://nodejs.org/))
- **npm**: v9.0.0+ (comes with Node.js)
- **Docker Desktop**: Latest version ([Download](https://www.docker.com/products/docker-desktop))
- **Git**: For cloning the repository

### Recommended

- **NVM** (Node Version Manager): For managing Node.js versions ([Install Guide](https://github.com/nvm-sh/nvm))

### Verify Installation

```bash
node --version              # Should be v18.5.0+
npm --version               # Should be v9+
docker --version            # Should show Docker version
docker compose version      # Should show Docker Compose version
```

### Using NVM (Recommended)

This project includes a `.nvmrc` file to ensure the correct Node.js version:

```bash
nvm use                     # Automatically uses v18.5.0 from .nvmrc
```

---

## 🚀 Quick Start

### Option 1: Automated Setup (Recommended)

The fastest way to get started:

```bash
# 1. Clone repository
git clone https://github.com/LaiseEduardo/polar-bear.git
cd polar-bear

# 2. Use correct Node.js version (if using NVM)
nvm use

# 3. Run automated setup
./setup-local.sh
# or
npm run setup:automated
```

This automated script will:

- ✅ Check all prerequisites (Docker, Node.js)
- ✅ Install npm dependencies
- ✅ Install Playwright browsers
- ✅ Create environment configuration
- ✅ Start Docker containers
- ✅ Run smoke tests to verify everything works

### Option 2: Manual Setup

If you prefer manual control:

```bash
# 1. Clone repository
git clone https://github.com/LaiseEduardo/polar-bear.git
cd polar-bear

# 2. Use correct Node.js version (if using NVM)
nvm use

# 3. Install dependencies
npm install

# 4. Install Playwright browsers
npx playwright install --with-deps

# 5. Start the application (Docker)
npm run app:start

# 6. Wait for services to be ready (~30 seconds)

# 7. Run tests
npm test

# 8. View test report
npm run report
```

---

## 🌐 Application Under Test

- **URL**: http://localhost:4200
- **API**: http://localhost:8000/api
- **Spec**: [RealWorld API Documentation](https://realworld-docs.netlify.app/docs/specs/backend-specs/endpoints)

---

## 🏗 Framework Architecture

```
polar-bear/
├── src/
│   ├── constants/
│   │   ├── locators.ts            # UI selectors
│   │   ├── paths.ts               # API endpoints
│   │   └── index.ts               # Barrel export
│   ├── helpers/
│   │   ├── auth.helper.ts         # Authentication functions
│   │   ├── article.helper.ts      # Article interaction functions
│   │   ├── navigation.helper.ts   # Navigation functions
│   │   └── index.ts               # Barrel export
│   └── utils/
│       └── TestDataGenerator.ts   # Test data factory
├── tests/
│   ├── auth/
│   │   └── auth.spec.ts           # Authentication tests
│   ├── articles/
│   │   └── articles.spec.ts       # Article tests
│   └── feed/
│       └── feed.spec.ts           # Feed tests
├── playwright.config.ts           # Playwright configuration
├── tsconfig.json                  # TypeScript configuration
├── package.json                   # Dependencies & scripts
├── setup-local.sh                 # Automated setup script
└── run-tests.sh                   # Test runner script
```

### Design Patterns & Principles

- **Functional Composition**: Modern approach using composable helper functions instead of Page Object Model
- **Arrow Functions**: Consistent ES6+ syntax throughout the codebase
- **Centralized Constants**: All UI selectors and API paths in dedicated constant files
- **Dynamic Test Data**: @faker-js/faker v8.3+ for unique, realistic test data generation
- **API Validation**: Intercept and validate API responses (e.g., 201 status on registration)
- **Explicit Waits**: Playwright's auto-waiting mechanisms, no arbitrary `sleep()` calls
- **Test Isolation**: Each test is fully independent with unique data - no test dependencies
- **Hash-based Routing**: Angular HashLocationStrategy support (`/#/path` URLs)
- **Single Responsibility**: Each helper function has one clear, focused purpose

## 🧪 Running Tests

### All Tests

```bash
npm test                           # Run all tests
```

### By Feature

```bash
npm run test:auth                  # Authentication tests
npm run test:articles              # Article tests
npm run test:feed                  # Feed tests
npm run test:core                  # Core tagged tests only
```

### Debug & Development Modes

```bash
npm run test:ui                    # Interactive UI mode
npm run test:debug                 # Step-by-step debugging
npm run test:headed                # See browser while tests run
```

### By tag

```bash
npm run test:core                      # Headless core tests
npm run test:headed -- --grep @core    # Headed tests with tag @core
```

### Application Management

```bash
npm run app:start                  # Start Docker containers
npm run app:stop                   # Stop containers
npm run app:restart                # Restart containers
```

## 📊 Reporting

View the last test report:

```bash
npm run report:open
```

Reports are located in `playwright-report/` directory and include:

- Screenshots on failure
- Videos on failure
- Traces for debugging

## 📝 Writing Tests

### Test Organization

Tests are organized by feature with descriptive tags:

```typescript
test.describe('Feature Name @feature', () => {
  test('should do something @core', async ({ page }) => {
    // Test implementation
  });
});
```

### Available Tags

- `@core`: Core user journeys (critical path)
- `@auth`: Authentication tests
- `@articles`: Article-related tests
- `@feed`: Feed-related tests

### Test Suites

**Authentication** (`tests/auth/auth.spec.ts`)

- User registration
- User login
- Navigation between auth pages

**Articles** (`tests/articles/articles.spec.ts`)

- Create articles
- View my articles
- Add comments
- Delete articles

**Feed** (`tests/feed/feed.spec.ts`)

- View global feed
- Follow users
- View personalized feed

### Using Helpers

```typescript
import { registerAndLogin } from '@helpers/auth.helper';
import { createArticle } from '@helpers/article.helper';

test('example test', async ({ page }) => {
  // Use functional helpers
  await registerAndLogin(page);
  await createArticle(page, 'Title', 'Description', 'Body');
});
```

## 🔄 CI/CD

GitHub Actions workflow runs automatically on:

- Push to main
- Pull requests
- Daily schedule (2 AM UTC)

Configuration: `.github/workflows/playwright.yml`

## 🛠 Code Quality

Run linting:

```bash
npm run lint                       # Check code quality
npm run lint:fix                   # Auto-fix issues
npm run format                     # Format code with Prettier
npm run type-check                 # TypeScript type checking
```

## 📚 Resources

- **Application**: http://localhost:4200
- [Playwright Documentation](https://playwright.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [RealWorld API Spec](https://realworld-docs.netlify.app/)

## 👤 Author

**Laise Eduardo**
