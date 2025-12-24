# UI Architecture - Match-Based Rendering

## Component Structure

```
┌──────────────────────────────────────────────────────────────────┐
│                         App.tsx                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ WebSocket Handler (/ws/opportunities)                      │  │
│  │  • type: "opportunity"  → setScannerData()                 │  │
│  │  • type: "execution"    → setHistoryData()                 │  │
│  │                           + remove from scannerData        │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─────────────────────┐  ┌────────────────────────────────┐    │
│  │  LiveScanner.tsx    │  │  ExecutionHistory.tsx          │    │
│  │  (Opportunities)    │  │  (Executed Bets)               │    │
│  │                     │  │                                │    │
│  │  data: LiveOpp[]    │  │  history: ExecutedBet[]        │    │
│  │  key: match_id      │  │  key: match_id                 │    │
│  └─────────────────────┘  └────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

## Live Scanner Table Structure

```
┌────────────────────────────────────────────────────────────────────┐
│ Match              │ Market  │ Account A          │ Account B      │
├────────────────────┼─────────┼────────────────────┼────────────────┤
│ MU vs Arsenal      │ FT/HDP  │ NOVA              │ SBOBET         │
│ EPL • 18:30        │         │ MU +0.5           │ Arsenal -0.5   │
│                    │         │ 1.05 (BLUE) • $100│ 0.98 (RED) • $102│
│                    │         │                   │                │
│ Profit: 2.5% • ROI: 1.8%                                          │
└────────────────────────────────────────────────────────────────────┘
```

## Execution History Table Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│ Match              │ Market  │ Account A          │ Account B       │
├────────────────────┼─────────┼────────────────────┼─────────────────┤
│ MU vs Arsenal      │ FT/HDP  │ NOVA [✓ ACCEPTED] │ SBOBET [✓ ACCEPTED]│
│ EPL • 18:30        │         │ MU +0.5           │ Arsenal -0.5    │
│                    │         │ 1.05 (BLUE) • $100│ 0.98 (RED) • $102│
└─────────────────────────────────────────────────────────────────────┘
```

## Data Types

### LiveOpp (Scanner)
```typescript
{
  match_id: string;              // PRIMARY KEY
  sport: string;
  league: string;
  home_team: string;
  away_team: string;
  match_time: string;
  market: string;
  account_a: {
    provider: string;            // e.g., "NOVA"
    selection: string;           // e.g., "MU +0.5"
    hk_odds: number;            // Hong Kong odds (0.05, 1.05, etc.)
    stake: number;              // Rounded stake
  };
  account_b: {
    provider: string;
    selection: string;
    hk_odds: number;
    stake: number;
  };
  profit: number;               // Profit percentage
  roi: number;                  // ROI percentage
}
```

### ExecutedBet (History)
```typescript
{
  match_id: string;              // PRIMARY KEY
  sport: string;
  league: string;
  home_team: string;
  away_team: string;
  match_time: string;
  market: string;
  account_a: {
    provider: string;
    selection: string;
    hk_odds: number;
    stake: number;
    status: 'ACCEPTED' | 'RUNNING' | 'REJECTED';  // ← ADDED
  };
  account_b: {
    provider: string;
    selection: string;
    hk_odds: number;
    stake: number;
    status: 'ACCEPTED' | 'RUNNING' | 'REJECTED';  // ← ADDED
  };
  profit: number;
  roi: number;
  executed_at: string;           // Timestamp
}
```

## WebSocket Message Flow

### Incoming: type="opportunity"
```json
{
  "type": "opportunity",
  "data": {
    "match_id": "mu_arsenal_123",
    "home_team": "Manchester United",
    "away_team": "Arsenal",
    "bet1": {
      "bookmaker": "NOVA",
      "selection": "MU +0.5",
      "odds": {
        "decimal": 2.05,
        "hk_odds": 1.05      ← USE THIS
      },
      "stake": {
        "raw": 98.5,
        "rounded": 100       ← USE THIS
      }
    },
    "bet2": { ... }
  }
}
```

### Incoming: type="execution"
```json
{
  "type": "execution",
  "data": {
    "match_id": "mu_arsenal_123",
    "account_a": {
      "provider": "NOVA",
      "hk_odds": 1.05,
      "stake": 100,
      "status": "ACCEPTED"   ← SHOW THIS
    },
    "account_b": {
      "provider": "SBOBET",
      "hk_odds": 0.98,
      "stake": 102,
      "status": "ACCEPTED"
    },
    "executed_at": "2024-12-24T18:30:45Z"
  }
}
```

## State Updates

### On "opportunity" message:
```typescript
setScannerData(prev => {
  // Remove existing entry with same match_id
  const filtered = prev.filter(item => item.match_id !== newOpp.match_id);
  // Add new/updated entry at the top
  return [newOpp, ...filtered].slice(0, 50);
});
```

### On "execution" message:
```typescript
// Add to history
setHistoryData(prev => [newExec, ...prev].slice(0, 100));

// Remove from scanner
setScannerData(prev => 
  prev.filter(item => item.match_id !== newExec.match_id)
);
```

## Odds Color Coding

```typescript
const getOddsColor = (hkOdds: number): string => {
  return hkOdds < 1.0 ? 'text-red-400' : 'text-blue-400';
};

// Examples:
// 0.98  → RED   (losing odds)
// 1.05  → BLUE  (winning odds)
// 0.50  → RED
// 2.50  → BLUE
```

## Key Design Principles

1. **Render-Only**: UI never calculates odds or stakes
2. **Match-Based**: 1 row = 1 match (not 2 rows for 2 legs)
3. **HK Odds Only**: No conversion, direct display
4. **Idempotent**: Same match_id replaces previous entry
5. **Type-Safe**: Full TypeScript interfaces
6. **Real-Time**: WebSocket-driven updates
7. **Auto-Reconnect**: Handles connection drops
8. **No Mixing**: Clear separation of live vs executed

## Production Checklist

✅ No odds calculation in UI
✅ No stake calculation in UI
✅ HK odds only (< 1.0 RED, >= 1.0 BLUE)
✅ Match-based rows (Account A + B together)
✅ WebSocket integration complete
✅ Idempotent state updates
✅ Auto-reconnect logic
✅ TypeScript type safety
✅ No TODOs or mocks
✅ Production-ready
