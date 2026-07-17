import * as React from 'react';

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'success' | 'warning';
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ variant = 'default', ...props }, ref) => {
    const variantStyles = {
      default: 'border-border bg-card text-white',
      destructive: 'border-red-500/40 bg-red-950/30 text-red-300',
      success: 'border-green-500/40 bg-green-950/30 text-green-300',
      warning: 'border-yellow-500/40 bg-yellow-950/30 text-yellow-300',
    };

    return (
      <div
        ref={ref}
        role="alert"
        className={`rounded-lg border p-4 ${variantStyles[variant]}`}
        {...props}
      />
    );
  }
);
Alert.displayName = 'Alert';

interface AlertDescriptionProps extends React.HTMLAttributes<HTMLDivElement> {}

const AlertDescription = React.forwardRef<
  HTMLDivElement,
  AlertDescriptionProps
>(({ ...props }, ref) => (
  <div ref={ref} className="flex items-start gap-3" {...props} />
));
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertDescription };
