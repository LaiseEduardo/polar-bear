# 🚀 CI/CD Optimization Guide

## Overview

This guide explains the caching and optimization strategies implemented in the GitHub Actions workflows to minimize build times and resource usage.

---

## ⚡ Optimization Strategies

### 1. **Node Modules Caching**

**Purpose**: Avoid re-downloading npm packages when dependencies haven't changed.

```yaml
- name: Cache node_modules
  uses: actions/cache@v4
  with:
    path: node_modules
    key: node-modules-${{ runner.os }}-${{ hashFiles('package-lock.json') }}
```

**How it works:**

- Creates a cache key based on `package-lock.json` checksum
- If `package-lock.json` hasn't changed → cache hit → `npm ci` runs fast (validates/links only)
- If `package-lock.json` changed → cache miss → `npm ci` installs fresh and updates cache

**Time saved:** ~30-45 seconds per job when cache hits

**Note:** We always run `npm ci` (not conditional) because:

- It ensures proper binary linking (needed for `npx` commands)
- It's very fast with cache (~5-10s vs ~45s without cache)
- It validates package integrity
- More reliable than artifact-based approaches

---

### 2. **Playwright Browser Caching**

**Purpose**: Avoid re-downloading browser binaries (~300MB per browser).

```yaml
- name: Get Playwright version
  id: playwright-version
  run: echo "version=$(npm list @playwright/test --depth=0 --json | jq -r '.dependencies."@playwright/test".version')" >> $GITHUB_OUTPUT

- name: Cache Playwright browsers
  uses: actions/cache@v4
  with:
    path: ~/.cache/ms-playwright
    key: playwright-${{ runner.os }}-${{ steps.playwright-version.outputs.version }}-${{ matrix.browser }}
```

**How it works:**

- Cache key includes Playwright version and browser name
- Browser binaries stored at `~/.cache/ms-playwright`
- On cache hit: skip browser download, only install system deps
- On cache miss: download browser and system dependencies

**Time saved:** ~60-90 seconds per browser (chromium: ~150MB, firefox: ~80MB, webkit: ~70MB)

---

### 3. **Conditional Browser Installation**

**Purpose**: Only install what's missing.

```yaml
- name: Install dependencies
  run: npm ci # Always run for reliability (fast with cache)

- name: Install Playwright Browsers
  if: steps.cache-playwright.outputs.cache-hit != 'true'
  run: npx playwright install --with-deps ${{ matrix.browser }}

- name: Install Playwright system dependencies
  if: steps.cache-playwright.outputs.cache-hit == 'true'
  run: npx playwright install-deps ${{ matrix.browser }}
```

**How it works:**

- npm ci always runs (but is very fast with node_modules cache)
- When browser is cached, only installs system dependencies (apt packages)
- When browser not cached, installs both browser and system dependencies
- Ensures binaries are properly linked and available to `npx` commands

**Time saved:** ~60-90 seconds when browser cache hits

---

### 4. **Automated Docker Application Management**

**Purpose**: Start the application under test before running tests, stop it after.

```yaml
- name: Start Docker application
  working-directory: ./app
  run: |
    docker compose up -d
    echo "Waiting for application to be ready..."
    timeout 60 bash -c 'until curl -f http://localhost:4200 > /dev/null 2>&1; do sleep 2; done'

- name: Run Playwright tests
  run: npm test -- --project=${{ matrix.browser }}
  env:
    CI: true
    BASE_URL: http://localhost:4200

- name: Stop Docker application
  if: always()
  working-directory: ./app
  run: docker compose down
```

**How it works:**

- Starts Docker Compose before tests (`docker compose up -d`)
- Waits for application to be ready (health check via curl)
- Sets BASE_URL environment variable for Playwright
- Always stops Docker after tests (even if tests fail)

**Time added:** ~20 seconds (application startup)
**Benefits:**

- Tests run against real application (not mocked)
- Consistent environment between local and CI
- Automatic cleanup prevents resource leaks

---

## 📊 Performance Comparison

### Without Optimization (No Cache)

```
┌───────────────────┬──────────┐
│ Step              │ Duration │
├───────────────────┼──────────┤
│ npm ci            │ ~45s     │
│ Install browser   │ ~70s     │
│ Start Docker app  │ ~20s     │
│ Run tests         │ ~120s    │
├───────────────────┼──────────┤
│ TOTAL             │ ~255s    │
└───────────────────┴──────────┘
```

### With Optimization (Warm Cache)

```
┌─────────────────────────┬──────────┐
│ Step                    │ Duration │
├─────────────────────────┼──────────┤
│ npm ci (with cache)     │ ~8s      │
│ Restore browser cache   │ ~10s     │
│ Install system deps     │ ~15s     │
│ Start Docker app        │ ~20s     │
│ Run tests              │ ~120s    │
├─────────────────────────┼──────────┤
│ TOTAL                   │ ~173s    │
└─────────────────────────┴──────────┘

Time saved: ~82s (32% faster)
```

### Multi-Browser Run (Scheduled Job)

```
Without optimization: ~255s × 3 browsers = ~765s (12.75 min)
With optimization:    ~173s × 3 browsers = ~519s (8.65 min)

Time saved: ~246s (32% faster for parallel matrix)
```

---

## 🔄 Cache Invalidation Strategy

### When Caches Are Invalidated:

1. **node_modules cache:**
   - `package-lock.json` changes
   - Manual cache delete from GitHub UI
   - 7 days of inactivity (GitHub default)

2. **Playwright browser cache:**
   - Playwright version upgraded in `package.json`
   - Browser name changes in matrix
   - OS changes
   - Manual cache delete

### Cache Restore Priority:

```yaml
restore-keys: |
  playwright-${{ runner.os }}-${{ steps.playwright-version.outputs.version }}-
  playwright-${{ runner.os }}-
```

**Fallback behavior:**

1. Try exact match: `playwright-ubuntu-1.41-chromium`
2. Try version match: `playwright-ubuntu-1.41-*`
3. Try OS match: `playwright-ubuntu-*`
4. No match → fresh install

---

## 💡 Best Practices Implemented

### ✅ 1. Two-Layer Caching Strategy

- **Level 1**: node_modules cache (GitHub Actions cache)
- **Level 2**: Browser binaries cache (GitHub Actions cache)
- Always run `npm ci` for reliability (fast with cache)

### ✅ 2. Granular Cache Keys

- Include all variables that affect cache validity
- OS, Playwright version, browser name, package-lock hash
- Prevents cache collisions and stale data

### ✅ 3. Conditional Browser Installation

- Skip browser download if cached
- Only install system deps when browser exists
- Full install when browser not cached

### ✅ 4. npm ci Always Runs

- Ensures proper binary linking for `npx` commands
- Very fast with node_modules cache (~5-10s)
- More reliable than conditional installation
- Validates package integrity

### ✅ 5. Automated Application Lifecycle

- Docker Compose starts application before tests
- Health check ensures app is ready
- Always stops containers after tests (even on failure)
- Consistent environment between local and CI

### ✅ 6. Parallel Matrix Execution

- All browsers run in parallel when cached
- Each browser uses independent cache
- Shared node_modules cache across all browsers

---

## 🎯 Additional Optimization Opportunities

### Future Improvements:

#### 1. **Docker Layer Caching** (If using Docker for tests)

```yaml
- name: Set up Docker Buildx
  uses: docker/setup-buildx-action@v3

- name: Build and cache
  uses: docker/build-push-action@v5
  with:
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

#### 2. **Test Sharding** (For large test suites)

```yaml
strategy:
  matrix:
    shard: [1, 2, 3, 4]
steps:
  - run: npm test -- --shard=${{ matrix.shard }}/4
```

#### 3. **Fail-Fast Optimization**

Currently `fail-fast: false` for comprehensive results.
Could enable for PR validation to fail immediately on first error:

```yaml
strategy:
  fail-fast: true # For PRs only
```

#### 4. **Selective Test Execution** (Based on changed files)

```yaml
- name: Get changed files
  id: changed-files
  uses: tj-actions/changed-files@v41

- name: Run tests conditionally
  if: contains(steps.changed-files.outputs.all_changed_files, 'src/')
```

---

## 🔍 Monitoring Cache Performance

### View Cache Status:

1. Go to **Actions** → Select workflow run
2. Click on job (e.g., "Playwright Tests")
3. Expand steps to see cache hits/misses:
   ```
   ✓ Cache Playwright browsers
     Cache restored from key: playwright-ubuntu-1.41-chromium
   ```

### GitHub Cache API:

```bash
# List all caches
gh api repos/:owner/:repo/actions/caches

# Delete specific cache
gh api repos/:owner/:repo/actions/caches/:cache-id -X DELETE
```

### Cache Size Limits:

- Per repository: 10 GB total cache size
- Individual cache: No size limit (but cleanup after 7 days of inactivity)
- Artifacts: 500 MB per artifact, 2 GB total per workflow run

---

## 📝 Summary

### Current Optimizations:

- ✅ npm cache via `cache: 'npm'` in setup-node
- ✅ node_modules caching with package-lock checksum
- ✅ npm ci always runs (fast with cache, ensures reliability)
- ✅ Playwright browser binary caching
- ✅ Conditional browser installation based on cache status
- ✅ Granular cache keys with version tracking
- ✅ Restore key fallbacks for flexibility
- ✅ Automated Docker Compose lifecycle management
- ✅ Application health checks before tests

### Impact:

- **~32% faster** on warm cache (single browser)
- **~32% faster** on warm cache (multi-browser scheduled runs)
- **~82 seconds saved** per test run
- **~246 seconds saved** per scheduled run (3 browsers)
- **Reduced network usage** (fewer downloads)
- **Lower GitHub Actions minutes consumption**
- **More reliable** than artifact-based approaches
- **Docker application automatically managed** in CI

### Trade-offs:

- ⚠️ Initial run (cold cache) takes same time as before
- ⚠️ Cache storage counts toward 10 GB repo limit
- ✅ Simpler than artifact-based approach
- ✅ More reliable binary linking
- ✅ Well worth it for frequent CI runs

---

## 🚀 Usage

These optimizations are **automatically applied** to all workflow runs. No manual intervention needed.

**Cache warming:**

- First push after `package-lock.json` change will be slower (warm cache)
- Subsequent pushes will be fast (use cache)
- Browser cache warms per Playwright version upgrade

**Troubleshooting:**
If builds seem slow, check cache status in workflow logs. You may need to:

1. Clear old caches from GitHub UI (Settings → Actions → Caches)
2. Verify `package-lock.json` is committed
3. Check Playwright version hasn't changed mid-build
