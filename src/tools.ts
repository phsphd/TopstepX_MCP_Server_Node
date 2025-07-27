/**
 * Tool handlers for TopstepX MCP Server
 */

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { topstepxRequest } from './auth.js';
import { 
  accountsCache, 
  contractsCache, 
  getContractBySymbol, 
  getPositions, 
  getOrders,
  getDefaultAccountId,
  symbolToContractIdMap
} from './data.js';
import * as logger from './logger.js';
import {
  Account,
  Contract,
  Position,
  Order,
  PlaceOrderRequest,
  ModifyOrderRequest,
  MarketData,
  Bar
} from './types.js';

// Helper function to create a successful tool result
function createToolResult(data: any): CallToolResult {
  return {
    content: [{
      type: 'text',
      text: JSON.stringify(data, null, 2)
    }]
  };
}

// Helper function to create an error tool result
function createErrorResult(error: string): CallToolResult {
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({ error }, null, 2)
    }],
    isError: true
  };
}

export async function handleGetAccounts(request: any): Promise<CallToolResult> {
  try {
    const accounts = Object.values(accountsCache);
    return createToolResult({
      accounts,
      count: accounts.length
    });
  } catch (error) {
    logger.error('Error getting accounts:', error);
    return createErrorResult(`Failed to get accounts: ${error}`);
  }
}

export async function handleGetContractDetails(request: any): Promise<CallToolResult> {
  try {
    const { symbol } = request.params.arguments;
    
    if (!symbol) {
      return createErrorResult('Symbol is required');
    }
    
    const contract = await getContractBySymbol(symbol);
    
    if (!contract) {
      return createErrorResult(`Contract not found: ${symbol}`);
    }
    
    return createToolResult(contract);
  } catch (error) {
    logger.error('Error getting contract details:', error);
    return createErrorResult(`Failed to get contract details: ${error}`);
  }
}

export async function handleSearchContracts(request: any): Promise<CallToolResult> {
  try {
    const { searchText, limit = 10 } = request.params.arguments;
    
    if (!searchText) {
      return createErrorResult('Search text is required');
    }
    
    const contracts = await topstepxRequest<Contract[]>('POST', '/Contract/search', {
      searchText,
      live: false
    });
    
    return createToolResult({
      contracts: contracts.slice(0, limit),
      count: contracts.length
    });
  } catch (error) {
    logger.error('Error searching contracts:', error);
    return createErrorResult(`Failed to search contracts: ${error}`);
  }
}

export async function handleListPositions(request: any): Promise<CallToolResult> {
  try {
    const { accountId } = request.params.arguments;
    const positions = await getPositions(accountId);
    
    return createToolResult({
      positions,
      count: positions.length
    });
  } catch (error) {
    logger.error('Error listing positions:', error);
    return createErrorResult(`Failed to list positions: ${error}`);
  }
}

export async function handlePlaceOrder(request: any): Promise<CallToolResult> {
  try {
    const { 
      symbol, 
      side, 
      quantity, 
      orderType = 'Market',
      price,
      stopPrice,
      accountId,
      timeInForce = 'Day'
    } = request.params.arguments;
    
    if (!symbol || !side || !quantity) {
      return createErrorResult('Symbol, side, and quantity are required');
    }
    
    // Get contract
    const contract = await getContractBySymbol(symbol);
    if (!contract) {
      return createErrorResult(`Contract not found: ${symbol}`);
    }
    
    // Use provided account or default
    const targetAccountId = accountId || getDefaultAccountId();
    if (!targetAccountId) {
      return createErrorResult('No account ID provided and no default account available');
    }
    
    const orderRequest: PlaceOrderRequest = {
      accountId: targetAccountId,
      contractId: contract.id,
      side,
      orderType,
      quantity,
      timeInForce
    };
    
    if (orderType === 'Limit' || orderType === 'StopLimit') {
      if (!price) {
        return createErrorResult('Price is required for Limit orders');
      }
      orderRequest.price = price;
    }
    
    if (orderType === 'Stop' || orderType === 'StopLimit') {
      if (!stopPrice) {
        return createErrorResult('Stop price is required for Stop orders');
      }
      orderRequest.stopPrice = stopPrice;
    }
    
    const response = await topstepxRequest('POST', '/Order/place', orderRequest);
    
    return createToolResult({
      success: true,
      order: response
    });
  } catch (error) {
    logger.error('Error placing order:', error);
    return createErrorResult(`Failed to place order: ${error}`);
  }
}

export async function handleClosePosition(request: any): Promise<CallToolResult> {
  try {
    const { symbol, accountId, quantity } = request.params.arguments;
    
    if (!symbol) {
      return createErrorResult('Symbol is required');
    }
    
    // Get contract
    const contract = await getContractBySymbol(symbol);
    if (!contract) {
      return createErrorResult(`Contract not found: ${symbol}`);
    }
    
    // Get positions for this symbol
    const positions = await getPositions(accountId);
    const position = positions.find(p => p.symbol === symbol);
    
    if (!position) {
      return createErrorResult(`No open position found for ${symbol}`);
    }
    
    const closeQuantity = quantity || position.quantity;
    
    const response = await topstepxRequest('POST', '/Position/close-partial', {
      positionId: position.id,
      quantity: closeQuantity
    });
    
    return createToolResult({
      success: true,
      closedPosition: response
    });
  } catch (error) {
    logger.error('Error closing position:', error);
    return createErrorResult(`Failed to close position: ${error}`);
  }
}

export async function handleModifyOrder(request: any): Promise<CallToolResult> {
  try {
    const { orderId, quantity, price, stopPrice } = request.params.arguments;
    
    if (!orderId) {
      return createErrorResult('Order ID is required');
    }
    
    const modifyRequest: ModifyOrderRequest = {
      orderId
    };
    
    if (quantity !== undefined) modifyRequest.quantity = quantity;
    if (price !== undefined) modifyRequest.price = price;
    if (stopPrice !== undefined) modifyRequest.stopPrice = stopPrice;
    
    const response = await topstepxRequest('POST', '/Order/modify', modifyRequest);
    
    return createToolResult({
      success: true,
      order: response
    });
  } catch (error) {
    logger.error('Error modifying order:', error);
    return createErrorResult(`Failed to modify order: ${error}`);
  }
}

export async function handleCancelOrder(request: any): Promise<CallToolResult> {
  try {
    const { orderId } = request.params.arguments;
    
    if (!orderId) {
      return createErrorResult('Order ID is required');
    }
    
    const response = await topstepxRequest('POST', '/Order/cancel', {
      orderId
    });
    
    return createToolResult({
      success: true,
      cancelled: response
    });
  } catch (error) {
    logger.error('Error cancelling order:', error);
    return createErrorResult(`Failed to cancel order: ${error}`);
  }
}

export async function handleListOrders(request: any): Promise<CallToolResult> {
  try {
    const { accountId, onlyOpen = true } = request.params.arguments;
    const orders = await getOrders(accountId, onlyOpen);
    
    return createToolResult({
      orders,
      count: orders.length
    });
  } catch (error) {
    logger.error('Error listing orders:', error);
    return createErrorResult(`Failed to list orders: ${error}`);
  }
}

export async function handleGetAccountSummary(request: any): Promise<CallToolResult> {
  try {
    const { accountId } = request.params.arguments;
    
    const targetAccountId = accountId || getDefaultAccountId();
    if (!targetAccountId) {
      return createErrorResult('No account ID provided and no default account available');
    }
    
    const account = accountsCache[targetAccountId];
    if (!account) {
      return createErrorResult(`Account not found: ${targetAccountId}`);
    }
    
    // Get positions and calculate P&L
    const positions = await getPositions(targetAccountId);
    const openOrders = await getOrders(targetAccountId, true);
    
    const totalUnrealizedPnl = positions.reduce((sum, pos) => sum + (pos.unrealizedPnl || 0), 0);
    const totalRealizedPnl = positions.reduce((sum, pos) => sum + (pos.realizedPnl || 0), 0);
    
    return createToolResult({
      account,
      positions: {
        count: positions.length,
        totalUnrealizedPnl,
        totalRealizedPnl
      },
      openOrders: openOrders.length,
      summary: {
        balance: account.balance,
        canTrade: account.canTrade,
        totalPnl: totalUnrealizedPnl + totalRealizedPnl
      }
    });
  } catch (error) {
    logger.error('Error getting account summary:', error);
    return createErrorResult(`Failed to get account summary: ${error}`);
  }
}

export async function handleGetMarketData(request: any): Promise<CallToolResult> {
  try {
    const { symbol } = request.params.arguments;
    
    if (!symbol) {
      return createErrorResult('Symbol is required');
    }
    
    // Get contract
    const contract = await getContractBySymbol(symbol);
    if (!contract) {
      return createErrorResult(`Contract not found: ${symbol}`);
    }
    
    // Get latest bar data (1 minute)
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 60 * 1000); // 1 minute ago
    
    const bars = await topstepxRequest<Bar[]>('POST', '/MarketData/retrieve-bars', {
      contractId: contract.id,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      barType: '1min'
    });
    
    if (bars && bars.length > 0) {
      const latestBar = bars[bars.length - 1];
      return createToolResult({
        symbol,
        contract: {
          id: contract.id,
          name: contract.name
        },
        latestBar,
        timestamp: new Date().toISOString()
      });
    } else {
      return createErrorResult(`No market data available for ${symbol}`);
    }
  } catch (error) {
    logger.error('Error getting market data:', error);
    return createErrorResult(`Failed to get market data: ${error}`);
  }
}

export async function handleGetBars(request: any): Promise<CallToolResult> {
  try {
    const { 
      symbol, 
      startTime, 
      endTime, 
      barType = '1min' 
    } = request.params.arguments;
    
    if (!symbol || !startTime || !endTime) {
      return createErrorResult('Symbol, startTime, and endTime are required');
    }
    
    // Get contract
    const contract = await getContractBySymbol(symbol);
    if (!contract) {
      return createErrorResult(`Contract not found: ${symbol}`);
    }
    
    const bars = await topstepxRequest<Bar[]>('POST', '/MarketData/retrieve-bars', {
      contractId: contract.id,
      startTime,
      endTime,
      barType
    });
    
    return createToolResult({
      symbol,
      barType,
      bars,
      count: bars.length
    });
  } catch (error) {
    logger.error('Error getting bars:', error);
    return createErrorResult(`Failed to get bars: ${error}`);
  }
}

export async function handleGetCommonContracts(request: any): Promise<CallToolResult> {
  try {
    const contracts = Object.values(contractsCache);
    return createToolResult({
      contracts,
      symbols: Object.keys(contractsCache)
    });
  } catch (error) {
    logger.error('Error getting common contracts:', error);
    return createErrorResult(`Failed to get common contracts: ${error}`);
  }
}