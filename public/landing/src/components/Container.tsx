import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import clsx from 'clsx';

type ContainerProps<T extends ElementType = 'div'> = {
  as?: T;
  className?: string;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'children' | 'className'>;

export function Container<T extends ElementType = 'div'>({ as, className, children, ...rest }: ContainerProps<T>) {
  const Component = (as ?? 'div') as ElementType;
  return (
    <Component className={clsx('container mx-auto w-full max-w-6xl', className)} {...rest}>
      {children}
    </Component>
  );
}

