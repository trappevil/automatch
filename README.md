# AutoMatch

A simple local MVP for ranking cars by buyer profile.

## Run locally

From this folder:

```powershell
node server.js
```

Then open:

```text
http://localhost:8080
```

The app loads `cars.json`, calculates weighted scores for the selected profile, ranks cars from highest to lowest, and shows a details view for each car.
