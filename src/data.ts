/**
 * Data management module for TopstepX MCP Server
 */

import { topstepxRequest } from './auth.js';
import * as logger from './logger.js';
import { Account, Contract, Position, Order, AccountSearchResponse } from './types.js';

// Cache for frequently accessed data
export const accountsCache: Record<number, Account> = {};
export const contractsCache: Record<string, Contract> = {};
export const symbolToContractIdMap: Record<string, number> = {};

// Common contract symbols
const COMMON_SYMBOLS = ['MES', 'MNQ', 'MYM', 'M2K', 'MGC', 'MCL', 'MBT', 'MET'];

export async function initializeData(): Promise<void> {
  try {
    logger.info('Initializing TopstepX data...');
    
    // Load accounts
    await loadAccounts();
    
    // Load common contracts
    await loadContracts();
    
    logger.info('Data initialization complete');
  } catch (error) {
    logger.error('Failed to initialize data', error);
    throw error;
  }
}

async function loadAccounts(): Promise<void> {
  try {
    const response = await topstepxRequest<AccountSearchResponse>('POST', '/Account/search', {
      onlyActiveAccounts: true
    });
    
    // Clear and repopulate cache
    Object.keys(accountsCache).forEach(key => delete accountsCache[Number(key)]);
    
    if (response && response.accounts) {
      response.accounts.forEach(account => {
        accountsCache[account.id] = account;
      });
      logger.info(`Loaded ${response.accounts.length} accounts`);
    } else {
      logger.warn('No accounts found in response');
    }
  } catch (error) {
    logger.error('Failed to load accounts', error);
  }
}

async function loadContracts(): Promise<void> {
  try {
    // Clear existing cache
    Object.keys(contractsCache).forEach(key => delete contractsCache[key]);
    Object.keys(symbolToContractIdMap).forEach(key => delete symbolToContractIdMap[key]);
    
    // Load common contracts
    for (const symbol of COMMON_SYMBOLS) {
      try {
        const contracts = await topstepxRequest<Contract[]>('POST', '/Contract/search', {
          searchText: symbol,
          live: false
        });
        
        if (contracts && contracts.length > 0) {
          // Use the first matching contract
          const contract = contracts[0];
          contractsCache[symbol] = contract;
          symbolToContractIdMap[symbol] = contract.id;
          logger.debug(`Loaded contract: ${symbol} (ID: ${contract.id})`);
        }
      } catch (error) {
        logger.warn(`Failed to load contract ${symbol}`, error);
      }
    }
    
    logger.info(`Loaded ${Object.keys(contractsCache).length} contracts`);
  } catch (error) {
    logger.error('Failed to load contracts', error);
  }
}

export async function getContractBySymbol(symbol: string): Promise<Contract | null> {
  // Check cache first
  if (contractsCache[symbol]) {
    return contractsCache[symbol];
  }
  
  // Search for the contract
  try {
    const contracts = await topstepxRequest<Contract[]>('POST', '/Contract/search', {
      searchText: symbol,
      live: false
    });
    
    if (contracts && contracts.length > 0) {
      const contract = contracts[0];
      contractsCache[symbol] = contract;
      symbolToContractIdMap[symbol] = contract.id;
      return contract;
    }
  } catch (error) {
    logger.error(`Failed to find contract ${symbol}`, error);
  }
  
  return null;
}

export async function getPositions(accountId?: number): Promise<Position[]> {
  try {
    // Note: Position endpoints may not be available in TopstepX API
    // This is a placeholder - actual implementation would need the correct endpoint
    logger.warn('Position endpoints not implemented - TopstepX API may not support this');
    return [];
  } catch (error) {
    logger.error('Failed to get positions', error);
    return [];
  }
}

export async function getOrders(accountId?: number, onlyOpen: boolean = true): Promise<Order[]> {
  try {
    // Note: Order endpoints may not be available in TopstepX API
    // This is a placeholder - actual implementation would need the correct endpoint
    logger.warn('Order endpoints not implemented - TopstepX API may not support this');
    return [];
  } catch (error) {
    logger.error('Failed to get orders', error);
    return [];
  }
}

export function getDefaultAccountId(): number | null {
  const accounts = Object.values(accountsCache);
  if (accounts.length > 0) {
    return accounts[0].id;
  }
  return null;
}