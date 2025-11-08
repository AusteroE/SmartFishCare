# Comprehensive Analysis: PHP to Next.js Migration

## Backend API Routes Analysis

### Separate Backend Files (Used by Frontend)
1. **stocking_backend.php**
   - Actions: `add_stocking`, `get_stocking`, `delete_stocking`
   - Uses FormData POST
   - Returns JSON

2. **harvest_backend.php**
   - Actions: `add_harvest`, `get_harvest`, `delete_harvest`
   - Uses FormData POST
   - Returns JSON

3. **feeding_backend.php**
   - Actions: `add_feeding`, `get_feeding`, `delete_feeding`
   - Uses FormData POST
   - Returns JSON

4. **records_backend.php** (Combined)
   - All actions from above PLUS:
   - `get_fish_ranges`, `get_water_params`, `export_pdf`

### Frontend Pages
1. **dashboard.php** - Main dashboard with sensor data
2. **records.php** - Records overview with navigation cards
3. **stocking.php** - Stocking management page
4. **harvest.php** - Harvest management page
5. **feeding.php** - Feeding schedule management page
6. **alerts.php** - Alerts and notifications page
7. **ranges.php** - Fish size ranges reference page

### Frontend JavaScript Files
1. **scripts.js** - General UI scripts, modals, forms
2. **sidebar-active.js** - Sidebar active state management
3. **darkmode.js** - Dark mode toggle
4. **logout-confirmation.js** - Logout confirmation dialogs
5. **notification-system.js** - Notification display system
6. **fish-detection-enhanced.js** - Fish detection modal functionality

### Frontend CSS Files
1. **styles.css** - Main stylesheet
2. **modern.css** - Modern theme variables
3. **modern-user.css** - User-specific modern styles
4. **fish-detection-modal.css** - Fish detection modal styles

## API Call Patterns

### Stocking Page
- GET: `stocking_backend.php?action=get_stocking`
- POST: `stocking_backend.php` with FormData:
  - `action=add_stocking`
  - `fish_type`, `stock_date`, `aquarium_number`, `quantity`, `notes`
- POST: `stocking_backend.php` with FormData:
  - `action=delete_stocking`
  - `record_id`

### Harvest Page
- GET: `harvest_backend.php?action=get_harvest`
- POST: `harvest_backend.php` with FormData:
  - `action=add_harvest`
  - `fish_type`, `quantity`, `size`, `harvest_date`, `aquarium_number`, `weight`, `notes`
- POST: `harvest_backend.php` with FormData:
  - `action=delete_harvest`
  - `record_id`

### Feeding Page
- GET: `feeding_backend.php?action=get_feeding`
- POST: `feeding_backend.php` with FormData:
  - `action=add_feeding`
  - `fish_size`, `food_type`, `feeding_time`, `quantity`, `notes`
- POST: `feeding_backend.php` with FormData:
  - `action=delete_feeding`
  - `record_id`

## Form Structure Analysis

### Stocking Form
- Input: Fish Type (text, required)
- Input: Stock Date (date, required)
- Input: Aquarium # (text, required)
- Input: Quantity (number, optional)
- Input: Notes (text, optional)
- Button: "Add"

### Harvest Form
- Input: Fish Type (text, required)
- Input: Quantity (number, required)
- Select: Size (Small/Medium/Large, required)
- Input: Harvest Date (date, required)
- Input: Aquarium # (text, required)
- Input: Weight (number, optional)
- Input: Notes (text, optional)
- Button: "Add"

### Feeding Form
- Select: Fish Size (Small/Medium/Large, required)
- Input: Food Type (text, required)
- Input: Feeding Time (time, required)
- Input: Quantity (text, optional)
- Input: Notes (text, optional)
- Button: "Set"

## Table Display Structure

### Stocking Table
- Columns: Fish Type, Stock Date, Aquarium #, Quantity, Action
- Delete button in Action column

### Harvest Table
- Columns: Fish Type, Qty, Size, Date, Aquarium #, Action
- Delete button in Action column

### Feeding Table
- Columns: Size, Food, Time, Quantity, Action
- Delete button in Action column

## Required Next.js Implementation

1. ✅ `/api/records` - Combined API (already created)
2. ⚠️ Create separate routes OR update frontend to use `/api/records`
3. ❌ Create Stocking page (`/dashboard/stocking`)
4. ❌ Create Harvest page (`/dashboard/harvest`)
5. ❌ Create Feeding page (`/dashboard/feeding`)
6. ❌ Create Alerts page (`/dashboard/alerts`)
7. ❌ Update frontend JavaScript functions

