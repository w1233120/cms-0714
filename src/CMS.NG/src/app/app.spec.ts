import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the AppRole nav item', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.topbar__brand')?.textContent).toContain('CMS');
    expect(compiled.textContent).toContain('角色 AppRole');
  });

  it('collapses and expands a nav group when its header is clicked', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    fixture.detectChanges();

    expect(app['isExpanded']('系統管理 Admin')).toBeTrue();

    app['toggleGroup']('系統管理 Admin');
    fixture.detectChanges();
    expect(app['isExpanded']('系統管理 Admin')).toBeFalse();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('角色 AppRole');

    app['toggleGroup']('系統管理 Admin');
    fixture.detectChanges();
    expect(app['isExpanded']('系統管理 Admin')).toBeTrue();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('角色 AppRole');
  });

  it('toggles the sidebar collapsed state', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    fixture.detectChanges();

    const shell = () => (fixture.nativeElement as HTMLElement).querySelector('.app-shell');
    expect(shell()?.classList).not.toContain('app-shell--collapsed');

    app['toggleSidebar']();
    fixture.detectChanges();
    expect(shell()?.classList).toContain('app-shell--collapsed');
  });
});
