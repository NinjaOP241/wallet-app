/**
 * Saga step is a contract that every saga step must follow
 * so the saga orchestrator can execute the steps in a consistent manner.
 */

/**
 * Defines the contract implemented by every saga step.
 *
 * Steps are executed sequentially by the saga orchestrator. The saga context
 * is passed to each step and may be updated before it is passed to the next
 * step. If a step fails, the orchestrator compensates completed steps in
 * reverse order.
 */
export interface SagaStep<TContext> {
  // Get the name of the step. This is used for logging and debugging purposes.
  readonly name: string;

  execute(context: TContext): Promise<void>;
  compensate(context: TContext): Promise<void>;
}
