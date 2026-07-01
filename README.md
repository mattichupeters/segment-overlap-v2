# Segment Overlap for Data Cloud

Visualize and compare membership overlap across your Data Cloud segments with an interactive Venn diagram. Compare up to 4 segments at once.

![Salesforce](https://img.shields.io/badge/Salesforce-Data%20Cloud-00A1E0?logo=salesforce&logoColor=white)

## Features

- **Multi-segment comparison** — compare 2, 3, or 4 segments at once
- **Interactive Venn diagram** — visual overlap with color-coded circles
- **Pairwise overlap table** — see exact overlap between every pair
- **Automatic table discovery** — works with any org's Data Cloud membership tables
- **Salesforce-native design** — matches Salesforce CRM Analytics dashboard styling

## Prerequisites

- Salesforce org with **Data Cloud** enabled
- At least one **published segment** with membership data
- User must have Data Cloud permissions (e.g., `Data Cloud Admin` or `Data Cloud User` permission set)

## Deploy to Your Org

### Option 1: Deploy via Salesforce CLI

```bash
# Clone the repo
git clone https://github.com/YOUR_ORG/segment-overlap.git
cd segment-overlap

# Authenticate to your org
sf org login web --alias my-org

# Deploy
sf project deploy start --target-org my-org --wait 10
```

### Option 2: Deploy via Metadata API (package.xml)

```bash
sf project deploy start --manifest manifest/package.xml --target-org my-org --wait 10
```

### Option 3: Deploy via URL

Use this link to deploy directly from GitHub (replace `YOUR_ORG/segment-overlap` with your repo path):

```
https://login.salesforce.com/packaging/installPackage.apexp?p0=YOUR_PACKAGE_ID
```

Or use the Salesforce CLI deploy link:

```
https://deploy-to-sfdx.com/deploy?template=https://github.com/YOUR_ORG/segment-overlap
```

## Post-Deploy Setup

1. **Navigate** to the **Segment Overlap** tab (it's automatically created)
2. If you don't see the tab, go to **Setup → Tabs** and add "Segment Overlap" to your app
3. Select 2–4 segments from the dropdowns
4. Click **Calculate Overlap** to see the results

## How It Works

The app dynamically discovers your org's Data Cloud configuration:

1. **Lists segments** via the `MarketSegment` standard object and `ConnectApi.CdpSegment`
2. **Discovers membership tables** using `ConnectApi.CdpSegment.getSegment()` — no hardcoded table names
3. **Queries membership data** via `ConnectApi.CdpQuery.queryAnsiSqlV2()` (Data Cloud ANSI SQL)
4. **Computes overlaps** — pairwise intersections plus full intersection across all selected segments

## Package Contents

| Component | Type | Description |
|-----------|------|-------------|
| `DataCloudService` | Apex Class | Data Cloud query logic and overlap computation |
| `SegmentOverlapController` | Apex Class | AuraEnabled controller for the LWC |
| `SegmentOverlapControllerTest` | Apex Test | Unit tests |
| `segmentOverlapApp` | LWC | Main UI component |
| `vennDiagramSvg` | LWC | SVG Venn diagram renderer |
| `Segment_Overlap` | FlexiPage | Lightning App Page layout |
| `Segment_Overlap` | Custom Tab | Navigation tab |

## Compatibility

- **API Version**: 62.0+
- **Salesforce Edition**: Enterprise, Unlimited, or Developer with Data Cloud
- **Data Cloud**: Any org with published segments and membership data

## License

MIT
