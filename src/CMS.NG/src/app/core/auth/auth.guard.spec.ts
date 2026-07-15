import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    });
  });

  // The guard is a functional CanActivateFn, so run it inside an injection context.
  function run(): boolean | UrlTree {
    return TestBed.runInInjectionContext(() => authGuard(null as never, null as never)) as boolean | UrlTree;
  }

  it('redirects to /login when there is no token', () => {
    const result = run();
    const router = TestBed.inject(Router);
    expect(result).toEqual(router.createUrlTree(['/login']));
  });

  it('allows activation when a token is present', () => {
    sessionStorage.setItem(
      'cms-auth',
      JSON.stringify({ userId: 'helen', userName: 'Helen Wu', accessToken: 'a.b.c' })
    );
    expect(run()).toBeTrue();
  });
});
