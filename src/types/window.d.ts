export {};

declare global {
  interface Window {
    ethereum?: {
      on: (event: string, handler: (...args: any[]) => void) => void;
      removeListener: (event: string, handler: (...args: any[]) => void) => void;
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      selectedAddress?: string;
      chainId?: string;
    };
  }
}