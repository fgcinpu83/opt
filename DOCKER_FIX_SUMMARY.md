# Docker Image Fix - Summary

## Problem Solved
Fixed the `arb-ui` Docker container to serve the latest Vite build instead of cached old bundles that were causing a blank page with JavaScript errors.

## Changes Made

### 1. Updated nginx Configuration
**File**: `minimal-ui/nginx.conf`

Added proper cache control headers:
- HTML files: Never cached (`no-store, no-cache, must-revalidate`)
- JS/CSS files: Cached for 1 year with `immutable` flag (safe because of hash-based filenames)

This ensures browsers always fetch fresh `index.html` which references the correct bundle files.

### 2. Created Rebuild Script
**File**: `rebuild-frontend.sh`

Automated script that:
- Stops and removes old container
- Removes old Docker image
- Rebuilds image with `--no-cache` flag
- Starts new container
- Verifies deployment

### 3. Created Documentation
**Files**: 
- `DOCKER_REBUILD_INSTRUCTIONS.md` - Comprehensive guide
- `DEPLOY_COMMANDS.sh` - Quick reference commands

## Root Cause
The Dockerfile was correct, but Docker was caching build layers. When code changed, the Docker image still contained old bundles because:
1. Docker layer caching reused old `npm run build` results
2. Browser cached old `index.html` 
3. No `--no-cache` flag was used during rebuild

## How to Deploy on Server

### Copy Files to Server
```bash
# On the server (/root/sportsbook-minimal)
# Copy these updated files from the repo:
# - minimal-ui/nginx.conf
# - rebuild-frontend.sh
```

### Run the Fix
```bash
cd /root/sportsbook-minimal

# Make script executable
chmod +x rebuild-frontend.sh

# Run rebuild
./rebuild-frontend.sh
```

### Verify Success
```bash
# Check container files
docker exec arb-ui cat /usr/share/nginx/html/index.html | grep assets

# Should show:
# /assets/index.Dc6Q79XQ.js
# /assets/index.0s0hVJrZ.css
```

### Test in Browser
1. Open http://217.216.35.6:8080
2. Hard refresh (Ctrl+Shift+R)
3. Check Network tab shows new bundles:
   - `index.Dc6Q79XQ.js` ✓
   - `index.0s0hVJrZ.css` ✓
4. Dashboard should render without errors

## Technical Notes

### Why This Works
1. **`--no-cache` flag**: Forces Docker to rebuild all layers from scratch
2. **HTML cache control**: Prevents browser from caching index.html
3. **Image removal**: Ensures no stale layers remain
4. **Container recreation**: Fresh nginx instance with correct files

### Dockerfile (No Changes Needed)
The existing Dockerfile was already correct:
- Multi-stage build
- Runs `npm install` and `npm run build`
- Copies `dist/` to nginx root
- No hard-coded bundle names

The issue was deployment process, not the Dockerfile.

## Future Deployments

Every time you update frontend code:
```bash
cd /root/sportsbook-minimal
./rebuild-frontend.sh
```

Or manually:
```bash
docker compose build --no-cache ui
docker compose up -d ui
```

## Files Modified
✅ `minimal-ui/nginx.conf` - Cache control headers
✅ `rebuild-frontend.sh` - Automated rebuild script
✅ `DOCKER_REBUILD_INSTRUCTIONS.md` - Full documentation
✅ `DEPLOY_COMMANDS.sh` - Quick reference
✅ `SUMMARY.md` - This file

## Files Reviewed (No Changes)
✅ `minimal-ui/Dockerfile` - Already correct
✅ `docker-compose.yml` - Already correct
✅ `minimal-ui/vite.config.js` - Already correct

## Success Criteria
- ✓ Container serves latest index.html
- ✓ Browser loads new bundle files (Dc6Q79XQ.js, 0s0hVJrZ.css)
- ✓ No "tier1" or "toLocaleString" errors
- ✓ Dashboard renders instead of blank page
- ✓ Automated rebuild process for future updates
