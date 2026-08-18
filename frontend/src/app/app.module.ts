import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AuthInterceptor } from './services/helpers';
import { BaseControlModule } from './components/baseControl/baseControl.module';
import { NotFound } from './view/notFound/notFound';

@NgModule({
  declarations: [AppComponent, NotFound],
  imports: [
    BrowserModule,
    HttpClientModule,
    BaseControlModule,
    AppRoutingModule, // keep last so its routes win
  ],
  providers: [{ provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }],
  bootstrap: [AppComponent],
})
export class AppModule {}
