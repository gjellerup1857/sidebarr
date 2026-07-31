# Sidebarr — Browser Sidebar Tool

A Chromium extension that gives any webpage a native-feeling side panel. A 44px rail docks permanently at the right edge of the viewport without ever covering page content, and expands into a full side panel for browsing any website inside the browser.

![Screenshot 1](screenshots/screenshot-1.png)

## Features

- **Dual Rail architecture**: when the side panel is open, the rail lives on the panel's right edge; when closed, the page content automatically makes room (44px) and the rail docks like part of the native browser — **never covers content, never disappears**
- **Embed websites in the side panel**: click a site icon on the rail to open it in the native side panel (via `declarativeNetRequest` dynamic rules that strip X-Frame-Options / CSP headers)
- **Quick add**: click `+` to add the current tab to the rail
- **One-click Google search**: click `<` to instantly open Google in the side panel
- **Drag to reorder**: drag site icons to rearrange them
- **Right-click to remove**: right-click an icon to remove it from the rail
- **Themes & custom colors**: auto (follows the browser) / light / dark / custom color

## Installation (Developer Mode)

1. Download this repository (Code → Download ZIP) and extract it
2. Open your browser's extension management page:
   - Brave: `brave://extensions`
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the extracted folder

## Compatibility

| Browser | Status |
|---|---|
| Brave / Chrome / Edge | ✅ Fully supported |
| Opera / Vivaldi / Arc and other Chromium browsers | ✅ Should work |
| Firefox | ❌ Not supported (uses the WebExtension side panel API) |

Version requirements: `chrome.sidePanel.close()` requires Chrome 141+; `chrome.sidePanel.onClosed` requires Chrome 142+ (degrades gracefully when unavailable, without affecting functionality).

## Usage

- **When the side panel is closed**: a 44px dock is reserved on the right side of the page — click an icon to open the side panel
- **When the side panel is open**: click `X` or `<` to collapse back to the dock
- **Add a site**: browse to the site → click `+`
- **Remove a site**: right-click its icon
- **Reorder**: drag the icons
- **Settings**: click the gear icon to switch themes or pick a custom color

## Permissions

| Permission | Purpose |
|---|---|
| `sidePanel` | Display websites in the browser's native side panel |
| `declarativeNetRequest` | Static/dynamic rules that strip X-Frame-Options and CSP headers so websites can be embedded in the side panel |
| `storage` | Store the site list, order, and theme settings (local only) |
| `tabs` | Read the current tab's URL/title to add it to the rail |
| `scripting` | Inject the rail into the page when the side panel is closed |

This extension **does not collect or upload any user data**. Everything is stored locally on your device.

## Development

```
brave-sidebar/
├── manifest.json      # Extension manifest (MV3)
├── background.js      # Side panel open/close, rule management, dynamic injection
├── content.js/css     # On-page rail
├── sidepanel.js/html/css # Side panel UI
├── rules.json         # Static DNR rules
└── icons/             # Extension icons
```

To reload: click "Reload" on the extension management page after making changes; already-open tabs need a refresh.

## License

[MIT](LICENSE)
