import { AfterContentInit, ChangeDetectorRef, Component, ContentChildren, Input, QueryList } from '@angular/core';
import { BaseTab } from './tab';

/**
 * Tab bar.
 *
 * The active tab is marked by a thick bottom bar and a colour shift — the flat
 * equivalent of Material's animated ink bar, with no elevation involved.
 */
@Component({
  selector: 'tf-tabs',
  templateUrl: './tabs.html',
})
export class BaseTabs implements AfterContentInit {
  @ContentChildren(BaseTab) private tabQuery!: QueryList<BaseTab>;
  @Input() activeIndex = 0;

  tabs: BaseTab[] = [];

  constructor(private cdr: ChangeDetectorRef) {}

  ngAfterContentInit(): void {
    this.tabs = this.tabQuery.toArray();
    this.select(this.activeIndex);
    // Content children resolve after the parent was checked; without this the
    // activation would trip ExpressionChangedAfterItHasBeenCheckedError.
    this.cdr.detectChanges();
  }

  select(index: number): void {
    this.activeIndex = index;
    this.tabs.forEach((tab, i) => (tab.active = i === index));
  }
}
