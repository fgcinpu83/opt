# Docker Frontend Rebuild Instructions

## Problem
The Docker container `arb-ui` was serving old cached Vite bundles instead of the latest build, causing the React app to show a blank page with errors.

## Root Cause
- Docker was caching build layers, causing old bundle files (e.g., `index.CWnDAYHZ.js`) to persist
- The nginx container continued to serve these old files even after local builds created new ones
- Browser was also caching the old index.html file

## Solution Applied

### 1. Updated nginx.conf
**File**: `minimal-ui/nginx.conf`

**Changes**:
- Added explicit cache control for HTML files: `no-store, no-cache, must-revalidate`
- This ensures index.html is never cached by browsers
- JS/CSS files with hashed names are still cached for performance (1 year)

### 2. Created Rebuild Script
**File**: `rebuild-frontend.sh`

**Purpose**: Automates the complete rebuild process with proper cache busting

**What it does**:
1. Stops and removes the old `arb-ui` container
2. Removes the old Docker image completely
3. Rebuilds the Docker image with `--no-cache` flag
4. Starts the new container
5. Verifies the files inside the container

## How to Deploy the Fix

### On the Server (/root/sportsbook-minimal)

**Option 1: Use the automated script** (Recommended)
```bash
cd /root/sportsbook-minimal
bash rebuild-frontend.sh
```

**Option 2: Manual steps**
```bash
cd /root/sportsbook-minimal

# Stop and remove old container
docker compose stop arb-ui
docker compose rm -f arb-ui

# Remove old image
docker rmi sportsbook-minimal-ui

# Rebuild with no cache
docker compose build --no-cache ui

# Start new container
docker compose up -d ui

# Verify
docker exec arb-ui cat /usr/share/nginx/html/index.html | grep -E "(\.js|\.css)"
```

## Verification Steps

### 1. Check Container Files
```bash
# View index.html content
docker exec arb-ui cat /usr/share/nginx/html/index.html

# Should reference NEW bundles:
# - /assets/index.Dc6Q79XQ.js
# - /assets/index.0s0hVJrZ.css

# List assets
docker exec arb-ui ls -la /usr/share/nginx/html/assets/
```

### 2. Check Browser
1. Open: http://217.216.35.6:8080
2. Open DevTools → Network tab
3. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
4. Verify it loads:
   - `index.Dc6Q79XQ.js`
   - `index.0s0hVJrZ.css`
5. Check Console tab - should have NO errors about:
   - "tier1"
   - "toLocaleString of undefined"
   - localStorage

### 3. Expected Result
- React dashboard should render properly
- No blank page
- No console errors

## Technical Details

### Dockerfile (Already Correct)
The existing Dockerfile in `minimal-ui/Dockerfile` was already properly configured:
- Multi-stage build with Node.js builder
- Runs `npm install` and `npm run build`
- Copies built files from `dist/` to nginx web root
- No hard-coded bundle names

The issue was **Docker layer caching**, not the Dockerfile itself.

### Why --no-cache is Important
- Docker caches each layer (RUN, COPY commands)
- Even if source files change, Docker may reuse cached layers
- `--no-cache` forces Docker to rebuild everything from scratch
- Ensures the latest code is built into the image

### nginx Cache Control
```nginx
# HTML files - never cache (always fetch fresh)
location ~* \.html$ {
    add_header Cache-Control "no-store, no-cache, must-revalidate";
    expires 0;
}

# JS/CSS with hash - cache forever (immutable)
location ~* \.js$ {
    add_header Cache-Control "public, max-age=31536000, immutable";
    expires 1y;
}
```

This ensures:
- Browsers always get the latest index.html
- Once index.html has new bundle references, browsers fetch new bundles
- Hashed bundles can be cached aggressively (they never change)

## Future Deployments

**Every time you make frontend changes**:
```bash
cd /root/sportsbook-minimal
bash rebuild-frontend.sh
```

Or if you prefer manual control:
```bash
cd /root/sportsbook-minimal
docker compose build --no-cache ui
docker compose up -d ui
```

## Troubleshooting

### If still serving old bundles
1. Check container files:
   ```bash
   docker exec arb-ui cat /usr/share/nginx/html/index.html
   ```

2. If old bundles are in container → Docker image is stale:
   ```bash
   docker compose down ui
   docker rmi -f sportsbook-minimal-ui
   docker compose build --no-cache ui
   docker compose up -d ui
   ```

3. If new bundles are in container but browser shows old → Browser cache:
   - Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
   - Or clear browser cache completely

### If build fails
1. Check if node_modules exists in minimal-ui folder on server
2. Check Dockerfile syntax
3. Check docker-compose.yml service name matches
4. Check disk space: `df -h`

## Files Modified
- ✅ `minimal-ui/nginx.conf` - Added proper cache control headers
- ✅ `rebuild-frontend.sh` - Created automated rebuild script

## Files NOT Changed (Already Correct)
- ✅ `minimal-ui/Dockerfile` - Multi-stage build was already correct
- ✅ `docker-compose.yml` - Service configuration was already correct
- ✅ `minimal-ui/vite.config.js` - Build config was already correct
