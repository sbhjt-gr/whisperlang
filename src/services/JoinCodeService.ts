// Global map to store active codes
const activeCodes = new Map<string, any>();

console.log('JoinCodeService: Module loaded, initializing global activeCodes map');

export const joinCodeService = {
  generateJoinCode(): string {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  registerCode(code: string, callData: any): void {
    const registrationData = {
      ...callData,
      createdAt: Date.now(),
      active: true
    };
    activeCodes.set(code, registrationData);
    console.log('JoinCodeService: Registered code', code, 'with data', registrationData);
    console.log('JoinCodeService: Active codes map size', activeCodes.size);
    console.log('JoinCodeService: All codes:', Array.from(activeCodes.keys()));
  },

  isValidCode(code: string): boolean {
    console.log('JoinCodeService: Checking validity of code', code);
    console.log('JoinCodeService: Current active codes', Array.from(activeCodes.keys()));
    
    const callData = activeCodes.get(code);
    if (!callData) {
      console.log('JoinCodeService: No data found for code', code);
      return false;
    }

    const isExpired = Date.now() - callData.createdAt > 3600000; // 1 hour
    if (isExpired) {
      console.log('JoinCodeService: Code expired', code);
      activeCodes.delete(code);
      return false;
    }

    console.log('JoinCodeService: Code is valid', code, 'active:', callData.active);
    return callData.active;
  },

  getCallData(code: string): any | null {
    if (!this.isValidCode(code)) return null;
    return activeCodes.get(code);
  },

  deactivateCode(code: string): void {
    const callData = activeCodes.get(code);
    if (callData) {
      callData.active = false;
      activeCodes.set(code, callData);
      console.log('JoinCodeService: Deactivated code', code);
    }
  },

  removeCode(code: string): void {
    activeCodes.delete(code);
    console.log('JoinCodeService: Removed code', code);
    console.log('JoinCodeService: Remaining codes:', Array.from(activeCodes.keys()));
  },

  getAllActiveCodes(): string[] {
    const allCodes = Array.from(activeCodes.keys());
    return allCodes.filter(code => this.isValidCode(code));
  },

  // Debug method
  debugActiveCodes(): void {
    console.log('JoinCodeService: DEBUG - All codes in map:', Array.from(activeCodes.entries()));
  }
};