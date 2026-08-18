import { NgModule } from '@angular/core';
import { BaseControlModule } from 'src/app/components/baseControl/baseControl.module';
import { Navbar } from './navbar/navbar';
import { Footer } from './footer/footer';

/**
 * App-level chrome (navbar, footer) on top of the design system.
 * Re-exports BaseControlModule so a view module needs this import only.
 */
@NgModule({
  declarations: [Navbar, Footer],
  imports: [BaseControlModule],
  exports: [Navbar, Footer, BaseControlModule],
})
export class SharedModule {}
