import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { App } from './app';

// Verifies the app-shell layout prerequisite for sticky in-page toolbars: the content
// region (.app-content) must be the scroll container, NOT the window — otherwise the
// topbar/sidebar scroll away and `position: sticky` inside a page has nothing to pin to.
describe('App shell content scrolling', () => {
  let root: HTMLElement | null = null;

  beforeEach(async () => {
    // The shell only renders when authenticated, so seed a signed-in profile.
    sessionStorage.setItem(
      'cms-auth',
      JSON.stringify({ userId: 'helen', userName: 'Helen Wu', accessToken: 'a.b.c' })
    );

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();
  });

  afterEach(() => {
    root?.remove();
    root = null;
    sessionStorage.clear();
  });

  it('.app-content scrolls internally while topbar/sidebar stay fixed and a sticky toolbar pins', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    root = fixture.nativeElement as HTMLElement;
    document.body.insertBefore(root, document.body.firstChild);
    window.scrollTo(0, 0);

    const content = root.querySelector('.app-content') as HTMLElement;
    const topbar = root.querySelector('.topbar') as HTMLElement;
    const sidebar = root.querySelector('.sidebar') as HTMLElement;

    // Inject a sticky toolbar + a tall body, mirroring the Course form's layout.
    content.innerHTML =
      '<div class="probe-toolbar" style="position:sticky;top:0;z-index:10;height:44px;background:#fff">TOOLBAR</div>' +
      '<div style="height:4000px"></div>';
    const toolbar = content.querySelector('.probe-toolbar') as HTMLElement;

    // The content region overflows its own box → it is the scroll container.
    expect(content.scrollHeight).toBeGreaterThan(content.clientHeight);

    const topbarTop = topbar.getBoundingClientRect().top;
    const sidebarTop = sidebar.getBoundingClientRect().top;
    const contentTop = content.getBoundingClientRect().top;

    content.scrollTop = 800;

    // It actually scrolled internally...
    expect(content.scrollTop).toBeGreaterThan(0);
    // ...the app header and sidebar did NOT move (proves it is not a whole-window scroll)...
    expect(topbar.getBoundingClientRect().top).withContext('topbar stays fixed').toBeCloseTo(topbarTop, 0);
    expect(sidebar.getBoundingClientRect().top).withContext('sidebar stays fixed').toBeCloseTo(sidebarTop, 0);
    // ...and the sticky toolbar stayed pinned near the content top instead of scrolling away
    // (a non-pinned element would sit ~800px above, at contentTop - 800).
    const toolbarTop = toolbar.getBoundingClientRect().top;
    expect(toolbarTop).withContext('toolbar pinned, not scrolled off').toBeGreaterThanOrEqual(contentTop - 1);
    expect(toolbarTop).toBeLessThan(contentTop + 60);
  });
});
