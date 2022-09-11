import { Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { RedisService } from 'nestjs-redis';
import { ZBClient } from 'zeebe-node';
import { v4 as uuidv4 } from 'uuid';
import { version } from 'os';

export interface IProcessVariables {
  [key: string]: any;
}

export interface CreateProcessInstanceResponse {
  /**
   * The unique key identifying the process definition (e.g. returned from a process
   * in the DeployProcessResponse message)
   */
  // readonly processKey: string;
  /**
   * The BPMN process ID of the process definition
   */
  readonly bpmnProcessId: string;
  /**
   * The version of the process; set to -1 to use the latest version
   */
  readonly version: number;
  /**
   * Stringified JSON document that will instantiate the variables for the root variable scope of the
   * process instance; it must be a JSON object, as variables will be mapped in a
   * key-value fashion. e.g. { "a": 1, "b": 2 } will create two variables, named "a" and
   * "b" respectively, with their associated values. [{ "a": 1, "b": 2 }] would not be a\
   * valid argument, as the root of the JSON document is an array and not an object.
   */
  readonly processInstanceKey: string;
}

export interface CreateProcessInstanceWithResultResponse<Result> {
  processKey: string;
  bpmnProcessId: string;
  version: number;
  processInstanceKey: string;
  variables: Result;
}

const logger = new Logger('ZeebeProcessClient');

export class ZeebeProcessClient {
  private readonly zbClient: ZBClient;
  private redisService: RedisService;
  private subscriber: Redis;
  logger: any;

  constructor(zbc: ZBClient, redisService: RedisService) {
    this.zbClient = zbc;
    this.redisService = redisService;
    this.init();
  }

  async init() {
    this.subscriber = await this.redisService.getClient('consumer');
  }

  async createProcessInstance<Variables = IProcessVariables>(_config: {
    bpmnProcessId: string;
    variables: Variables;
    version?: number;
  }): Promise<CreateProcessInstanceResponse> {
    const { bpmnProcessId, variables, version } = _config;
    if(version)
      return this.zbClient.createProcessInstance({bpmnProcessId, variables, version });
    return this.zbClient.createProcessInstance(bpmnProcessId, variables);

  }

  async createProcessInstanceWithResult<
    Variables = IProcessVariables,
  >(_config: {
    bpmnProcessId: string;
    variables: Variables;
    version?: number;
    timeout: number;
    timeoutValue;
  }): Promise<CreateProcessInstanceWithResultResponse<IProcessVariables>> {
    const uuid = uuidv4();
    const validationChannel = `zeebe:validation:${uuid}`;
    const context = { uuid, process: undefined };
    const consumer = await this.subscriber.duplicate();

    const processPromise = new Promise((resolve, reject) => {
      consumer.subscribe(validationChannel, async (err, count) => {
        if (err) {
          logger.debug('Failed to subscribe: %s', err.message);
          reject(`Failed to subscribe: ${err.message}`);
        } else {
          consumer.on('message', (channel, messageStr) => {
            const message = JSON.parse(messageStr);
            logger.debug(`Received ${message} from ${channel}`);
            if (message?.validationChannel === validationChannel) {
              logger.debug(
                `Result received from process instance:${message?.processInstanceKey} channel:${message?.validationChannel}`,
              );
              context['message'] = message;
              resolve(message);
            }
          });

          logger.debug(
            `Subscribed successfully! This client is currently subscribed to ${count} channels. Channel: ${validationChannel} `,
          );
          const { bpmnProcessId, variables, version } = _config;
          const proc = await this.zbClient.createProcessInstance({
            bpmnProcessId,
            variables: { validationChannel, ...variables },
            version,
          });
          context['process'] = proc;
          logger.debug(JSON.stringify(proc));
        }
      });
    });

    const timeoutResult = {
      process: context?.process,
      timeout: true,
      message: 'No result received from ',
      timeoutValue: _config.timeoutValue,
    };
    const timeout = async function (prom, timeoutTime, timeoutVal) {
      let timer;
      return Promise.race([
        prom,
        new Promise((_res, _rej) => {
          timer = setTimeout(_res.bind(null, timeoutVal), timeoutTime);
        }),
      ]).finally(() => clearTimeout(timer));
    };

    const variables = await timeout(
      processPromise,
      _config.timeout,
      timeoutResult,
    );
    logger.debug('createProcessInstanceWithResult is completed');
    consumer.disconnect();
    return {
      ...context?.process,
      variables,
    };
  }
}
