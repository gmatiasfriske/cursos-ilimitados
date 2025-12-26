import json

# Load Firebase state (Teologia + BECAFLIX)
with open("temp_firebase_state.json", "r", encoding="utf-8") as f:
    firebase_data = json.load(f)

# Load Local state (Vai Na Bíblia)
with open("firebase_data.json", "r", encoding="utf-8") as f:
    local_data = json.load(f)

# Combine courses
# We'll use a dictionary keyed by ID to avoid duplicates and ensure we have all
all_courses = {}

for course in firebase_data.get("courses", []):
    all_courses[course["id"]] = course

for course in local_data.get("courses", []):
    all_courses[course["id"]] = course

# Final list
merged_courses = list(all_courses.values())

final_data = {
    "courses": merged_courses
}

# Write back to local file
with open("firebase_data.json", "w", encoding="utf-8") as f:
    json.dump(final_data, f, indent=4, ensure_ascii=False)

print(f"Merged successfully. Total courses: {len(merged_courses)}")
for cid in all_courses.keys():
    print(f" - {cid}")
