#!/usr/bin/env python3
"""
Data Analysis Script for RNS Show Watch List
Analyzes the shows_data.json file to identify data quality issues
"""

import json
import sys
from collections import Counter, defaultdict

def analyze_shows_data(filename='shows_data.json'):
    """Analyze the shows data for quality issues"""
    
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            shows = json.load(f)
    except FileNotFoundError:
        print(f"❌ Error: {filename} not found")
        return
    except json.JSONDecodeError as e:
        print(f"❌ Error: Invalid JSON in {filename}: {e}")
        return
    
    print("🔍 RNS Show Watch List - Data Quality Analysis")
    print("=" * 50)
    
    # Basic statistics
    total_shows = len(shows)
    print(f"📊 Total shows: {total_shows}")
    
    # Status analysis
    statuses = [show.get('status', 'Unknown') for show in shows]
    status_counts = Counter(statuses)
    
    print(f"\n📋 Status Distribution ({len(status_counts)} unique values):")
    for status, count in status_counts.most_common():
        percentage = (count / total_shows) * 100
        print(f"  {status:30} {count:3d} ({percentage:5.1f}%)")
    
    # Episode data quality
    missing_total_episodes = sum(1 for show in shows if show.get('total_episodes', 0) == 0)
    missing_watched_episodes = sum(1 for show in shows if show.get('watched_episode', 0) == 0)
    invalid_progress = sum(1 for show in shows 
                          if show.get('total_episodes', 0) > 0 and 
                             show.get('watched_episode', 0) > show.get('total_episodes', 0))
    
    print(f"\n📺 Episode Data Quality:")
    print(f"  Missing total episodes:   {missing_total_episodes:3d} ({(missing_total_episodes/total_shows)*100:5.1f}%)")
    print(f"  Missing watched episodes: {missing_watched_episodes:3d} ({(missing_watched_episodes/total_shows)*100:5.1f}%)")
    print(f"  Invalid progress:         {invalid_progress:3d} ({(invalid_progress/total_shows)*100:5.1f}%)")
    
    # Rating analysis
    ratings = [show.get('rating', 0) for show in shows]
    rating_counts = Counter(ratings)
    unrated_shows = rating_counts.get(0, 0)
    
    print(f"\n⭐ Rating Distribution:")
    for rating in sorted(rating_counts.keys()):
        count = rating_counts[rating]
        percentage = (count / total_shows) * 100
        stars = "★" * rating if rating > 0 else "☆"
        print(f"  {rating} {stars:5} {count:3d} ({percentage:5.1f}%)")
    
    # Metadata completeness
    missing_metadata = {
        'genre': sum(1 for show in shows if not show.get('genre', '').strip()),
        'year': sum(1 for show in shows if not show.get('year', '').strip()),
        'link': sum(1 for show in shows if not show.get('link', '').strip()),
        'notes': sum(1 for show in shows if not show.get('notes', '').strip()),
    }
    
    print(f"\n📝 Metadata Completeness:")
    for field, missing_count in missing_metadata.items():
        percentage = (missing_count / total_shows) * 100
        print(f"  Missing {field:6} {missing_count:3d} ({percentage:5.1f}%)")
    
    # Potential duplicates
    names = [show.get('name', '').lower().strip() for show in shows]
    name_counts = Counter(names)
    duplicates = [(name, count) for name, count in name_counts.items() if count > 1]
    
    if duplicates:
        print(f"\n⚠️  Potential Duplicates ({len(duplicates)} groups):")
        for name, count in sorted(duplicates, key=lambda x: x[1], reverse=True):
            print(f"  '{name}' appears {count} times")
    
    # Status standardization suggestions
    standard_statuses = {'watching', 'current', 'completed', 'planned', 'on hold'}
    non_standard = [status for status in status_counts.keys() 
                   if status.lower().replace(' ', '').replace('-', '') not in 
                   [s.replace(' ', '') for s in standard_statuses]]
    
    if non_standard:
        print(f"\n⚡ Non-standard Status Values ({len(non_standard)}):")
        for status in sorted(non_standard):
            count = status_counts[status]
            print(f"  '{status}' ({count} shows)")
    
    # Progress calculation issues
    progress_issues = []
    for show in shows:
        total = show.get('total_episodes', 0)
        watched = show.get('watched_episode', 0)
        progress = show.get('progress', 0)
        
        if total > 0:
            calculated_progress = round((watched / total) * 100)
            if progress != calculated_progress:
                progress_issues.append({
                    'name': show.get('name', 'Unknown'),
                    'stored': progress,
                    'calculated': calculated_progress,
                    'watched': watched,
                    'total': total
                })
    
    if progress_issues:
        print(f"\n🔧 Progress Calculation Issues ({len(progress_issues)}):")
        for issue in progress_issues[:5]:  # Show first 5
            print(f"  '{issue['name']}': stored={issue['stored']}%, calculated={issue['calculated']}%")
        if len(progress_issues) > 5:
            print(f"  ... and {len(progress_issues) - 5} more")
    
    # Data quality score
    quality_score = calculate_quality_score(shows, total_shows, missing_total_episodes, 
                                          unrated_shows, len(non_standard))
    print(f"\n🎯 Overall Data Quality Score: {quality_score:.1f}/100")
    
    # Recommendations
    print(f"\n💡 Recommendations:")
    if len(non_standard) > 5:
        print(f"  1. Standardize {len(non_standard)} non-standard status values")
    if missing_total_episodes > total_shows * 0.1:
        print(f"  2. Research and add missing episode data for {missing_total_episodes} shows")
    if unrated_shows > total_shows * 0.5:
        print(f"  3. Encourage rating for {unrated_shows} unrated shows")
    if duplicates:
        print(f"  4. Review and merge {len(duplicates)} potential duplicate groups")
    if progress_issues:
        print(f"  5. Fix progress calculation for {len(progress_issues)} shows")

def calculate_quality_score(shows, total, missing_episodes, unrated, non_standard_count):
    """Calculate a data quality score out of 100"""
    score = 100
    
    # Deduct for missing episode data
    score -= (missing_episodes / total) * 30
    
    # Deduct for unrated shows
    score -= min((unrated / total) * 20, 20)
    
    # Deduct for non-standard statuses
    score -= min((non_standard_count / 10) * 25, 25)
    
    # Deduct for missing metadata
    missing_metadata_penalty = 0
    for show in shows:
        if not show.get('genre', '').strip():
            missing_metadata_penalty += 0.5
        if not show.get('year', '').strip():
            missing_metadata_penalty += 0.5
    
    score -= min(missing_metadata_penalty, 15)
    
    return max(score, 0)

if __name__ == "__main__":
    filename = sys.argv[1] if len(sys.argv) > 1 else 'shows_data.json'
    analyze_shows_data(filename)