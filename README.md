# Suunto Route Explorer

A lightweight browser snippet for exploring routes stored in Suunto Routeplanner.

It provides a much more convenient way to browse large route collections than the built-in Routeplanner interface.

## Features

- Browse all routes from your Suunto account
- Sort by any visible column
- Show / hide columns
- Reorder columns using drag & drop
- Filter routes by:
  - route name
  - creation date (from / to)
  - distance (from / to)
- Preview route on an interactive map
- Preview route JSON
- Preview exported GPX
- Download individual JSON
- Download individual GPX
- Export metadata for all routes as a single JSON file

## Status

Experimental personal project.

Current version is **read-only**.

Route editing and deletion are intentionally not implemented.

## Requirements

- Google Chrome (or another Chromium-based browser)
- Logged into your Suunto account
- https://routeplanner.suunto.com

No installation is required.

## How to use

1. Open:

   https://routeplanner.suunto.com

2. Sign in to your Suunto account.

3. Open Chrome Developer Tools.

   - Windows/Linux: **F12**
   - macOS: **⌘ + Option + I**

4. Open:

   **Sources → Snippets**

5. Create a new snippet, for example:

   ```
   suunto-route-explorer.js
   ```

6. Paste the contents of `suunto-route-explorer.js`.

7. Run the snippet.

   **Ctrl + Enter**

8. The Route Explorer window will appear on top of Routeplanner.

## Interface

### Routes

The left panel contains the route list.

Available features:

- sorting by clicking column headers
- configurable visible columns
- drag & drop column ordering
- filtering
- resizable list/details splitter
- selected row highlighting

### Details

Selecting a route automatically loads:

- interactive map preview
- route JSON
- exported GPX

Each section can be collapsed independently.

Both JSON and GPX sections support:

- text selection
- scrolling
- downloading

The map automatically fits the selected route and can be re-centered using the **Fit** button.

## Security

The script runs entirely inside your own browser.

It uses the same authenticated requests that Routeplanner already performs and reads the existing `suunto_access_token` from browser storage.

The script:

- does not ask for your password
- does not transmit your data anywhere except Suunto services
- does not use any third-party servers

Never share your access token publicly.

## Limitations

This is an unofficial tool.

Suunto may change Routeplanner or its internal API at any time, which could require updating the script.

Current limitations:

- read-only
- no bulk operations
- no route editing
- no route deletion
- tested primarily with Google Chrome

## Future ideas

Possible future improvements:

- Chrome Extension
- persistent UI settings
- duplicate route detection
- route statistics
- CSV export
- route search improvements
- favorites
- API explorer
- bulk export options

## License

MIT