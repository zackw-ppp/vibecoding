import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as ProgressPrimitive from '@radix-ui/react-progress'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Check, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { cn } from '../../lib/cn'

const buttonVariants = cva(
  'inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition-[background-color,color,border-color,transform] duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:translate-y-px motion-reduce:transition-none motion-reduce:active:translate-y-0',
  {
    variants: {
      variant: {
        default:
          'border border-primary bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
        secondary:
          'border border-secondary bg-secondary text-secondary-foreground hover:bg-secondary/75',
        outline:
          'border border-border bg-card text-card-foreground hover:bg-muted',
        ghost: 'border border-transparent text-foreground hover:bg-muted',
        destructive:
          'border border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90',
        soft: 'border border-primary/15 bg-primary/10 text-primary hover:bg-primary/15',
        link: 'min-h-auto border-none px-0 text-primary underline-offset-4 hover:underline',
      },
      size: {
        sm: 'min-h-8 rounded-sm px-3 text-xs',
        md: 'min-h-10',
        lg: 'min-h-12 rounded-lg px-5 text-base',
        icon: 'size-11 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Component = asChild ? Slot : 'button'
    return (
      <Component
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

const badgeVariants = cva(
  'inline-flex min-h-6 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold leading-none',
  {
    variants: {
      variant: {
        neutral: 'border-border bg-muted text-muted-foreground',
        primary: 'border-primary/20 bg-primary/10 text-primary',
        success: 'border-success/25 bg-success/10 text-success',
        warning: 'border-warning/40 bg-warning/15 text-warning-foreground',
        info: 'border-info/25 bg-info/10 text-info',
        destructive:
          'border-destructive/25 bg-destructive/10 text-destructive',
        outline: 'border-border bg-transparent text-foreground',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  },
)

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = ({ className, variant, ...props }: BadgeProps) => (
  <span className={cn(badgeVariants({ variant }), className)} {...props} />
)

export const Card = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-lg border border-border bg-card text-card-foreground shadow-xs',
      className,
    )}
    {...props}
  />
))
Card.displayName = 'Card'

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base text-foreground shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  />
))
Input.displayName = 'Input'

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'min-h-24 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-base leading-relaxed text-foreground shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  />
))
Textarea.displayName = 'Textarea'

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      'min-h-11 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25',
      className,
    )}
    {...props}
  />
))
Select.displayName = 'Select'

export const Label = ({
  className,
  ...props
}: ComponentPropsWithoutRef<'label'>) => (
  <label
    className={cn('text-sm font-semibold text-foreground', className)}
    {...props}
  />
)

export const Checkbox = forwardRef<
  ElementRef<typeof CheckboxPrimitive.Root>,
  ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      'grid size-6 shrink-0 place-items-center rounded-sm border border-input bg-background text-primary-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[state=checked]:border-primary data-[state=checked]:bg-primary',
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator>
      <Check className="size-4" strokeWidth={2.5} />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export const Progress = ({
  value,
  className,
  ...props
}: ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
  value: number
}) => (
  <ProgressPrimitive.Root
    className={cn(
      'relative h-2 w-full overflow-hidden rounded-full bg-muted',
      className,
    )}
    value={value}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full bg-primary transition-transform duration-slow ease-standard motion-reduce:transition-none"
      style={{ transform: `translateX(-${100 - value}%)` }}
    />
  </ProgressPrimitive.Root>
)

export const Tabs = TabsPrimitive.Root

export const TabsList = forwardRef<
  ElementRef<typeof TabsPrimitive.List>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'inline-flex min-h-11 items-center gap-1 rounded-lg border border-border bg-muted p-1',
      className,
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

export const TabsTrigger = forwardRef<
  ElementRef<typeof TabsPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'min-h-9 rounded-md px-3 text-sm font-semibold text-muted-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs',
      className,
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

export const TabsContent = forwardRef<
  ElementRef<typeof TabsPrimitive.Content>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-4 outline-none focus-visible:ring-2 focus-visible:ring-ring',
      className,
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export const Sheet = DialogPrimitive.Root
export const SheetTrigger = DialogPrimitive.Trigger
export const SheetClose = DialogPrimitive.Close

export const SheetContent = forwardRef<
  ElementRef<typeof DialogPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const { t } = useTranslation()
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-surface-media/45 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=open]:animate-in motion-reduce:animate-none" />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          'fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto border-l border-border bg-background p-5 shadow-sheet outline-none data-[state=closed]:animate-out data-[state=open]:animate-in motion-reduce:animate-none sm:p-6',
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close asChild>
          <button
            type="button"
            className="absolute right-3 top-3 grid size-11 place-items-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-5" aria-hidden="true" />
            <span className="sr-only">{t('common.close')}</span>
          </button>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
})
SheetContent.displayName = DialogPrimitive.Content.displayName

export const SheetTitle = forwardRef<
  ElementRef<typeof DialogPrimitive.Title>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('font-display text-2xl font-semibold', className)}
    {...props}
  />
))
SheetTitle.displayName = DialogPrimitive.Title.displayName

export const SheetDescription = forwardRef<
  ElementRef<typeof DialogPrimitive.Description>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('mt-1 text-sm leading-relaxed text-muted-foreground', className)}
    {...props}
  />
))
SheetDescription.displayName = DialogPrimitive.Description.displayName
