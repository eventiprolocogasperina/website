// ─── Bluetooth & Serial Thermal Printer Manager ─────────────────────────────

// Known GATT Service UUIDs used by thermal receipt printers
const KNOWN_PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // 0x18F0 common thermal
  '0000ffe0-0000-1000-8000-00805f9b34fb', // 0xFFE0 common BLE UART (POS-58, HM-10)
  '0000ff00-0000-1000-8000-00805f9b34fb', // 0xFF00
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC transparent UART
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Nordic / custom UART
  '0000ae00-0000-1000-8000-00805f9b34fb', // 0xAE00
  '0000af30-0000-1000-8000-00805f9b34fb', // 0xAF30
  '0000fee7-0000-1000-8000-00805f9b34fb', // Tencent micro-printer
];

export interface PrinterState {
  connected: boolean;
  deviceName: string | null;
  connectionType: 'bluetooth' | 'serial' | null;
  isBluetoothSupported: boolean;
  isSerialSupported: boolean;
}

type StateListener = (state: PrinterState) => void;

class BluetoothPrinterManager {
  private device: any = null;
  private gattServer: any = null;
  private writeCharacteristic: any = null;
  private serialPort: any = null;
  private serialWriter: any = null;

  private state: PrinterState = {
    connected: false,
    deviceName: null,
    connectionType: null,
    isBluetoothSupported: false,
    isSerialSupported: false,
  };

  private listeners: Set<StateListener> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      this.state.isBluetoothSupported = 'bluetooth' in navigator;
      this.state.isSerialSupported = 'serial' in navigator;
    }
  }

  public getState(): PrinterState {
    return { ...this.state };
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const currentState = this.getState();
    this.listeners.forEach(fn => fn(currentState));
  }

  /**
   * Connect to a thermal printer using the Web Bluetooth API.
   */
  public async connectBluetooth(): Promise<string> {
    const nav = typeof window !== 'undefined' ? (navigator as any) : null;
    if (!nav || !nav.bluetooth) {
      throw new Error("Il tuo browser non supporta Web Bluetooth. Usa Google Chrome o Microsoft Edge.");
    }

    // Disconnect any existing session
    await this.disconnect();

    try {
      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: KNOWN_PRINTER_SERVICES,
      });

      if (!device) {
        throw new Error('Nessun dispositivo selezionato.');
      }

      this.device = device;
      device.addEventListener('gattserverdisconnected', this.handleGattDisconnected);

      const server = await device.gatt?.connect();
      if (!server) {
        throw new Error('Impossibile stabilire la connessione GATT con la stampante.');
      }
      this.gattServer = server;

      // Locate the writable characteristic
      let writeChar: any = null;

      // 1. First probe known thermal printer service UUIDs
      for (const serviceUuid of KNOWN_PRINTER_SERVICES) {
        try {
          const service = await server.getPrimaryService(serviceUuid);
          const chars = await service.getCharacteristics();
          for (const char of chars) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              writeChar = char;
              break;
            }
          }
          if (writeChar) break;
        } catch {
          // Continue to next service
        }
      }

      // 2. Fallback: probe all discovered primary services if allowed
      if (!writeChar && server.getPrimaryServices) {
        try {
          const services = await server.getPrimaryServices();
          for (const service of services) {
            const chars = await service.getCharacteristics();
            for (const char of chars) {
              if (char.properties.write || char.properties.writeWithoutResponse) {
                writeChar = char;
                break;
              }
            }
            if (writeChar) break;
          }
        } catch {
          // Ignore
        }
      }

      if (!writeChar) {
        throw new Error("Caratteristica di scrittura ESC/POS non trovata sulla stampante Bluetooth.");
      }

      this.writeCharacteristic = writeChar;
      const deviceName = device.name || 'Stampante Bluetooth';

      this.state = {
        ...this.state,
        connected: true,
        deviceName,
        connectionType: 'bluetooth',
      };
      this.notify();

      return deviceName;
    } catch (err: any) {
      await this.disconnect();
      throw err;
    }
  }

  /**
   * Connect to a thermal printer via Web Serial (Bluetooth SPP virtual COM port or USB).
   */
  public async connectSerial(): Promise<string> {
    if (typeof window === 'undefined' || !(navigator as any).serial) {
      throw new Error("Il tuo browser non supporta Web Serial. Usa Google Chrome o Microsoft Edge.");
    }

    await this.disconnect();

    try {
      const port = await (navigator as any).serial.requestPort();
      if (!port) {
        throw new Error('Nessuna porta seriale selezionata.');
      }

      await port.open({ baudRate: 9600 });
      this.serialPort = port;

      const deviceName = 'Stampante Seriale / Bluetooth SPP';
      this.state = {
        ...this.state,
        connected: true,
        deviceName,
        connectionType: 'serial',
      };
      this.notify();

      return deviceName;
    } catch (err: any) {
      await this.disconnect();
      throw err;
    }
  }

  /**
   * Disconnects active printer session.
   */
  public async disconnect(): Promise<void> {
    if (this.device) {
      this.device.removeEventListener('gattserverdisconnected', this.handleGattDisconnected);
    }

    if (this.gattServer && this.gattServer.connected) {
      try {
        this.gattServer.disconnect();
      } catch { /* ignore */ }
    }

    if (this.serialWriter) {
      try {
        await this.serialWriter.close();
      } catch { /* ignore */ }
      this.serialWriter = null;
    }

    if (this.serialPort) {
      try {
        await this.serialPort.close();
      } catch { /* ignore */ }
      this.serialPort = null;
    }

    this.device = null;
    this.gattServer = null;
    this.writeCharacteristic = null;

    this.state = {
      ...this.state,
      connected: false,
      deviceName: null,
      connectionType: null,
    };
    this.notify();
  }

  /**
   * Sends raw ESC/POS bytes directly to the connected printer.
   * Chunks large payloads to satisfy BLE MTU constraints and prevent buffer overflows.
   */
  public async print(data: Uint8Array): Promise<void> {
    if (!this.state.connected) {
      throw new Error("Nessuna stampante connessa. Connetti prima la stampante Bluetooth.");
    }

    if (this.state.connectionType === 'bluetooth' && this.writeCharacteristic) {
      const CHUNK_SIZE = 100; // Safe byte chunk size for BLE
      for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        const chunk = data.slice(i, i + CHUNK_SIZE);
        if (this.writeCharacteristic.properties.writeWithoutResponse) {
          await this.writeCharacteristic.writeValueWithoutResponse(chunk);
        } else {
          await this.writeCharacteristic.writeValueWithResponse(chunk);
        }
        // Small delay to let printer buffer process
        await new Promise(resolve => setTimeout(resolve, 25));
      }
      return;
    }

    if (this.state.connectionType === 'serial' && this.serialPort) {
      const writer = this.serialPort.writable.getWriter();
      try {
        await writer.write(data);
      } finally {
        writer.releaseLock();
      }
      return;
    }

    throw new Error("Impossibile inviare la stampa: canale non disponibile.");
  }

  private handleGattDisconnected = () => {
    this.state = {
      ...this.state,
      connected: false,
      deviceName: null,
      connectionType: null,
    };
    this.notify();
  };
}

export const bluetoothPrinter = new BluetoothPrinterManager();
