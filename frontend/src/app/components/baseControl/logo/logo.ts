import { Component, Input } from '@angular/core';

/**
 * The T-French brand mark.
 *
 * `mark` is the Arc de Triomphe glyph on its own — use it wherever the space is
 * short and wide (navbar, sidebar, thumbnails). `full` adds the wordmark and
 * needs real vertical room (footer, auth poster panels).
 *
 * `white` is the knockout artwork; it is invisible on light backgrounds and is
 * meant for navy/dark blocks only.
 */
@Component({
    selector: 'tf-logo',
    templateUrl: './logo.html',
    standalone: false
})
export class BaseLogo {
  @Input() variant: 'mark' | 'full' = 'mark';
  @Input() tone: 'colour' | 'white' = 'colour';
  /** Tailwind height class; width follows the artwork's aspect ratio. */
  @Input() sizeClass = 'h-10';
  /** Set when an adjacent text node already names the brand. */
  @Input() decorative = false;

  get src(): string {
    return `assets/logo-${this.variant}${this.tone === 'white' ? '-white' : ''}.png`;
  }
}
