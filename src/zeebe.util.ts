import { DEFAULT_ZEEBE_CONNECTION_NAME } from './zeebe.constants';

/**
 * Get a token for the ZeebeClient object for the given connection name
 * @param connectionName The unique name for the connection
 */
export function getClientToken(
  connectionName: string = DEFAULT_ZEEBE_CONNECTION_NAME,
) {
  return `${connectionName}Client`;
}
