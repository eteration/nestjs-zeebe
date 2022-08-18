import { ModuleMetadata, Type } from '@nestjs/common/interfaces';

export interface ZeebeModuleClientOptions {
  retry: boolean;
  maxRetries: number;
  maxRetryTimeout: any;
}
export interface ZeebeModuleOptions {
  connectionName?: string;
  gatewayAddress: string;
  clientOptions: ZeebeModuleClientOptions;
}

export interface ZeebeOptionsFactory {
  createZeebeOptions(): Promise<ZeebeModuleOptions> | ZeebeModuleOptions;
}

/**
 * Options available when creating the module asynchrously.  You should use only one of the
 * useExisting, useClass, or useFactory options for creation.
 */
export interface ZeebeModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  /** A unique name for the connection.  If not specified, a default one will be used. */
  connectionName?: string;

  /** Reuse an injectable factory class created in another module. */
  useExisting?: Type<ZeebeOptionsFactory>;

  /**
   * Use an injectable factory class to populate the module options, such as URI and database name.
   */
  useClass?: Type<ZeebeOptionsFactory>;

  /**
   * A factory function that will populate the module options, such as URI and database name.
   */
  useFactory?: (
    ...args: any[]
  ) => Promise<ZeebeModuleOptions> | ZeebeModuleOptions;

  /**
   * Inject any dependencies required by the Zeebe module, such as a configuration service
   * that supplies the URI and database name
   */
  inject?: any[];
}
