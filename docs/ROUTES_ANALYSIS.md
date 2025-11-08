# API Routes Analysis - PHP to Next.js Migration

## PHP Backend Routes (`records_backend.php`)

The PHP backend uses a single endpoint with an `action` parameter to handle all operations:

### Endpoint: `records_backend.php?action=XXX` or `POST records_backend.php`

**Actions:**
1. `get_fish_ranges` - GET
2. `get_water_params` - GET
3. `add_stocking` - POST
4. `get_stocking` - GET
5. `delete_stocking` - POST
6. `add_harvest` - POST
7. `get_harvest` - GET
8. `delete_harvest` - POST
9. `add_feeding` - POST
10. `get_feeding` - GET
11. `delete_feeding` - POST
12. `export_pdf` - GET/POST

## Next.js API Routes Created

### Main Route: `/api/records`

**GET `/api/records?action=get_fish_ranges`**
- Returns fish size ranges
- Matches PHP: `get_fish_ranges()`

**GET `/api/records?action=get_water_params`**
- Returns water parameters
- Matches PHP: `get_water_params()`

**GET `/api/records?action=get_stocking`**
- Returns stocking records for authenticated user
- Matches PHP: `get_stocking_records($conn, $user_id)`

**GET `/api/records?action=get_harvest`**
- Returns harvest records for authenticated user
- Matches PHP: `get_harvest_records($conn, $user_id)`

**GET `/api/records?action=get_feeding`**
- Returns feeding records for authenticated user
- Matches PHP: `get_feeding_records($conn, $user_id)`

**POST `/api/records` (with `action: 'add_stocking'`)**
- Adds new stocking record
- Body: `{ action: 'add_stocking', fish_type, stock_date, aquarium_number, quantity?, notes? }`
- Matches PHP: `addStockingRecord($conn, $user_id)`

**POST `/api/records` (with `action: 'delete_stocking'`)**
- Deletes stocking record
- Body: `{ action: 'delete_stocking', record_id }`
- Matches PHP: `deleteStockingRecord($conn, $user_id)`

**POST `/api/records` (with `action: 'add_harvest'`)**
- Adds new harvest record
- Body: `{ action: 'add_harvest', fish_type, quantity, size, harvest_date, aquarium_number, weight?, notes? }`
- Matches PHP: `addHarvestRecord($conn, $user_id)`

**POST `/api/records` (with `action: 'delete_harvest'`)**
- Deletes harvest record
- Body: `{ action: 'delete_harvest', record_id }`
- Matches PHP: `deleteHarvestRecord($conn, $user_id)`

**POST `/api/records` (with `action: 'add_feeding'`)**
- Adds new feeding record
- Body: `{ action: 'add_feeding', fish_size, food_type, feeding_time, quantity?, notes? }`
- Matches PHP: `addFeedingRecord($conn, $user_id)`

**POST `/api/records` (with `action: 'delete_feeding'`)**
- Deletes feeding record
- Body: `{ action: 'delete_feeding', record_id }`
- Matches PHP: `deleteFeedingRecord($conn, $user_id)`

## Database Schema Verification

### ✅ Tables Match PHP Structure

**stocking_records:**
- ✅ `id`, `user_id`, `fish_type`, `stock_date`, `aquarium_number`, `quantity`, `notes`, `created_at`, `updated_at`

**harvest_records:**
- ✅ `id`, `user_id`, `fish_type`, `quantity`, `size`, `harvest_date`, `aquarium_number`, `weight`, `notes`, `created_at`, `updated_at`

**feeding_records:**
- ✅ `id`, `user_id`, `fish_size`, `food_type`, `feeding_time`, `quantity`, `notes`, `created_at`, `updated_at`

**fish_size_ranges:**
- ✅ `id`, `category`, `min_length`, `max_length`, `min_width`, `max_width`, `created_at`, `updated_at`

**water_parameters:**
- ✅ `id`, `parameter_name`, `normal_min`, `normal_max`, `danger_min`, `danger_max`, `unit`, `created_at`, `updated_at`

## Response Format

All responses match PHP format:
```json
{
  "success": true|false,
  "message": "Status message",
  "data": [...]
}
```

## Authentication

- All routes require authentication via JWT token
- User ID is extracted from token (matching PHP session `user_id`)
- All record operations are user-scoped (users can only access their own records)

