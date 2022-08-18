import {
  Module,
  Inject,
  Global,
  DynamicModule,
  Provider,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ZBClient } from 'zeebe-node';

import {
  ZEEBE_CONNECTION_NAME,
  DEFAULT_ZEEBE_CONNECTION_NAME,
  ZEEBE_MODULE_OPTIONS,
} from './zeebe.constants';

import {
  ZeebeModuleAsyncOptions,
  ZeebeOptionsFactory,
  ZeebeModuleOptions,
} from './interfaces/zeebe-options.interface';
import { getClientToken } from './zeebe.util';

//import { getClientToken, getDbToken } from './mongo.util';

@Global()
@Module({})
export class ZeebeCoreModule implements OnApplicationShutdown {
  constructor(
    @Inject(ZEEBE_CONNECTION_NAME) private readonly connectionName: string,
    private readonly moduleRef: ModuleRef,
  ) {}

  static forRoot(
    gatewayAddress: string,
    clientOptions?: any,
    connectionName?: string,
  ): DynamicModule {
    const connectionNameProvider = {
      provide: ZEEBE_CONNECTION_NAME,
      useValue: connectionName ?? DEFAULT_ZEEBE_CONNECTION_NAME,
    };

    const clientProvider = {
      provide: getClientToken(connectionName),
      useFactory: async () => {
        const client = new ZBClient(gatewayAddress, clientOptions);
        return client;
      },
    };

    return {
      module: ZeebeCoreModule,
      providers: [connectionNameProvider, clientProvider],
      exports: [clientProvider],
    };
  }

  static forRootAsync(options: ZeebeModuleAsyncOptions): DynamicModule {
    const mongoConnectionName =
      options.connectionName ?? DEFAULT_ZEEBE_CONNECTION_NAME;

    const connectionNameProvider = {
      provide: ZEEBE_CONNECTION_NAME,
      useValue: mongoConnectionName,
    };

    const clientProvider = {
      provide: getClientToken(mongoConnectionName),
      useFactory: async (mongoModuleOptions: ZeebeModuleOptions) => {
        const { gatewayAddress, clientOptions } = mongoModuleOptions;
        const client = new ZBClient(gatewayAddress, clientOptions);
        return client;
      },
      inject: [ZEEBE_MODULE_OPTIONS],
    };

    const asyncProviders = this.createAsyncProviders(options);

    return {
      module: ZeebeCoreModule,
      imports: options.imports,
      providers: [...asyncProviders, clientProvider, connectionNameProvider],
      exports: [clientProvider],
    };
  }

  async onApplicationShutdown() {
    const client: ZBClient = this.moduleRef.get<any>(
      getClientToken(this.connectionName),
    );

    if (client) await client.close();
  }

  private static createAsyncProviders(
    options: ZeebeModuleAsyncOptions,
  ): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    } else if (options.useClass) {
      return [
        this.createAsyncOptionsProvider(options),
        {
          provide: options.useClass,
          useClass: options.useClass,
        },
      ];
    } else {
      return [];
    }
  }

  private static createAsyncOptionsProvider(
    options: ZeebeModuleAsyncOptions,
  ): Provider {
    if (options.useFactory) {
      return {
        provide: ZEEBE_MODULE_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject ?? [],
      };
    } else if (options.useExisting) {
      return {
        provide: ZEEBE_MODULE_OPTIONS,
        useFactory: async (optionsFactory: ZeebeOptionsFactory) =>
          await optionsFactory.createZeebeOptions(),
        inject: [options.useExisting],
      };
    } else if (options.useClass) {
      return {
        provide: ZEEBE_MODULE_OPTIONS,
        useFactory: async (optionsFactory: ZeebeOptionsFactory) =>
          await optionsFactory.createZeebeOptions(),
        inject: [options.useClass],
      };
    } else {
      throw new Error('Invalid ZeebeModule options');
    }
  }
}
