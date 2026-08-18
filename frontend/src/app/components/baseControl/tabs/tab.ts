import { Component, Input } from '@angular/core';

/** A single tab pane. Registered with its parent `BaseTabs` via content query. */
@Component({
  selector: 'tf-tab',
  templateUrl: './tab.html',
})
export class BaseTab {
  @Input() label = '';
  @Input() icon?: string;
  active = false;
}
