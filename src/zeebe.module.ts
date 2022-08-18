import { Module, DynamicModule, OnModuleInit, Logger, Global } from '@nestjs/common';
import { ZeebeCoreModule } from './zeebe-core.module';
import { ZeebeModuleAsyncOptions } from './interfaces/zeebe-options.interface';
import { ZeebeClient } from './zeebe.decorators';
import { ZBClient } from 'zeebe-node';
import { DiscoveryModule, DiscoveryService } from '@golevelup/nestjs-discovery';
import * as path from 'path';
import { ZEEBEDEPLOY, ZEEBEWORKER } from './zeebe.constants';

/**
 * Module for the ZeebeDB driver
 */
@Global()
@Module({
  imports: [DiscoveryModule],
})
export class ZeebeModule implements OnModuleInit {
  /**
   * Inject the ZeebeDB driver synchronously.
   * @param uri The database URI
   * @param dbName The database name
   * @param options Options for the ZeebeClient that will be created
   * @param connectionName A unique name for the connection.  If not specified, a default name
   * will be used.
   */
  static forRoot(
    gatewayAddress: string,
    clientOptions?: any,
    connectionName?: string,
  ): DynamicModule {
    return {
      module: ZeebeModule,
      imports: [
        ZeebeCoreModule.forRoot(gatewayAddress, clientOptions, connectionName),
        DiscoveryModule,
      ],
    };
  }

  /**
   * Inject the ZeebeDB driver asynchronously, allowing any dependencies such as a configuration
   * service to be injected first.
   * @param options Options for asynchrous injection
   */
  static forRootAsync(options: ZeebeModuleAsyncOptions): DynamicModule {
    return {
      module: ZeebeModule,
      imports: [ZeebeCoreModule.forRootAsync(options), DiscoveryModule],
    };
  }

  /** DECORATORS */
  private readonly logger = new Logger('ZeebeModule');

  constructor(
    @ZeebeClient() private readonly zbc: ZBClient,
    private readonly discoveryService: DiscoveryService,
  ) {}

  async onModuleInit() {
    // find everything marked with @Subscribe
    const deployments: any[] =
      await this.discoveryService.providerMethodsWithMetaAtKey(ZEEBEDEPLOY);
    for (const deployment of deployments) {
      for (const processDef of deployment.meta.processes) {
        const bpmnPath = path.join(deployment.meta.path, processDef);
        const res = await this.zbc.deployProcess(bpmnPath);
        this.logger.log(
          `Deployed{ ${deployment.meta.target}/${
            deployment.meta.methodName
          }, ${JSON.stringify(res)} }`,
        );
      }
    }

    const workers: any[] =
      await this.discoveryService.providerMethodsWithMetaAtKey(ZEEBEWORKER);
    //this.logger.log(workers);
    for (const worker of workers) {
      const taskHandler = worker.meta.callback.bind(
        worker.discoveredMethod.parentClass.instance,
      );
      this.logger.log(
        `Mapped{ ${worker.meta.type}, ${worker.meta.target}/${worker.meta.methodName}}`,
      );
      await this.zbc.createWorker({
        taskType: worker.meta.type,
        taskHandler,
        /* onReady: () =>
          this.logger.debug(
            `worker ${worker.meta.type} ready at ${worker.meta.target}/ ${worker.meta.methodName}`,
          ),
        onConnectionError: () => {
          this.logger.error(`Worker disconnected!`);
        },*/
        ...worker.meta.options,
      });
    }
  }
}
