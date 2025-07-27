/**
 * Type definitions for TopstepX MCP Server
 */

export interface TopstepXConfig {
  apiUrl: string;
  username: string;
  apiKey: string;
  environment: 'demo' | 'live';
}

export interface Account {
  id: number;
  name: string;
  balance: number;
  canTrade: boolean;
  isVisible: boolean;
  simulated: boolean;
}

export interface Contract {
  id: number;
  symbol: string;
  name: string;
  exchange: string;
  tickSize: number;
  pointValue: number;
  minQuantity: number;
  maxQuantity: number;
  tradingHours: string;
}

export interface Position {
  id: number;
  accountId: number;
  contractId: number;
  symbol: string;
  quantity: number;
  side: 'Buy' | 'Sell';
  averagePrice: number;
  unrealizedPnl: number;
  realizedPnl: number;
  openTime: string;
}

export interface Order {
  id: number;
  accountId: number;
  contractId: number;
  symbol: string;
  side: 'Buy' | 'Sell';
  orderType: 'Market' | 'Limit' | 'Stop' | 'StopLimit';
  quantity: number;
  price?: number;
  stopPrice?: number;
  status: 'Pending' | 'Working' | 'Filled' | 'Cancelled' | 'Rejected';
  filledQuantity: number;
  averageFilledPrice?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlaceOrderRequest {
  accountId: number;
  contractId: number;
  side: 'Buy' | 'Sell';
  orderType: 'Market' | 'Limit' | 'Stop' | 'StopLimit';
  quantity: number;
  price?: number;
  stopPrice?: number;
  timeInForce?: 'Day' | 'GTC' | 'IOC' | 'FOK';
}

export interface ModifyOrderRequest {
  orderId: number;
  quantity?: number;
  price?: number;
  stopPrice?: number;
}

export interface MarketData {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  high: number;
  low: number;
  volume: number;
  timestamp: string;
}

export interface Bar {
  symbol: string;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  errorMessage?: string;
  errorCode?: number;
}

export interface AccountSearchResponse {
  accounts: Account[];
  success: boolean;
  errorCode: number;
  errorMessage: string | null;
}