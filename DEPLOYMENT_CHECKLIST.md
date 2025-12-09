# 🚀 Frontend Deployment Checklist

**Date:** December 9, 2025  
**Task:** Deploy ArbBot Pro Dashboard  
**Server:** root@217.216.35.6  
**Location:** /root/sportsbook-minimal

---

## ✅ Pre-Deployment Verification

### Code Quality
- [x] TypeScript compilation successful (0 errors)
- [x] All imports/exports resolved correctly
- [x] No undefined props or null reference errors
- [x] Safe access patterns implemented (config?.tier1 ?? 0)
- [x] LocalStorage wrapped with try/catch

### Files Created
- [x] `minimal-ui/src/api/client.ts` - API client layer
- [x] `minimal-ui/src/utils/mappers.ts` - Data mappers
- [x] `minimal-ui/src/App.tsx` - Main app component
- [x] `minimal-ui/.env.production` - Production env vars
- [x] `deploy-ui-update.sh` - Deployment script

### Files Modified
- [x] `minimal-ui/src/main.jsx` - Import App.tsx
- [x] `minimal-ui/src/index.css` - Custom scrollbar styles
- [x] `minimal-ui/Dockerfile` - Copy .env.production

### Documentation
- [x] `FRONTEND_INTEGRATION_COMPLETE.md` - Full guide
- [x] `DEPLOYMENT_QUICKREF.txt` - Quick reference
- [x] `INTEGRATION_ARCHITECTURE.md` - Architecture docs
- [x] `CHANGES_SUMMARY.md` - Change summary

---

## 🔧 Deployment Steps

### Step 1: Access Server ⏳
```bash
ssh root@217.216.35.6
```
- [ ] SSH connection successful
- [ ] Correct server hostname verified

### Step 2: Navigate to Project ⏳
```bash
cd /root/sportsbook-minimal
pwd  # Should show: /root/sportsbook-minimal
```
- [ ] In correct directory

### Step 3: Pull Latest Code ⏳
```bash
git status
git pull origin main
```
- [ ] Git pull successful
- [ ] No merge conflicts
- [ ] New files visible in minimal-ui/src/

### Step 4: Verify Files ⏳
```bash
ls -la minimal-ui/src/api/client.ts
ls -la minimal-ui/src/utils/mappers.ts
ls -la minimal-ui/src/App.tsx
ls -la minimal-ui/.env.production
ls -la deploy-ui-update.sh
```
- [ ] All new files present

### Step 5: Make Script Executable ⏳
```bash
chmod +x deploy-ui-update.sh
ls -lh deploy-ui-update.sh  # Should show -rwxr-xr-x
```
- [ ] Script is executable

### Step 6: Run Deployment ⏳
```bash
./deploy-ui-update.sh
```
**Expected Output:**
```
==========================================
ArbBot Pro Dashboard - Deployment Script
==========================================

[INFO] Creating backup of current UI...
[INFO] Backup created at: /root/sportsbook-minimal/backups/ui-YYYYMMDD-HHMMSS
[INFO] Navigating to UI directory: /root/sportsbook-minimal/minimal-ui
[INFO] Installing npm dependencies...
[INFO] Building React application...
[INFO] Build verification successful
[INFO] Rebuilding UI Docker image...
[INFO] Starting new UI container...
[SUCCESS] Deployment completed successfully!
```

**Checklist:**
- [ ] Backup created successfully
- [ ] npm install completed without errors
- [ ] Build completed successfully
- [ ] dist/index.html exists
- [ ] Docker build successful
- [ ] Container started successfully

### Step 7: Verify Container ⏳
```bash
docker ps | grep arb-ui
```
**Expected:** Container running with HEALTHY status
- [ ] Container is running
- [ ] Status is healthy

### Step 8: Check Container Contents ⏳
```bash
docker exec arb-ui ls -lh /usr/share/nginx/html/
```
**Expected:** index.html and assets/ directory with recent timestamps
- [ ] index.html present
- [ ] assets/ directory present
- [ ] Files have recent timestamps

### Step 9: Check Logs ⏳
```bash
docker logs arb-ui --tail 50
```
**Expected:** No errors, nginx started successfully
- [ ] No error messages
- [ ] Nginx started message visible

---

## 🧪 Post-Deployment Testing

### Visual Verification ⏳

Open browser: **http://217.216.35.6:8080**

**Header Section:**
- [ ] "ARBBOTPRO" logo visible
- [ ] Version "V2.5.1-DUAL" displayed
- [ ] Four status LEDs visible (ENGINE API, DATABASE, REDIS, WORKER)
- [ ] Total Balance displayed
- [ ] "Secure Mode" badge visible

**Left Column (3 cols):**
- [ ] Account A (Soft) panel visible
- [ ] Account A shows balance, ping, status LED
- [ ] "START TRADING" button present
- [ ] Account B (Sharp) panel visible
- [ ] Account B shows balance, ping, status LED
- [ ] Configuration panel visible
- [ ] All config fields render correctly (Tier Stakes, Profit Range, etc.)

**Right Column (9 cols):**
- [ ] Daily P&L chart visible
- [ ] Live Scanner table headers visible
- [ ] Execution History table headers visible
- [ ] System Logs panel at bottom
- [ ] Initial log "ArbBot Pro Dashboard initialized" visible

**Overall Layout:**
- [ ] No blank areas
- [ ] No broken images
- [ ] Proper spacing and alignment
- [ ] Scrollbars styled correctly
- [ ] Colors match reference design (dark theme)

### Functional Testing ⏳

**Open Browser Console (F12):**
- [ ] No JavaScript errors in Console tab
- [ ] No 404 errors in Network tab
- [ ] No CORS errors

**Test Real-Time Updates:**
Wait 10 seconds and observe:
- [ ] Status LEDs update (color changes if ping varies)
- [ ] Account pings update
- [ ] Logs remain visible

**Test Configuration:**
1. Change a config value (e.g., Min Profit: 3 → 5)
2. Reload page
3. Check if value persists
- [ ] Configuration saves correctly
- [ ] Configuration persists after reload

**Test Account Toggle:**
1. Click "START TRADING" on Account A
2. Observe logs
- [ ] Log entry appears: "*** ACCOUNT 1 (Soft) STARTED ***"
- [ ] Button changes to "STOP TRADING"

### API Connectivity Testing ⏳

**Open Browser Console and run:**

```javascript
// Test system health
fetch('http://217.216.35.6:3000/api/system-health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```
- [ ] Returns valid JSON response
- [ ] No CORS errors

```javascript
// Test login status
fetch('http://217.216.35.6:3000/api/login-status')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```
- [ ] Returns valid JSON response

```javascript
// Test settings
fetch('http://217.216.35.6:3000/api/settings')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```
- [ ] Returns valid JSON response

```javascript
// Test bet history
fetch('http://217.216.35.6:3000/api/bets')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```
- [ ] Returns valid JSON response

### Network Connectivity ⏳

**From server terminal:**
```bash
# Test UI can reach engine
docker exec arb-ui ping -c 3 engine
```
- [ ] Ping successful

```bash
# Test UI can access engine API
docker exec arb-ui wget -O- http://engine:3000/health
```
- [ ] Health check returns OK

### Performance Testing ⏳

**Use Browser DevTools:**
1. Open Network tab
2. Reload page
3. Check load time
- [ ] Page loads in < 3 seconds
- [ ] All assets load successfully
- [ ] No failed requests

**Check Bundle Size:**
```bash
docker exec arb-ui du -sh /usr/share/nginx/html/assets/
```
- [ ] Assets directory < 5MB

---

## 🐛 Troubleshooting

### Issue: Blank Page

**Symptoms:** White screen, no content

**Quick Checks:**
```bash
# 1. Check browser console
# Open DevTools (F12) → Console tab
# Look for JavaScript errors

# 2. Check network requests
# Open DevTools (F12) → Network tab
# Look for failed requests (red status)

# 3. Check if assets loaded
docker exec arb-ui ls -lh /usr/share/nginx/html/assets/
```

**Solutions:**
```bash
# Rebuild from scratch
cd /root/sportsbook-minimal/minimal-ui
rm -rf dist node_modules
npm install
npm run build
cd /root/sportsbook-minimal
docker compose build ui --no-cache
docker compose up -d ui
```
- [ ] Issue resolved

### Issue: API Connection Failed

**Symptoms:** "Failed to fetch", "Network error"

**Quick Checks:**
```bash
# 1. Check if engine is running
docker ps | grep arb-engine

# 2. Test engine health
curl http://localhost:3000/health

# 3. Check engine logs
docker logs arb-engine --tail 50
```

**Solutions:**
```bash
# Restart engine
docker compose restart engine

# Check network
docker network inspect arb-network | grep -A 10 arb-ui
docker network inspect arb-network | grep -A 10 arb-engine
```
- [ ] Issue resolved

### Issue: Configuration Not Saving

**Symptoms:** Settings reset on reload

**Quick Checks:**
1. Open browser console
2. Check for localStorage errors
3. Test backend endpoint:
```bash
curl -X POST http://localhost:3000/api/settings \
  -H 'Content-Type: application/json' \
  -d '{"min_percent":3,"max_percent":10,"minute_limit_ht":35,"minute_limit_ft":75,"market_filter":{"ft_hdp":true,"ft_ou":true,"ft_1x2":false,"ht_hdp":true,"ht_ou":true,"ht_1x2":false},"match_filter":"live_only","round_off":5}'
```

**Solutions:**
- [ ] Check if backend /api/settings endpoint is implemented
- [ ] Verify localStorage is enabled in browser
- [ ] Check browser console for save errors
- [ ] Issue resolved

---

## 📊 Success Metrics

### Must Pass (Critical) ✅
- [ ] Page loads without errors
- [ ] All UI components visible
- [ ] No console errors
- [ ] API endpoints reachable
- [ ] Container healthy

### Should Pass (Important) ⏳
- [ ] Real-time updates working
- [ ] Configuration persists
- [ ] Account toggles work
- [ ] Logs update correctly
- [ ] All tables render properly

### Nice to Have (Optional) ⏳
- [ ] Mobile responsive
- [ ] Fast load time (< 2s)
- [ ] Smooth animations
- [ ] No memory leaks

---

## 🔄 Rollback Procedure

**If deployment fails and issues cannot be resolved:**

```bash
# 1. Find backup directory
ls -lht /root/sportsbook-minimal/backups/ | head -5

# 2. Restore from backup
BACKUP_DIR="/root/sportsbook-minimal/backups/ui-20251209-XXXXXX"
cp -r "$BACKUP_DIR/src" /root/sportsbook-minimal/minimal-ui/

# 3. Rebuild
cd /root/sportsbook-minimal/minimal-ui
npm run build

# 4. Restart container
cd /root/sportsbook-minimal
docker compose build ui
docker compose up -d ui

# 5. Verify
docker logs arb-ui --tail 50
curl -I http://localhost:8080
```

**Rollback Checklist:**
- [ ] Backup restored
- [ ] Build successful
- [ ] Container restarted
- [ ] Old version working
- [ ] Document rollback reason

---

## 📝 Deployment Sign-Off

**Deployment Information:**
- Date: _____________
- Time: _____________
- Deployed by: _____________
- Git commit hash: _____________

**Verification:**
- [ ] All pre-deployment checks passed
- [ ] Deployment completed successfully
- [ ] All post-deployment tests passed
- [ ] No critical issues found
- [ ] Rollback plan tested and ready

**Issues Found:**
- _____________________________________________
- _____________________________________________
- _____________________________________________

**Notes:**
_____________________________________________
_____________________________________________
_____________________________________________

**Deployment Status:**
- [ ] ✅ SUCCESS - Production ready
- [ ] ⚠️  WARNING - Minor issues found (documented above)
- [ ] ❌ FAILED - Rolled back (reason documented above)

---

## 📞 Support Contacts

**Documentation:**
- Full Guide: `FRONTEND_INTEGRATION_COMPLETE.md`
- Quick Ref: `DEPLOYMENT_QUICKREF.txt`
- Architecture: `INTEGRATION_ARCHITECTURE.md`
- Changes: `CHANGES_SUMMARY.md`

**Key Files:**
- Deployment Script: `./deploy-ui-update.sh`
- Backend API Spec: `.aider_context.md`

**Commands:**
```bash
# View logs
docker logs arb-ui --tail 100 --follow

# Restart container
docker compose restart ui

# Rebuild container
docker compose build ui && docker compose up -d ui

# Check status
docker ps | grep arb-ui
docker stats arb-ui
```

---

**Checklist Version:** 1.0  
**Last Updated:** December 9, 2025  
**Status:** Ready for Use
