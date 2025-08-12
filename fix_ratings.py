import json

# Read the data
with open('shows_data.json', 'r') as f:
    shows = json.load(f)

# Convert ratings from 6-10 scale to 0-5 scale  
converted_count = 0
for show in shows:
    if show['rating'] > 5:
        # Convert 6-10 to 1-5 (6->1, 7->2, 8->3, 9->4, 10->5)
        old_rating = show['rating']
        show['rating'] = show['rating'] - 5
        print(f'Show "{show["name"]}": {old_rating} -> {show["rating"]}')
        converted_count += 1

# Save the corrected data
with open('shows_data.json', 'w') as f:
    json.dump(shows, f, indent=2)

print(f'✅ Fixed {converted_count} ratings: converted 6-10 scale to 1-5 scale')
