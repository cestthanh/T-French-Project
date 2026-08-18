import { Component, Input } from '@angular/core';

/** Eyebrow + title + optional lead paragraph, with consistent rhythm. */
@Component({
  selector: 'tf-section-heading',
  templateUrl: './sectionHeading.html',
})
export class BaseSectionHeading {
  @Input() eyebrow?: string;
  @Input() title = '';
  @Input() lead?: string;
  @Input() center = false;
  /** Drops the bottom margin when the heading sits in a flex row. */
  @Input() flush = false;
  /** Override the accent colour when the section sits on a coloured block. */
  @Input() eyebrowClass = 'text-primary';
  @Input() leadClass = 'text-ink-muted';
}
