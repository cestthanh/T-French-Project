import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AuthInterceptor } from './services/helpers';
import { BaseControlModule } from './components/baseControl/baseControl.module';
import { NotFound } from './view/notFound/notFound';

@NgModule({
  declarations: [AppComponent, NotFound],
  imports: [
    BrowserModule,
    BaseControlModule,
    AppRoutingModule, // keep last so its routes win
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    provideHttpClient(withInterceptorsFromDi()),
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
