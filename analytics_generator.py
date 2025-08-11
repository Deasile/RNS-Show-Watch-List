#!/usr/bin/env python3
"""
Advanced Analytics Generator for RNS Show Watch List
===================================================

This script generates comprehensive analytics and insights from the watch list data:
1. Viewing patterns and trends
2. Rating distribution analysis
3. Completion rate statistics
4. Genre preferences (if available)
5. Watch time analytics
6. Personalized recommendations

Author: GitHub Copilot AI Agent
Date: August 11, 2025
"""

import json
import datetime
from collections import Counter, defaultdict
import statistics

class WatchListAnalytics:
    def __init__(self):
        self.shows = []
        self.analytics = {}
        
    def load_data(self, filename='shows_data.json'):
        """Load show data for analysis"""
        with open(filename, 'r', encoding='utf-8') as f:
            self.shows = json.load(f)
        print(f"📊 Loaded {len(self.shows)} shows for analysis")
        
    def analyze_viewing_patterns(self):
        """Analyze viewing patterns and habits"""
        patterns = {}
        
        # Status distribution
        status_counts = Counter(show['status'] for show in self.shows)
        patterns['status_distribution'] = dict(status_counts)
        
        # Progress analysis
        progress_data = []
        for show in self.shows:
            if show['total_episodes'] > 0:
                progress = (show['watched_episode'] / show['total_episodes']) * 100
                progress_data.append(progress)
        
        if progress_data:
            patterns['average_progress'] = round(statistics.mean(progress_data), 2)
            patterns['median_progress'] = round(statistics.median(progress_data), 2)
            patterns['progress_std'] = round(statistics.stdev(progress_data) if len(progress_data) > 1 else 0, 2)
        
        # Completion patterns
        completed_shows = [s for s in self.shows if s['status'] == 'Completed']
        started_shows = [s for s in self.shows if s['watched_episode'] > 0]
        
        patterns['completion_rate'] = round(len(completed_shows) / len(started_shows) * 100, 1) if started_shows else 0
        patterns['average_episodes_per_show'] = round(
            statistics.mean([s['total_episodes'] for s in self.shows if s['total_episodes'] > 0]) if self.shows else 0, 1
        )
        
        # Watch time calculation
        total_episodes_watched = sum(show['watched_episode'] for show in self.shows)
        estimated_minutes = total_episodes_watched * 24  # 24 minutes per episode average
        patterns['total_watch_time_hours'] = round(estimated_minutes / 60, 1)
        patterns['total_watch_time_days'] = round(estimated_minutes / (60 * 24), 1)
        
        return patterns
    
    def analyze_ratings(self):
        """Analyze rating patterns and preferences"""
        ratings = {}
        
        # Get rated shows
        rated_shows = [show for show in self.shows if show['rating'] > 0]
        
        if not rated_shows:
            return {'message': 'No ratings available for analysis'}
        
        # Rating distribution
        rating_counts = Counter(show['rating'] for show in rated_shows)
        ratings['distribution'] = dict(rating_counts)
        
        # Rating statistics
        rating_values = [show['rating'] for show in rated_shows]
        ratings['average'] = round(statistics.mean(rating_values), 2)
        ratings['median'] = statistics.median(rating_values)
        ratings['most_common'] = rating_counts.most_common(1)[0][0]
        
        # High-rated shows
        high_rated = [s for s in rated_shows if s['rating'] >= 4]
        ratings['high_rated_count'] = len(high_rated)
        ratings['high_rated_percentage'] = round(len(high_rated) / len(rated_shows) * 100, 1)
        
        # Rating by status correlation
        status_ratings = defaultdict(list)
        for show in rated_shows:
            status_ratings[show['status']].append(show['rating'])
        
        ratings['by_status'] = {}
        for status, status_rating_list in status_ratings.items():
            if status_rating_list:
                ratings['by_status'][status] = round(statistics.mean(status_rating_list), 2)
        
        return ratings
    
    def find_patterns_and_recommendations(self):
        """Find patterns and generate recommendations"""
        patterns = []
        recommendations = []
        
        # Analyze completion patterns
        completed = [s for s in self.shows if s['status'] == 'Completed']
        watching = [s for s in self.shows if s['status'] == 'Watching']
        on_hold = [s for s in self.shows if s['status'] == 'On Hold']
        planned = [s for s in self.shows if s['status'] == 'Planned']
        
        # Pattern: High number of shows on hold
        if len(on_hold) > len(watching):
            patterns.append({
                'type': 'attention_needed',
                'title': 'High number of shows on hold',
                'description': f'{len(on_hold)} shows on hold vs {len(watching)} currently watching',
                'suggestion': 'Consider reviewing shows on hold - some might be worth dropping or resuming'
            })
            recommendations.append('Review shows on hold and decide: resume, drop, or keep')
        
        # Pattern: Large backlog
        if len(planned) > len(watching) * 2:
            patterns.append({
                'type': 'backlog_warning',
                'title': 'Large planned backlog',
                'description': f'{len(planned)} planned shows vs {len(watching)} currently watching',
                'suggestion': 'Focus on current shows before adding more to the list'
            })
            recommendations.append('Prioritize planned shows and avoid adding new ones temporarily')
        
        # Pattern: Low completion rate
        if completed and len(completed) / len(self.shows) < 0.3:
            patterns.append({
                'type': 'completion_issue',
                'title': 'Low completion rate',
                'description': f'Only {len(completed)}/{len(self.shows)} shows completed',
                'suggestion': 'Consider being more selective with new shows'
            })
            recommendations.append('Be more selective when adding new shows to improve completion rate')
        
        # Pattern: Nearly finished shows
        nearly_finished = []
        for show in watching:
            if show['total_episodes'] > 0:
                progress = show['watched_episode'] / show['total_episodes']
                if progress >= 0.8:
                    nearly_finished.append(show)
        
        if nearly_finished:
            patterns.append({
                'type': 'opportunity',
                'title': 'Shows close to completion',
                'description': f'{len(nearly_finished)} shows are 80%+ complete',
                'suggestion': 'Focus on finishing these shows for quick wins'
            })
            recommendations.append(f'Prioritize completing: {", ".join([s["name"] for s in nearly_finished[:3]])}')
        
        return patterns, recommendations
    
    def generate_insights(self):
        """Generate comprehensive insights"""
        insights = []
        
        # Data quality insights
        no_rating = len([s for s in self.shows if s['rating'] == 0])
        if no_rating > 0:
            insights.append({
                'type': 'data_quality',
                'message': f'{no_rating} shows need ratings for better recommendations'
            })
        
        missing_episodes = len([s for s in self.shows if s['total_episodes'] == 0])
        if missing_episodes > 0:
            insights.append({
                'type': 'data_quality',
                'message': f'{missing_episodes} shows are missing episode count data'
            })
        
        # Viewing behavior insights
        high_progress_shows = [s for s in self.shows if s['total_episodes'] > 0 and 
                              (s['watched_episode'] / s['total_episodes']) > 0.5 and 
                              s['status'] != 'Completed']
        
        if len(high_progress_shows) > 5:
            insights.append({
                'type': 'behavior',
                'message': f'{len(high_progress_shows)} shows are over 50% watched but not completed'
            })
        
        # Rating insights
        rated_shows = [s for s in self.shows if s['rating'] > 0]
        if rated_shows:
            avg_rating = statistics.mean([s['rating'] for s in rated_shows])
            if avg_rating > 4.0:
                insights.append({
                    'type': 'positive',
                    'message': f'High standards! Average rating of {avg_rating:.1f} stars'
                })
            elif avg_rating < 3.0:
                insights.append({
                    'type': 'suggestion',
                    'message': f'Low average rating ({avg_rating:.1f}) - consider being more selective'
                })
        
        return insights
    
    def generate_full_report(self):
        """Generate comprehensive analytics report"""
        print("🔍 Generating comprehensive analytics...")
        
        # Run all analyses
        viewing_patterns = self.analyze_viewing_patterns()
        rating_analysis = self.analyze_ratings()
        patterns, recommendations = self.find_patterns_and_recommendations()
        insights = self.generate_insights()
        
        # Create report
        report = {
            'generated_at': datetime.datetime.now().isoformat(),
            'total_shows': len(self.shows),
            'viewing_patterns': viewing_patterns,
            'rating_analysis': rating_analysis,
            'patterns': patterns,
            'recommendations': recommendations,
            'insights': insights
        }
        
        # Save to file
        with open('analytics_report.json', 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        # Generate markdown report
        self.generate_markdown_report(report)
        
        print("✅ Analytics complete!")
        print("📊 Generated: analytics_report.json")
        print("📋 Generated: analytics_report.md")
        
        return report
    
    def generate_markdown_report(self, report):
        """Generate human-readable markdown report"""
        
        md_content = f"""# 📊 RNS Show Watch List Analytics Report

Generated: {datetime.datetime.now().strftime('%B %d, %Y at %I:%M %p')}

## 📈 Overview

- **Total Shows**: {report['total_shows']}
- **Watch Time**: {report['viewing_patterns'].get('total_watch_time_hours', 0)} hours ({report['viewing_patterns'].get('total_watch_time_days', 0)} days)
- **Completion Rate**: {report['viewing_patterns'].get('completion_rate', 0)}%
- **Average Progress**: {report['viewing_patterns'].get('average_progress', 0)}%

## 📺 Status Distribution

"""
        
        # Status distribution
        status_dist = report['viewing_patterns'].get('status_distribution', {})
        for status, count in status_dist.items():
            percentage = round(count / report['total_shows'] * 100, 1)
            md_content += f"- **{status}**: {count} shows ({percentage}%)\n"
        
        # Ratings section
        if 'message' not in report['rating_analysis']:
            md_content += f"""
## ⭐ Rating Analysis

- **Average Rating**: {report['rating_analysis'].get('average', 0)} stars
- **Most Common Rating**: {report['rating_analysis'].get('most_common', 0)} stars
- **High-Rated Shows**: {report['rating_analysis'].get('high_rated_count', 0)} ({report['rating_analysis'].get('high_rated_percentage', 0)}%)

### Rating Distribution
"""
            rating_dist = report['rating_analysis'].get('distribution', {})
            for rating in sorted(rating_dist.keys(), reverse=True):
                count = rating_dist[rating]
                md_content += f"- **{rating} Stars**: {count} shows\n"
        
        # Patterns and insights
        if report['patterns']:
            md_content += "\n## 🔍 Patterns Detected\n\n"
            for pattern in report['patterns']:
                md_content += f"### {pattern['title']}\n"
                md_content += f"{pattern['description']}\n\n"
                md_content += f"💡 **Suggestion**: {pattern['suggestion']}\n\n"
        
        # Recommendations
        if report['recommendations']:
            md_content += "## 🎯 Recommendations\n\n"
            for i, rec in enumerate(report['recommendations'], 1):
                md_content += f"{i}. {rec}\n"
        
        # Insights
        if report['insights']:
            md_content += "\n## 💡 Additional Insights\n\n"
            for insight in report['insights']:
                emoji = {'data_quality': '🔧', 'behavior': '📊', 'positive': '🎉', 'suggestion': '💭'}.get(insight['type'], '•')
                md_content += f"{emoji} {insight['message']}\n\n"
        
        md_content += """
---

*This report was automatically generated by the RNS Show Watch List Analytics Engine.*
"""
        
        with open('analytics_report.md', 'w', encoding='utf-8') as f:
            f.write(md_content)

def main():
    """Main execution function"""
    analytics = WatchListAnalytics()
    analytics.load_data()
    report = analytics.generate_full_report()
    
    # Print summary
    print("\n📊 ANALYTICS SUMMARY")
    print("=" * 40)
    print(f"Total Shows: {report['total_shows']}")
    print(f"Watch Time: {report['viewing_patterns'].get('total_watch_time_hours', 0)} hours")
    print(f"Completion Rate: {report['viewing_patterns'].get('completion_rate', 0)}%")
    print(f"Patterns Found: {len(report['patterns'])}")
    print(f"Recommendations: {len(report['recommendations'])}")

if __name__ == "__main__":
    main()
