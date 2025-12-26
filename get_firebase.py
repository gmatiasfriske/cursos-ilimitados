import urllib.request
import json

url = "https://app-curso-58cd4-default-rtdb.firebaseio.com/.json"
response = urllib.request.urlopen(url)
data = json.loads(response.read().decode('utf-8'))

with open("temp_firebase_state.json", "w", encoding="utf-8") as f:
    json.dump(data, f, indent=4, ensure_ascii=False)

print("Downloaded current Firebase state to temp_firebase_state.json")
