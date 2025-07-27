# TopstepX MCP Server
![Visitor Count](https://visitor-badge.laobi.icu/badge?page_id=phsphd.TopstepX_MCP_Server_Node)
 
An MCP (Model Context Protocol) server for TopstepX trading platform that provides tools for managing positions, orders, and market data.

## Features

- **Account Management**: List and view trading accounts
- **Contract Search**: Search and get details about futures contracts
- **Position Management**: View and close positions
- **Order Management**: Place, modify, and cancel orders
- **Market Data**: Get real-time quotes and historical bar data
- **Resource Access**: Access accounts and positions as MCP resources

## Installation

1. Clone or download this directory
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the project:
   ```bash
   npm run build
   ```

## Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your TopstepX credentials:
   ```env
   TOPSTEPX_USERNAME=your_username
   TOPSTEPX_API_KEY=your_api_key
   TOPSTEPX_ENVIRONMENT=demo  # or 'live' for production
   ```

## Usage with Claude Desktop

Add the following to your Claude Desktop configuration file:

### macOS/Linux
Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "topstepx": {
      "command": "node",
      "args": ["/path/to/topstepxmcp/build/src/index.js"],
      "env": {
        "TOPSTEPX_USERNAME": "your_username",
        "TOPSTEPX_API_KEY": "your_api_key",
        "TOPSTEPX_ENVIRONMENT": "demo"
      }
    }
  }
}
```

### Windows
Add to `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "topstepx": {
      "command": "node",
      "args": ["C:\\path\\to\\topstepxmcp\\build\\src\\index.js"],
      "env": {
        "TOPSTEPX_USERNAME": "your_username",
        "TOPSTEPX_API_KEY": "your_api_key",
        "TOPSTEPX_ENVIRONMENT": "demo"
      }
    }
  }
}
```

## Available Tools

### Account Tools
- `get_accounts` - Get list of trading accounts
- `get_account_summary` - Get account balance and P&L summary

### Contract Tools
- `get_contract_details` - Get details for a specific symbol
- `search_contracts` - Search for contracts by text
- `get_common_contracts` - Get commonly traded contracts (MES, MNQ, etc.)

### Position Tools
- `list_positions` - List all open positions
- `close_position` - Close a position (fully or partially)

### Order Tools
- `place_order` - Place a new order (Market, Limit, Stop, StopLimit)
- `modify_order` - Modify an existing order
- `cancel_order` - Cancel an order
- `list_orders` - List orders (open or all)

### Market Data Tools
- `get_market_data` - Get latest market data for a symbol
- `get_bars` - Get historical bar data

## Resources

The server provides access to two resource types:

- `topstepx://account/` - List all accounts
- `topstepx://account/{id}` - Get specific account details
- `topstepx://position/` - List all positions
- `topstepx://position/{accountId}` - List positions for specific account

## Development

- Run in development mode: `npm run dev`
- Watch for changes: `npm run watch`
- Run tests: `npm test`
- Use MCP Inspector: `npm run inspector`

## Environment Variables

- `TOPSTEPX_USERNAME` - Your TopstepX username
- `TOPSTEPX_API_KEY` - Your TopstepX API key
- `TOPSTEPX_ENVIRONMENT` - Trading environment ('demo' or 'live')
- `LOG_LEVEL` - Logging level (DEBUG, INFO, WARN, ERROR)

## Common Contracts

The server pre-loads these common micro futures contracts:
- MES (Micro E-mini S&P 500)
- MNQ (Micro E-mini NASDAQ-100)
- MYM (Micro E-mini Dow)
- M2K (Micro E-mini Russell 2000)
- MGC (Micro Gold)
- MCL (Micro Crude Oil)
- MBT (Micro Bitcoin)
- MET (Micro Ether)

## Error Handling

The server includes comprehensive error handling:
- Authentication errors are logged and retried
- API errors return descriptive messages
- Connection issues are handled gracefully
- All errors are logged for debugging

## License

MIT# TopStepX_MCP_Node
