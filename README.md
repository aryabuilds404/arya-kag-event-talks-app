# BigQuery Release Notes Reader

A modern, glassmorphic dark-mode web application designed to fetch, parse, search, filter, and share Google Cloud BigQuery Release Notes.

## Features

- **Server-Side Feed Proxy**: Fetches Google Cloud's Atom XML feed via Python Flask, preventing browser CORS policy restrictions.
- **Client-Side Sub-Parsing**: Slices Atom entries dynamically into separate, self-contained update cards based on headers (Features, Issues, Breaking, Changes, Announcements).
- **Interactive UI Panel**: Offers real-time search and quick category badges to filter through updates instantaneously.
- **Twitter / X Integration**: Allows selecting individual updates and generating Twitter Intents. Formatted text is truncated dynamically to fit Twitter's 280-character limit, appending URLs and hashtags.
- **Responsive Layout**: Works seamlessly across mobile, tablet, and desktop viewports.

---

## Tech Stack

- **Backend**: Python 3.x, Flask, Requests
- **Frontend**: Vanilla HTML5, Vanilla CSS3 (custom variables, glassmorphism), Vanilla JavaScript (DOMParser, dynamic event bindings)

---

## File Structure

- [app.py](file:///C:/Users/hates/agy-cil-project/app.py): Core Flask application containing XML feed retrieval and API logic.
- [templates/index.html](file:///C:/Users/hates/agy-cil-project/templates/index.html): HTML skeleton containing search inputs, pills, container panels, and the action bar.
- [static/css/styles.css](file:///C:/Users/hates/agy-cil-project/static/css/styles.css): Custom CSS stylesheets containing dark-theme parameters, animations, scrollbars, and card highlights.
- [static/js/app.js](file:///C:/Users/hates/agy-cil-project/static/js/app.js): Application controller managing network calls, DOM rendering, search filtering, and tweet intents.
- [.gitignore](file:///C:/Users/hates/agy-cil-project/.gitignore): Ignores compilation caches, local environments, and IDE project properties.

---

## Installation & Setup

Follow these steps to run the application locally on your machine:

### 1. Clone the repository
```bash
git clone https://github.com/aryabuilds404/arya-kag-event-talks-app.git
cd arya-kag-event-talks-app
```

### 2. Install dependencies
Install Flask and requests packages:
```bash
python -m pip install flask requests
```

### 3. Run the development server
Start the Flask application:
```bash
python app.py
```

### 4. Open in browser
Navigate to the local dev host:
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## How It Works

### Feed Fetching & Parsing Flow
1. Clicking **Refresh Feed** makes an HTTP request from the client (`app.js`) to the backend API (`/api/release-notes`).
2. The server (`app.py`) fetches the XML payload from Google Cloud, parses entries, and returns them as a structured JSON object.
3. JavaScript parses each entry's HTML content inside a shadow document, breaking them into individual cards.
4. Updates are rendered dynamically and are instantly searchable.

### Sharing Updates
- Click on any update card to select it. This pops up the bottom action bar.
- Click **Tweet Selected Update** to open the Twitter/X intent composer pre-populated with a clean status (e.g. `BigQuery Update (June 15, 2026) | Feature: ...`).
- Alternatively, click the **Tweet** button directly in the footer of any card.
