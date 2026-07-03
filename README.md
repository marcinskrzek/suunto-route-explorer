# Suunto Route Explorer

Small browser snippet for exploring routes stored in Suunto Routeplanner.

It lets you:
- list all routes from your Suunto account
- sort and filter routes
- choose visible columns
- preview route JSON
- preview exported GPX
- download route JSON or GPX
- download all route metadata as JSON

This tool runs locally in your browser on `routeplanner.suunto.com`.
It does not require your Suunto password and does not send your data anywhere except to Suunto APIs already used by Routeplanner.

## Status

Experimental / personal tool.

Currently read-only.  
Route deletion/update is intentionally not included.

## How to use

1. Open:

   https://routeplanner.suunto.com

2. Log in with your Suunto account.

3. Open Chrome DevTools:

   - Windows/Linux: `F12`
   - macOS: `Cmd + Option + I`

4. Go to:

   `Sources` → `Snippets`

5. Create a new snippet, for example:

   `suunto-route-explorer.js`

6. Paste the contents of:

   `suunto-route-explorer.js`

7. Run the snippet:

   `Ctrl + Enter`

8. A Suunto Route Explorer window should appear on top of Routeplanner.

## Features

### Routes table

The left panel shows your routes.

You can:
- sort by clicking column headers
- select visible columns
- reorder columns
- filter by:
  - route name
  - created date from/to
  - distance from/to

### Details preview

Selecting a route loads both:

- JSON route details
- GPX export

Depending on the selected layout:
- details can be displayed on the right
- or below the route list

Each preview has its own download button.

## Security notes

The script reads `suunto_access_token` from browser storage used by Suunto Routeplanner.

Do not paste your access token into issues, screenshots, logs, or public places.

The script should be run only on:

```text
https://routeplanner.suunto.com