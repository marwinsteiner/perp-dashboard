
class ConfigService {
  // PROGRAMMATIC SWITCH: Set to false to disable seed data and mocked behaviors.
  // In the future, this will be driven by the user's login session claims.
  private _isDemoMode = true;

  public get isDemoMode() {
    return this._isDemoMode;
  }

  // Helper for development/console debugging to toggle at runtime
  public setDemoMode(val: boolean) {
    this._isDemoMode = val;
    console.warn(`[SYSTEM] Environment switched to: ${val ? 'DEMO' : 'PRODUCTION'}. Please refresh services.`);
  }
}

export default new ConfigService();
