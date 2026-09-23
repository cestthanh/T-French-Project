import { Directive, HostBinding, Input } from '@angular/core';

export type ButtonVariant =
  | 'primary' | 'secondary' | 'outline' | 'outline-white'
  | 'accent' | 'danger' | 'dark' | 'ghost';

export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl' | 'icon';

/**
 * Flat-design button.
 *
 * Feedback comes from colour shifts and scale — never depth. Written as a
 * directive rather than a wrapper component so `routerLink`, `type="submit"`,
 * `disabled` and native focus behaviour all keep working untouched.
 *
 * Class strings are written out in full (never interpolated) so Tailwind's
 * scanner can find them.
 */
@Directive({
    selector: 'button[tfButton], a[tfButton]',
    standalone: false
})
export class BaseButton {
  @Input() variant: ButtonVariant = 'primary';
  @Input() size: ButtonSize = 'md';
  /** Stretch to the full width of the parent. */
  @Input() block = false;

  private static readonly BASE =
    'inline-flex select-none items-center justify-center gap-2 rounded-md ' +
    'font-semibold tracking-heading no-underline transition-all duration-200 ' +
    'disabled:pointer-events-none disabled:opacity-40';

  private static readonly VARIANTS: Record<ButtonVariant, string> = {
    // `primary-hover` is a *lighter* navy: the brand navy is near-black, so
    // darkening on hover would read as no feedback at all.
    primary: 'bg-primary text-white hover:bg-primary-hover hover:scale-105',
    secondary: 'bg-muted text-ink hover:bg-line hover:scale-105',
    // border-4, not border-2 — the spec asks outlines to read as bold.
    outline: 'border-4 border-primary bg-transparent text-primary hover:bg-primary hover:text-white',
    'outline-white': 'border-4 border-white bg-transparent text-white hover:bg-white hover:text-ink',
    accent: 'bg-accent text-ink hover:bg-accent-hover hover:scale-105',
    danger: 'bg-danger text-white hover:bg-danger-hover hover:scale-105',
    dark: 'bg-ink text-white hover:bg-ink-soft hover:scale-105',
    ghost: 'bg-transparent text-ink-soft hover:bg-muted hover:text-ink',
  };

  private static readonly SIZES: Record<ButtonSize, string> = {
    sm: 'h-10 px-4 text-sm',
    md: 'h-12 px-6 text-sm',
    lg: 'h-14 px-8 text-base',
    xl: 'h-16 px-10 text-lg',
    icon: 'h-11 w-11 p-0',
  };

  @HostBinding('class')
  get classes(): string {
    return [
      BaseButton.BASE,
      BaseButton.VARIANTS[this.variant],
      BaseButton.SIZES[this.size],
      this.block ? 'w-full' : '',
    ].join(' ');
  }
}
