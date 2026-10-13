import { Odometer, type OdometerProps } from './Odometer';

type Props = OdometerProps;

/**
 * @deprecated Use `Odometer`. Kept so existing call sites compile: the digits of `format(value)`
 * now roll into place (Odometer) instead of counting through every number in between.
 */
export function AnimatedNumber({ variant = 'body', ...props }: Props) {
  return <Odometer variant={variant} {...props} />;
}
