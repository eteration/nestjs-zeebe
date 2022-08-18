# Zeebe (Camunda Cloud) Integration with NestJS

## Installation

```bash
$  npm i @eteration/nestjs-zeebe
```

## Usage

import ZeebeModule
```js
@Module({
  imports: [
    ZeebeModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connectionName: 'LocalZeebeCluster',
        gatewayAddress: 'localhost:26500',
        clientOptions: {
          retry: true,
          maxRetries: -1,
          maxRetryTimeout: Duration.seconds.of(45),
          onReady: () => console.log(`Client connected!`),
          onConnectionError: () => {
            console.log(`Client grpc connection failed!`);
          },
          eagerConnection: true,
          connectionTolerance: 5000, // milliseconds
        },
      }),
      inject: [ConfigService],
    }),
  ],
  ...
```
Use in any class
```javascript

@Injectable()
export class ZeebeOrderService {

  constructor(
    @ZeebeClient() private readonly zbc: ZBClient,
    private readonly kafka: KafkaService,
  ) {}

  @ZeebeDeploy(__dirname, [
    'bpmn/simple-order.cloud.bpmn',
    'bpmn/workshop-order.bpmn',
  ])
  async onModuleInit(): Promise<any> {
    this.kafka.subscribe('order.payments', this);
  }

  @ZeebeWorker('com.eteration.workshop:orderWorker', {
    connectionTolerance: 15000,
  })
  async postsZbWorkerjob(job, _, worker): Promise<any> {
    this.logJob(worker.taskType, job);
    // worker.log(`Worker Variables ${job.variables}`);
    job.complete({
      order: { id: 35, price: 1500, products: [] },
      orderCorrelationID: 'ORDER-35',
      step: job.elementId,
      bar: job.elementInstanceKey,
    });
  }

  @ZeebeWorker('com.eteration.oms:validate', {
    connectionTolerance: 15000,
  })
  async validateOrder(job, _, worker): Promise<any> {
    job.complete({
      order: { id: 35, price: 1500, products: [], valid: true },
      orderCorrelationID: 'ORDER-35',
      step: 'validate',
    });
  }
}
```

## Publish

```console
Bump version inside package.json & push.
GitLab will publish it for you.

```

## Npm Link (develop npm modules locally without publishing)

```console
# go to related npm module's directory
$ npm run build
$ npm link
# output --> /usr/local/lib/node_modules/@eteration/nestjs-zeebe -> <npm_module_directory>
# copy the prompted npm module directory
# Return to your main project's directory

$ npm link <npm_module_directory>

```
> running npm i after link will unlink the module
> run npm unlink to unlink.

