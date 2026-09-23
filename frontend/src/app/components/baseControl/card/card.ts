import { Directive, HostBinding, Input } from '@angular/core';

export type CardTone =
  | 'white' | 'muted' | 'primary' | 'primary-soft' | 'secondary' | 'secondary-soft'
  | 'accent' | 'accent-soft' | 'success' | 'success-soft' | 'danger-soft' | 'dark';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

/**
 * "Colour Block" card: a solid tint, no border, no shadow.
 *
 * Grouping is communicated by the fill itself, which is why there is no
 * `border` option — a card that needs an outline is a different component.
 */
@Directive({
    selector: '[tfCard]',
    standalone: false
})
export class BaseCard {
  @Input() tone: CardTone = 'white';
  @Input() padding: CardPadding = 'md';
  /** Adds the hover scale + colour intensification, and a `group` for child hovers. */
  @Input() interactive = false;

  private static readonly TONES: Record<CardTone, string> = {
    white: 'bg-white text-ink',
    muted: 'bg-muted text-ink',
    primary: 'bg-primary text-white',
    'primary-soft': 'bg-primary-soft text-ink',
    secondary: 'bg-secondary text-ink',
    'secondary-soft': 'bg-secondary-soft text-ink',
    accent: 'bg-accent text-ink',
    'accent-soft': 'bg-accent-soft text-ink',
    success: 'bg-success text-white',
    'success-soft': 'bg-success-soft text-ink',
    'danger-soft': 'bg-danger-soft text-ink',
    dark: 'bg-ink text-white',
  };

  /** Hover intensifies the fill one step, matching the tone it started from. */
  private static readonly HOVER_TONES: Record<CardTone, string> = {
    white: 'hover:bg-muted',
    muted: 'hover:bg-line',
    primary: 'hover:bg-primary-hover',
    'primary-soft': 'hover:bg-primary-soft-hover',
    secondary: 'hover:bg-secondary-hover',
    'secondary-soft': 'hover:bg-secondary-soft-hover',
    accent: 'hover:bg-accent-hover',
    'accent-soft': 'hover:bg-accent-soft-hover',
    success: 'hover:bg-success-hover',
    'success-soft': 'hover:bg-success-soft-hover',
    'danger-soft': 'hover:bg-danger-soft-hover',
    dark: 'hover:bg-ink-soft',
  };

  private static readonly PADDINGS: Record<CardPadding, string> = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  @HostBinding('class')
  get classes(): string {
    return [
      'rounded-lg',
      BaseCard.TONES[this.tone],
      BaseCard.PADDINGS[this.padding],
      this.interactive
        ? `group cursor-pointer transition-all duration-200 hover:scale-[1.02] ${BaseCard.HOVER_TONES[this.tone]}`
        : '',
    ].join(' ');
  }
}
