import { Inject, SetMetadata } from '@nestjs/common';
import { ZEEBEDEPLOY, ZEEBEWORKER } from './zeebe.constants';
import { getClientToken } from './zeebe.util';

//import { ZeebeExceptionFilter } from './zeebe.exception.filter';

/**
 * Inject the ZeebeClient object associated with a connection
 * @param connectionName The unique name associated with the connection
 */
export const ZeebeClient = (connectionName?: string) => {
  const zbc = getClientToken(connectionName);
  return Inject(zbc);
};

export const ZeebeWorker = (type: string, options?): MethodDecorator => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata<string, any>(ZEEBEWORKER, {
      type,
      options,
      target: target.constructor.name,
      methodName: propertyKey,
      callback: descriptor.value,
    })(target, propertyKey, descriptor);
  };
};

export const ZeebeDeploy = (path, processes: string[]): MethodDecorator => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata<string, any>(ZEEBEDEPLOY, {
      path,
      processes,
      target: target.constructor.name,
      methodName: propertyKey,
      callback: descriptor.value,
    })(target, propertyKey, descriptor);
  };
};
