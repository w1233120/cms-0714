import { AfterViewInit, Directive, ElementRef, inject } from '@angular/core';

// Focuses the host (or its first inner input) once rendered — used by the inline
// cell editors so a double-clicked cell is immediately typeable and blur-to-save works.
@Directive({
  selector: '[appAutofocus]'
})
export class Autofocus implements AfterViewInit {
  private readonly el = inject(ElementRef<HTMLElement>);

  ngAfterViewInit(): void {
    const host = this.el.nativeElement;
    const target = (
      host.matches('input, textarea, select') ? host : host.querySelector('input, textarea, select')
    ) as HTMLElement | null;
    // Defer so PrimeNG has finished rendering its inner input.
    setTimeout(() => target?.focus());
  }
}
