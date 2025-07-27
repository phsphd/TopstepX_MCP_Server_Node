#!/usr/bin/env node

/**
 * TopstepX MCP Server
 * 
 * Provides tools for managing positions and orders on TopstepX trading platform.
 * Features:
 * - Account management
 * - Contract search and details
 * - Position management
 * - Order placement and management
 * - Market data retrieval
 */

import dotenv from 'dotenv';
dotenv.config();

import * as logger from './logger.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { authenticate } from './auth.js';
import { initializeData, accountsCache, getPositions } from './data.js';
import {
  handleGetAccounts,
  handleGetContractDetails,
  handleSearchContracts,
  handleListPositions,
  handlePlaceOrder,
  handleClosePosition,
  handleModifyOrder,
  handleCancelOrder,
  handleListOrders,
  handleGetAccountSummary,
  handleGetMarketData,
  handleGetBars,
  handleGetCommonContracts
} from './tools.js';

/**
 * Create the MCP server
 */
export const server = new Server(
  { 
    name: 'topstepx-mcp-server', 
    version: '0.1.0' 
  },
  {
    capabilities: {
      resources: {
        'topstepx://account/': {
          name: 'TopstepX Accounts',
          description: 'Trading accounts on TopstepX',
        },
        'topstepx://position/': {
          name: 'TopstepX Positions',
          description: 'Current positions in your TopstepX accounts',
        },
      },
      tools: {
        get_accounts: {
          description: 'Get list of available trading accounts',
          parameters: {
            type: 'object',
            properties: {},
          },
        },
        get_contract_details: {
          description: 'Get detailed information about a specific contract by symbol',
          parameters: {
            type: 'object',
            properties: {
              symbol: {
                type: 'string',
                description: 'The contract symbol (e.g., MES, MNQ)',
              },
            },
            required: ['symbol'],
          },
        },
        search_contracts: {
          description: 'Search for contracts by text',
          parameters: {
            type: 'object',
            properties: {
              searchText: {
                type: 'string',
                description: 'Text to search for in contract symbols or names',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results to return (default: 10)',
              },
            },
            required: ['searchText'],
          },
        },
        get_common_contracts: {
          description: 'Get list of commonly traded contracts (MES, MNQ, etc.)',
          parameters: {
            type: 'object',
            properties: {},
          },
        },
        list_positions: {
          description: 'List all open positions',
          parameters: {
            type: 'object',
            properties: {
              accountId: {
                type: 'number',
                description: 'The account ID (optional, will list all if not provided)',
              },
            },
          },
        },
        place_order: {
          description: 'Place a new order',
          parameters: {
            type: 'object',
            properties: {
              symbol: {
                type: 'string',
                description: 'The contract symbol (e.g., MES, MNQ)',
              },
              side: {
                type: 'string',
                description: 'Order side: Buy or Sell',
                enum: ['Buy', 'Sell'],
              },
              quantity: {
                type: 'number',
                description: 'Number of contracts',
              },
              orderType: {
                type: 'string',
                description: 'Type of order',
                enum: ['Market', 'Limit', 'Stop', 'StopLimit'],
              },
              price: {
                type: 'number',
                description: 'Price for Limit orders',
              },
              stopPrice: {
                type: 'number',
                description: 'Stop price for Stop orders',
              },
              accountId: {
                type: 'number',
                description: 'The account ID (optional, will use default if not provided)',
              },
              timeInForce: {
                type: 'string',
                description: 'Time in force (default: Day)',
                enum: ['Day', 'GTC', 'IOC', 'FOK'],
              },
            },
            required: ['symbol', 'side', 'quantity'],
          },
        },
        close_position: {
          description: 'Close an existing position',
          parameters: {
            type: 'object',
            properties: {
              symbol: {
                type: 'string',
                description: 'The contract symbol to close',
              },
              accountId: {
                type: 'number',
                description: 'The account ID with the position',
              },
              quantity: {
                type: 'number',
                description: 'Quantity to close (optional, will close entire position if not provided)',
              },
            },
            required: ['symbol'],
          },
        },
        modify_order: {
          description: 'Modify an existing order',
          parameters: {
            type: 'object',
            properties: {
              orderId: {
                type: 'number',
                description: 'The order ID to modify',
              },
              quantity: {
                type: 'number',
                description: 'New quantity',
              },
              price: {
                type: 'number',
                description: 'New price for Limit orders',
              },
              stopPrice: {
                type: 'number',
                description: 'New stop price for Stop orders',
              },
            },
            required: ['orderId'],
          },
        },
        cancel_order: {
          description: 'Cancel an existing order',
          parameters: {
            type: 'object',
            properties: {
              orderId: {
                type: 'number',
                description: 'The order ID to cancel',
              },
            },
            required: ['orderId'],
          },
        },
        list_orders: {
          description: 'List orders',
          parameters: {
            type: 'object',
            properties: {
              accountId: {
                type: 'number',
                description: 'The account ID (optional)',
              },
              onlyOpen: {
                type: 'boolean',
                description: 'Only show open orders (default: true)',
              },
            },
          },
        },
        get_account_summary: {
          description: 'Get account summary including balance and P&L',
          parameters: {
            type: 'object',
            properties: {
              accountId: {
                type: 'number',
                description: 'The account ID (optional, will use default if not provided)',
              },
            },
          },
        },
        get_market_data: {
          description: 'Get latest market data for a contract',
          parameters: {
            type: 'object',
            properties: {
              symbol: {
                type: 'string',
                description: 'The contract symbol (e.g., MES, MNQ)',
              },
            },
            required: ['symbol'],
          },
        },
        get_bars: {
          description: 'Get historical bar data for a contract',
          parameters: {
            type: 'object',
            properties: {
              symbol: {
                type: 'string',
                description: 'The contract symbol',
              },
              startTime: {
                type: 'string',
                description: 'Start time in ISO format',
              },
              endTime: {
                type: 'string',
                description: 'End time in ISO format',
              },
              barType: {
                type: 'string',
                description: 'Bar type (default: 1min)',
                enum: ['1min', '5min', '15min', '30min', '1hour', '4hour', '1day'],
              },
            },
            required: ['symbol', 'startTime', 'endTime'],
          },
        },
      },
    },
  }
);

/**
 * Resource handlers
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'topstepx://account/',
        name: 'TopstepX Accounts',
        description: 'Trading accounts on TopstepX',
      },
      {
        uri: 'topstepx://position/',
        name: 'TopstepX Positions',
        description: 'Current positions in your TopstepX accounts',
      },
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;
  const match = uri.match(/^topstepx:\/\/([^\/]+)(?:\/(.*))?$/);
  
  if (!match) {
    throw new Error(`Invalid resource URI: ${uri}`);
  }
  
  const resourceType = match[1];
  const resourceId = match[2];
  
  switch (resourceType) {
    case 'account': {
      if (resourceId) {
        const account = accountsCache[Number(resourceId)];
        if (!account) {
          throw new Error(`Account not found: ${resourceId}`);
        }
        return {
          contents: [{
            type: 'application/json',
            text: JSON.stringify(account, null, 2),
            uri: `topstepx://account/${resourceId}`
          }],
        };
      } else {
        const accounts = Object.values(accountsCache);
        return {
          contents: [{
            type: 'application/json',
            text: JSON.stringify(accounts, null, 2),
            uri: 'topstepx://account/'
          }],
        };
      }
    }
    
    case 'position': {
      const positions = await getPositions(resourceId ? Number(resourceId) : undefined);
      return {
        contents: [{
          type: 'application/json',
          text: JSON.stringify(positions, null, 2),
          uri: resourceId ? `topstepx://position/${resourceId}` : 'topstepx://position/'
        }],
      };
    }
    
    default:
      throw new Error(`Unknown resource type: ${resourceType}`);
  }
});

/**
 * Tool handlers
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_accounts',
        description: 'Get list of available trading accounts',
        inputSchema: {
          type: 'object',
          properties: {},
        }
      },
      {
        name: 'get_contract_details',
        description: 'Get detailed information about a specific contract by symbol',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'The contract symbol (e.g., MES, MNQ)',
            },
          },
          required: ['symbol'],
        }
      },
      {
        name: 'search_contracts',
        description: 'Search for contracts by text',
        inputSchema: {
          type: 'object',
          properties: {
            searchText: {
              type: 'string',
              description: 'Text to search for',
            },
            limit: {
              type: 'number',
              description: 'Maximum results',
            },
          },
          required: ['searchText'],
        }
      },
      {
        name: 'get_common_contracts',
        description: 'Get list of commonly traded contracts',
        inputSchema: {
          type: 'object',
          properties: {},
        }
      },
      {
        name: 'list_positions',
        description: 'List all open positions',
        inputSchema: {
          type: 'object',
          properties: {
            accountId: {
              type: 'number',
              description: 'Account ID (optional)',
            },
          },
        }
      },
      {
        name: 'place_order',
        description: 'Place a new order',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: { type: 'string' },
            side: { type: 'string', enum: ['Buy', 'Sell'] },
            quantity: { type: 'number' },
            orderType: { type: 'string', enum: ['Market', 'Limit', 'Stop', 'StopLimit'] },
            price: { type: 'number' },
            stopPrice: { type: 'number' },
            accountId: { type: 'number' },
            timeInForce: { type: 'string', enum: ['Day', 'GTC', 'IOC', 'FOK'] },
          },
          required: ['symbol', 'side', 'quantity'],
        }
      },
      {
        name: 'close_position',
        description: 'Close an existing position',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: { type: 'string' },
            accountId: { type: 'number' },
            quantity: { type: 'number' },
          },
          required: ['symbol'],
        }
      },
      {
        name: 'modify_order',
        description: 'Modify an existing order',
        inputSchema: {
          type: 'object',
          properties: {
            orderId: { type: 'number' },
            quantity: { type: 'number' },
            price: { type: 'number' },
            stopPrice: { type: 'number' },
          },
          required: ['orderId'],
        }
      },
      {
        name: 'cancel_order',
        description: 'Cancel an existing order',
        inputSchema: {
          type: 'object',
          properties: {
            orderId: { type: 'number' },
          },
          required: ['orderId'],
        }
      },
      {
        name: 'list_orders',
        description: 'List orders',
        inputSchema: {
          type: 'object',
          properties: {
            accountId: { type: 'number' },
            onlyOpen: { type: 'boolean' },
          },
        }
      },
      {
        name: 'get_account_summary',
        description: 'Get account summary',
        inputSchema: {
          type: 'object',
          properties: {
            accountId: { type: 'number' },
          },
        }
      },
      {
        name: 'get_market_data',
        description: 'Get latest market data',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: { type: 'string' },
          },
          required: ['symbol'],
        }
      },
      {
        name: 'get_bars',
        description: 'Get historical bar data',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: { type: 'string' },
            startTime: { type: 'string' },
            endTime: { type: 'string' },
            barType: { type: 'string' },
          },
          required: ['symbol', 'startTime', 'endTime'],
        }
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    switch (request.params.name) {
      case 'get_accounts':
        return await handleGetAccounts(request);
      case 'get_contract_details':
        return await handleGetContractDetails(request);
      case 'search_contracts':
        return await handleSearchContracts(request);
      case 'get_common_contracts':
        return await handleGetCommonContracts(request);
      case 'list_positions':
        return await handleListPositions(request);
      case 'place_order':
        return await handlePlaceOrder(request);
      case 'close_position':
        return await handleClosePosition(request);
      case 'modify_order':
        return await handleModifyOrder(request);
      case 'cancel_order':
        return await handleCancelOrder(request);
      case 'list_orders':
        return await handleListOrders(request);
      case 'get_account_summary':
        return await handleGetAccountSummary(request);
      case 'get_market_data':
        return await handleGetMarketData(request);
      case 'get_bars':
        return await handleGetBars(request);
      default:
        return {
          content: [{
            type: 'text',
            text: `Unknown tool: ${request.params.name}`
          }],
          isError: true
        };
    }
  } catch (error) {
    logger.error(`Error handling tool ${request.params.name}:`, error);
    return {
      content: [{
        type: 'text',
        text: `Error: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
});

// Prompts are not used in this server

/**
 * Initialize the server
 */
export async function initialize() {
  try {
    await authenticate();
    logger.info('TopstepX MCP server authenticated successfully');
    
    await initializeData();
    
    // Set up periodic data refresh (every 5 minutes)
    setInterval(async () => {
      try {
        await initializeData();
      } catch (error) {
        logger.error('Error refreshing data:', error);
      }
    }, 5 * 60 * 1000);
  } catch (error) {
    logger.error('Failed to initialize TopstepX MCP server:', error);
    throw error;
  }
}

/**
 * Main entry point
 */
export async function main() {
  try {
    logger.info('Starting TopstepX MCP server...');
    
    await initialize();
    
    const transport = new StdioServerTransport();
    await server.connect(transport);
    logger.info('TopstepX MCP server started successfully');
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      logger.info('Shutting down TopstepX MCP server...');
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      logger.info('Shutting down TopstepX MCP server...');
      process.exit(0);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Run if this is the main module
const isMainModule = process.argv[1] === new URL(import.meta.url).pathname ||
                    process.argv[1] === new URL(import.meta.url).pathname.replace(/^\//, '') ||
                    process.argv[1].replace(/\\/g, '/').endsWith('build/src/index.js');

if (isMainModule) {
  main().catch((error) => {
    logger.error('Server error:', error);
    process.exit(1);
  });
}