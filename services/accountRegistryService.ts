
import { Credential, AccountState, Venue } from '../types';
import auditLogService from './auditLogService';
import configService from './configService';

const SEED_CREDENTIALS: Credential[] = [
  {
    accountId: 'PROP_DESK_MAIN',
    venue: 'BINANCE_USDT_M',
    apiKey: '***LIVE_KEY***',
    secretKey: '***LIVE_SECRET***',
    permissions: ['READ', 'TRADE'],
    env: 'MAINNET'
  },
  {
    accountId: 'ARB_STRAT_01',
    venue: 'BINANCE_SPOT',
    apiKey: '***SPOT_KEY***',
    secretKey: '***SPOT_SECRET***',
    permissions: ['READ', 'TRADE'],
    env: 'MAINNET'
  }
];

class AccountRegistryService {
  private credentials: Credential[] = [];
  private liveStates: Record<string, AccountState> = {};

  constructor() {
    if (configService.isDemoMode) {
      this.credentials = JSON.parse(JSON.stringify(SEED_CREDENTIALS));
    } else {
      this.credentials = [];
    }

    // Initialize states for loaded creds
    this.credentials.forEach(cred => {
      this.initAccountState(cred);
    });
  }

  private initAccountState(cred: Credential) {
    // In Demo mode, we seed with fake balances. In Prod, this would start 0 and wait for ws sync.
    const initialBalance = configService.isDemoMode ? 1000000 : 0;
    
    this.liveStates[cred.accountId] = {
      accountId: cred.accountId,
      venue: cred.venue,
      totalWalletBalance: initialBalance,
      totalUnrealizedPnl: 0,
      totalMarginBalance: initialBalance,
      totalMaintenanceMargin: 0,
      availableBalance: initialBalance,
      positions: [],
      lastUpdate: Date.now()
    };
  }

  public getCredentials(): Credential[] {
    return this.credentials;
  }

  public getAccountState(accountId: string): AccountState | undefined {
    return this.liveStates[accountId];
  }

  public getAllStates(): AccountState[] {
    return Object.values(this.liveStates);
  }

  public updateAccountState(accountId: string, updates: Partial<AccountState>) {
    if (this.liveStates[accountId]) {
      this.liveStates[accountId] = { ...this.liveStates[accountId], ...updates, lastUpdate: Date.now() };
      auditLogService.log('ACCOUNT_REGISTRY', 'SYSTEM', `Account ${accountId} state updated.`);
    }
  }

  public addCredential(cred: Credential) {
    // Prevent duplicate IDs
    if (this.credentials.some(c => c.accountId === cred.accountId)) {
        throw new Error("Account ID already exists");
    }
    this.credentials.push(cred);
    this.initAccountState(cred);
    auditLogService.log('ACCOUNT_REGISTRY', 'SYSTEM', `New credential added for ${cred.accountId} on ${cred.venue}`);
  }
}

export default new AccountRegistryService();
