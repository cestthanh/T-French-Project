import { Directive, HostBinding, Input } from '@angular/core';

export type BadgeTone =
  | 'primary' | 'secondary' | 'accent' | 'success' | 'danger' | 'muted' | 'dark'
  | 'primary-soft' | 'secondary-soft' | 'accent-soft' | 'success-soft' | 'danger-soft';

/**
 * Tag / status pill. The one place a fully-rounded shape is allowed by the spec.
 */
@Directive({
    selector: '[tfBadge]',
    standalone: false
})
export class BaseBadge {
  @Input() tone: BadgeTone = 'muted';
  /** Squared corners instead of a pill — for level chips and table cells. */
  @Input() square = false;

  // Every `-soft` pairing uses the matching `-dark` text shade, which is picked
  // to clear WCAG AA at this size (12px bold).
  private static readonly TONES: Record<BadgeTone, string> = {
    primary: 'bg-primary text-white',
    secondary: 'bg-secondary text-ink',
    accent: 'bg-accent text-ink',
    success: 'bg-success text-white',
    danger: 'bg-danger text-white',
    muted: 'bg-muted text-ink-soft',
    dark: 'bg-ink text-white',
    'primary-soft': 'bg-primary-soft text-primary',
    'secondary-soft': 'bg-secondary-soft text-secondary-dark',
    'accent-soft': 'bg-accent-soft text-accent-dark',
    'success-soft': 'bg-success-soft text-success-dark',
    'danger-soft': 'bg-danger-soft text-danger-dark',
  };

  @HostBinding('class')
  get classes(): string {
    return [
      'inline-flex items-center gap-1.5 px-3 py-1',
      'text-xs font-semibold uppercase tracking-wider',
      this.square ? 'rounded-md' : 'rounded-full',
      BaseBadge.TONES[this.tone],
    ].join(' ');
  }
}
