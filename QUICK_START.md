# Quick Start: Fix Docker Container to Serve Latest Build

## What This Does
Fixes the `arb-ui` Docker container to serve the latest Vite build instead of old cached bundles.

## Quick Fix (Run on Server)

```bash
# 1. Navigate to project directory
cd /root/sportsbook-minimal

# 2. Make sure you have the updated files from the repo:
#    - minimal-ui/nginx.conf (updated)
#    - rebuild-frontend.sh (new)

# 3. Make script executable
chmod +x rebuild-frontend.sh

# 4. Run the rebuild
./rebuild-frontend.sh
```

## What Gets Fixed

### Before
- Container serves old bundle: `index.CWnDAYHZ.js`
- Browser shows blank page
- Console errors: "tier1", "toLocaleString of undefined"

### After
- Container serves new bundle: `index.Dc6Q79XQ.js`
- Dashboard renders correctly
- No console errors

## Verify Success

### Check Container
```bash
docker exec arb-ui cat /usr/share/nginx/html/index.html | grep assets
```
Should show:
```html
<script type="module" crossorigin src="/assets/index.Dc6Q79XQ.js"></script>
<link rel="stylesheet" crossorigin href="/assets/index.0s0hVJrZ.css">
```

### Check Browser
1. Open http://217.216.35.6:8080
2. Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
3. Open DevTools → Network tab
4. Should load:
   - ✓ `index.Dc6Q79XQ.js`
   - ✓ `index.0s0hVJrZ.css`
5. Dashboard should render without errors

## Manual Commands (Alternative)

If you prefer to run commands manually:

```bash
cd /root/sportsbook-minimal

# Stop and remove container
docker compose stop arb-ui
docker compose rm -f arb-ui

# Remove old image
docker rmi sportsbook-minimal-ui

# Rebuild with no cache
docker compose build --no-cache ui

# Start new container
docker compose up -d ui

# Verify
docker exec arb-ui cat /usr/share/nginx/html/index.html | grep assets
```

## Key Changes Made

1. **nginx.conf** - Added cache control to prevent HTML caching
2. **rebuild-frontend.sh** - Automated rebuild script with proper cache busting

## Why This Was Needed

Docker was caching build layers, causing the container to serve old bundle files even after:
- Running `npm run build` locally
- Code being updated on the server
- Regular Docker rebuilds

The solution: Use `--no-cache` flag and remove old images completely.

## For Future Deployments

Every time you update frontend code, run:
```bash
cd /root/sportsbook-minimal
./rebuild-frontend.sh
```

This ensures the Docker image always contains the latest build.

## Documentation

- `DOCKER_FIX_SUMMARY.md` - Complete overview
- `DOCKER_REBUILD_INSTRUCTIONS.md` - Detailed technical guide
- `DEPLOY_COMMANDS.sh` - Command reference

## Need Help?

If the rebuild doesn't work:

1. Check Docker is running: `docker ps`
2. Check disk space: `df -h`
3. Check logs: `docker logs arb-ui`
4. Try manual rebuild from scratch:
   ```bash
   docker compose down
   docker system prune -f
   docker compose build --no-cache ui
   docker compose up -d ui
   ```

## Success Checklist

- [ ] Ran `./rebuild-frontend.sh` on server
- [ ] Script completed without errors
- [ ] Container shows new bundle files
- [ ] Browser loads new bundles (Dc6Q79XQ.js)
- [ ] Dashboard renders without errors
- [ ] No console errors about tier1/localStorage

---

**Ready to deploy?** Just run `./rebuild-frontend.sh` on the server! 🚀
