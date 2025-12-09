import json
from typing import Dict

class EventMatcher:
    def __init__(self):
        self.team_aliases = {
            'manchester united': ['man united', 'man u'],
            'manchester city': ['man city'],
            'tottenham': ['spurs', 'tottenham hotspur'],
            'chelsea': [],
            'galatasaray': [],
            'sporting': ['sporting lisbon'],
        }
    
    def normalize_team_name(self, name: str) -> str:
        if not name:
            return ""
        if '(' in name and ')' in name:
            name = name.split('(')[0].strip()
        name = name.lower().strip()
        return name
    
    def find_team_canonical(self, norm: str) -> str:
        if norm in self.team_aliases:
            return norm
        for canonical, aliases in self.team_aliases.items():
            if norm in aliases:
                return canonical
        return norm
    
    def normalize_match(self, match: Dict) -> Dict:
        home_norm = self.normalize_team_name(match.get('home_team', ''))
        away_norm = self.normalize_team_name(match.get('away_team', ''))
        home_can = self.find_team_canonical(home_norm)
        away_can = self.find_team_canonical(away_norm)
        teams_sorted = sorted([home_can, away_can])
        sig = f"{teams_sorted[0]}_{teams_sorted[1]}"
        return {'home_norm': home_norm, 'away_norm': away_norm, 'signature': sig, 'provider': match.get('provider'), 'odds': match.get('odds')}
    
    def match_events(self, data: Dict) -> Dict:
        grouped = {}
        for provider, matches in data.items():
            for match in matches:
                match['provider'] = provider
                norm = self.normalize_match(match)
                sig = norm['signature']
                if sig not in grouped:
                    grouped[sig] = {'providers': {}}
                grouped[sig]['providers'][provider] = norm
        return grouped

matcher = EventMatcher()
data = {
    'nova': [
        {'home_team': 'Chelsea (hotShot)', 'away_team': 'Tottenham (GianniKid)', 'odds': {'ft_hdp': {'home': 0.72}}},
        {'home_team': 'Galatasaray (Professor)', 'away_team': 'Sporting (Jetli)', 'odds': {'ft_hdp': {'home': 0.82}}}
    ],
    'saba': [
        {'home_team': 'Chelsea FC', 'away_team': 'Tottenham', 'odds': {'ft_hdp': {'home': 0.75}}},
        {'home_team': 'Galatasaray', 'away_team': 'Sporting Lisbon', 'odds': {'ft_hdp': {'home': 0.80}}}
    ]
}
grouped = matcher.match_events(data)
print("\n" + "="*70)
print("[TEST] Event Matcher")
print("="*70 + "\n[RESULTS]")
for sig, event_data in grouped.items():
    print(f"\n{sig} ({len(event_data['providers'])} providers)")
    for prov, match in event_data['providers'].items():
        print(f"  {prov}: {match['home_norm']} vs {match['away_norm']}")
print(f"\nTotal: {len(grouped)} events, {sum(1 for d in grouped.values() if len(d['providers']) >= 2)} multi-provider")
print("\n✅ COMPLETE\n")
