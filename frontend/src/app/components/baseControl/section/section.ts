import { Directive, HostBinding, Input } from '@angular/core';

export type SectionTone = 'white' | 'muted' | 'primary' | 'secondary' | 'accent' | 'danger' | 'dark';

/**
 * Full-bleed page section.
 *
 * Sections are separated by sharp colour changes, never by rules or shadows —
 * so the background tone *is* the divider. Alternate tones down the page.
 */
@Directive({
  selector: 'section[tfSection]',
})
export class BaseSection {
  @Input() tone: SectionTone = 'white';
  @Input() compact = false;

  private static readonly TONES: Record<SectionTone, string> = {
    white: 'bg-white text-ink',
    muted: 'bg-muted text-ink',
    primary: 'bg-primary text-white',
    secondary: 'bg-secondary text-ink',
    accent: 'bg-accent text-ink',
    danger: 'bg-danger text-white',
    dark: 'bg-ink text-white',
  };

  @HostBinding('class')
  get classes(): string {
    return ['relative overflow-hidden', this.compact ? 'py-14' : 'py-20 sm:py-28', BaseSection.TONES[this.tone]].join(' ');
  }
}
